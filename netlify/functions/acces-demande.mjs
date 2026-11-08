/* acces-demande — demande d'accès validée depuis /admin (8.1.0)
   Remplace la demande de clé par e-mail de la 8.0.0.

   POST {action:'envoyer', pseudo, niveau, message, site, t, jeton?}
     → crée la demande, pose le cookie signé m1_demande (et renvoie le même
       jeton, gardé aussi en mémoire locale), prévient les appareils admin.
       Anti-abus : « site » est un champ piège, « t » le temps passé sur le
       formulaire (moins de 3 s : robot) ; puis 3 demandes par jour et par IP,
       30 par jour en tout. Après un refus : nouvelle demande le lendemain.
   POST {action:'etat', jeton?}
     → attente | acceptee | refusee | expiree | aucune. Acceptée : l'appareil
       reçoit ici, une seule fois, son cookie m1_acces, exactement comme une
       activation de clé (acces-activer). */
import crypto from 'node:crypto';
import {rpc, lireCorps, json, empreinteIP, sousLaLimite, appareil, nettoyerPseudo, lireAcces, etatCle,
        poserCle, memeTexte} from '../acces.mjs';
import {envoyerUn, cles} from '../push.mjs';

const SEPT_JOURS = 7 * 86400;
const NOMS = {licence:'Licence', m1:'M1', m2:'M2'};
const PROPOSES = ['licence', 'm1'];                 // le M2 n'est pas encore ouvert
const signe = (secret, id) => crypto.createHmac('sha256', secret).update('demande.'+id).digest('base64url');
function lireJeton(secret, v){
  const [id, sig] = String(v||'').split('.');
  return /^[0-9a-f-]{36}$/.test(id||'') && sig && memeTexte(sig, signe(secret, id)) ? id : null;
}
const cookieDemande = (jeton, age) => 'm1_demande='+jeton+'; Max-Age='+age+'; Path=/; HttpOnly; Secure; SameSite=Lax';
const jourParis = d => new Intl.DateTimeFormat('fr-CA', {timeZone:'Europe/Paris'}).format(d);

function reponse(obj, status, cookies=[]){
  const h = new Headers({'Content-Type':'application/json', 'Cache-Control':'no-store'});
  cookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(JSON.stringify(obj), {status, headers:h});
}

/* Notification aux appareils administrateurs ; les abonnements expirés sont retirés. */
async function prevenirAdmins(JETON, demande){
  const {publique, privee} = cles();
  if(!privee) return 0;
  let n = 0;
  const liste = await rpc('acces_demande', {p_jeton:JETON, p_action:'push_liste', p_donnees:{}}).catch(()=>[]);
  await Promise.all((liste || []).map(async a => {
    try{
      const r = await envoyerUn(a, {title:'🔑 Nouvelle demande d\'accès', body:demande.pseudo+' ('+(NOMS[demande.niveau] || demande.niveau)+')',
                                   url:'/admin?onglet=demandes', tag:'demande'}, publique, privee);
      if(r.status === 404 || r.status === 410)
        await rpc('acces_demande', {p_jeton:JETON, p_action:'push_retirer', p_donnees:{endpoint:a.endpoint}}).catch(()=>{});
      else if(r.status < 300) n++;
    }catch(e){ console.log('[acces-demande] push', e.message); }
  }));
  return n;
}

export default async (req, context) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET, JETON = process.env.ACCES_JETON;
  if(!secret || !JETON) return json({ok:false, erreur:'config'}, 500);
  const d = await lireCorps(req);
  const brut = (req.headers.get('cookie')||'').match(/(?:^|;\s*)m1_demande=([^;]+)/);
  const id = lireJeton(secret, brut && brut[1]) || lireJeton(secret, d.jeton);
  const etatDe = async i => i ? rpc('acces_demande', {p_jeton:JETON, p_action:'etat', p_donnees:{id:i}}) : {statut:'aucune'};

  try{
    if(d.action === 'etat'){
      const e = await etatDe(id);
      if(e.statut !== 'acceptee') return json({ok:true, statut:e.statut === 'inconnue' ? 'aucune' : e.statut,
                                               pseudo:e.pseudo, niveau:e.niveau, demain:e.statut === 'refusee'});
      if(e.recuperee) return json({ok:true, statut:'deja'});           // accès déjà remis à un appareil
      const r = await rpc('acces_demande', {p_jeton:JETON, p_action:'recuperer', p_donnees:{id}});
      if(!r || !r.ok) return json({ok:true, statut:'deja'});
      const annee = e.annee || '2026-2027';
      /* 8.2.0 : un appareil qui a déjà une clé garde son niveau et AJOUTE celui-ci */
      const pose = await poserCle(secret, req.headers.get('cookie'), {id:r.cle_id, niveau:e.niveau, annee, admin:false});
      return reponse({ok:true, statut:'acceptee', pseudo:e.pseudo, niveau:e.niveau, annee, ajoute:pose.ajoute, niveaux:pose.niveaux}, 200,
        pose.cookies.concat('m1_essai=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax', cookieDemande('', 0)));
    }

    if(d.action === 'envoyer'){
      if(String(d.site||'').trim() || !(Number(d.t) >= 3000)) return json({ok:true, statut:'attente', piege:true});
      const pseudo = nettoyerPseudo(d.pseudo);
      const niveau = PROPOSES.includes(d.niveau) ? d.niveau : '';
      const message = String(d.message||'').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 200);
      if(pseudo.length < 2 || !niveau) return json({ok:false, erreur:'champs'}, 400);
      /* une demande déjà en cours sur cet appareil : on la garde */
      const avant = await etatDe(id);
      if(avant.statut === 'attente') return json({ok:true, statut:'attente', jeton:id+'.'+signe(secret, id), pseudo:avant.pseudo, niveau:avant.niveau});
      if(avant.statut === 'refusee' && avant.refus_jour === jourParis(new Date())) return json({ok:false, erreur:'refusee'}, 429);
      if(!(await sousLaLimite(JETON, 'demande:'+empreinteIP(secret, req, context), 3)) ||
         !(await sousLaLimite(JETON, 'demande:tout', 30))) return json({ok:false, erreur:'limite'}, 429);
      /* l'appareil a déjà une clé valide (d'un autre niveau) : noté pour l'admin */
      const c = lireAcces(secret, req.headers.get('cookie'));
      const ec = c ? await etatCle(c.id).catch(()=>null) : null;
      const cree = await rpc('acces_demande', {p_jeton:JETON, p_action:'creer', p_donnees:{pseudo, niveau, message,
        appareil:appareil(req.headers.get('user-agent')), cle_actuelle: ec && ec.valide ? c.id : ''}});
      const jeton = cree.id+'.'+signe(secret, cree.id);
      await prevenirAdmins(JETON, {pseudo, niveau});
      return reponse({ok:true, statut:'attente', jeton, pseudo, niveau}, 200, [cookieDemande(jeton, SEPT_JOURS + 86400)]);
    }
    return json({ok:false, erreur:'action'}, 400);
  }catch(e){
    console.log('[acces-demande]', e.message);
    return json({ok:false, erreur: e.status === 404 ? 'sql' : 'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-demande' };
