/* acces-activer — consomme une clé d'accès et autorise l'appareil (6.5.0)
   POST {cle, pseudo} → 200 + cookie m1_acces si la clé existe et n'a jamais
   servi ; le pseudo est rattaché à la clé. */
import {rpc, empreinte, normaliser, cookieAcces, appareil, lireCorps, json} from '../acces.mjs';

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
    return json({ok:true}, 200, {'Set-Cookie':cookieAcces(secret, id)});
  }catch(e){
    console.log('[acces-activer]', e.message);
    return json({ok:false, erreur:'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-activer' };
