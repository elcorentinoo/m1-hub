/* acces-activer — consomme une clé d'accès et autorise l'appareil (6.5.0)
   POST {cle, pseudo} → 200 + cookie m1_acces si la clé existe et n'a jamais
   servi ; le pseudo est rattaché à la clé. Depuis le hub multi-promos, le
   cookie porte aussi le niveau et l'année de la clé (réponse : {niveau, annee}).
   8.2.0 : si l'appareil a déjà une clé valide, la nouvelle s'ajoute (m1_acces_plus). */
import {rpc, empreinte, normaliser, etatCle, poserCle, PAR_DEFAUT, appareil, lireCorps} from '../acces.mjs';

const json = (obj, status, cookies=[]) => {
  const h = new Headers({'Content-Type':'application/json', 'Cache-Control':'no-store'});
  cookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(JSON.stringify(obj), {status, headers:h});
};

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false, erreur:'methode'}, 405);
  const secret = process.env.ACCES_SECRET;
  if(!secret) return json({ok:false, erreur:'config'}, 500);
  const {cle, pseudo} = await lireCorps(req);
  if(normaliser(cle).length !== 9) return json({ok:false, erreur:'format'}, 400);
  try{
    const id = await rpc('acces_activer', {p_hash:empreinte(cle), p_appareil:appareil(req.headers.get('user-agent'))});
    if(!id){
      await new Promise(r=>setTimeout(r, 800));         // freine les essais en série
      return json({ok:false, erreur:'invalide'}, 403);
    }
    /* le pseudo choisi à l'entrée est rattaché à la clé (visible dans /admin) */
    const p = String(pseudo||'').trim().slice(0, 40);
    if(p) await rpc('acces_pseudo', {p_id:id, p_pseudo:p}).catch(e=>console.log('[acces-activer] pseudo', e.message));
    const e = await etatCle(id).catch(()=>PAR_DEFAUT);
    const niveau = e.niveau || PAR_DEFAUT.niveau, annee = e.annee || PAR_DEFAUT.annee;
    /* 8.2.0 : sur un appareil qui a déjà une clé valide, la nouvelle s'AJOUTE (autre niveau) */
    const pose = await poserCle(secret, req.headers.get('cookie'), {id, niveau, annee, admin:!!e.admin});
    return json({ok:true, niveau, annee, ajoute:pose.ajoute, niveaux:pose.niveaux}, 200,
      pose.cookies.concat('m1_essai=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'));
  }catch(e){
    console.log('[acces-activer]', e.message);
    return json({ok:false, erreur:'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-activer' };
