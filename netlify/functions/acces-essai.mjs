/* acces-essai — essai de 24 h sans clé (hub multi-promos)
   POST {jeton?} → cookie signé m1_essai = « debut.sig » (heure de début).
   La page garde aussi le jeton en mémoire locale (localStorage) et le
   renvoie : effacer les seuls cookies ne relance donc pas l'essai, il faut
   effacer toutes les données du site. Au plus 10 nouveaux essais par jour
   et par adresse IP (réseaux partagés : fac, agence). */
import crypto from 'node:crypto';
import {lireCorps, json, empreinteIP, sousLaLimite, memeTexte} from '../acces.mjs';

const DUREE = 86400, UN_AN = 365 * 86400, MAX_PAR_IP = 10;
const signe = (secret, debut) => crypto.createHmac('sha256', secret).update('essai.'+debut).digest('base64url');
function lireJeton(secret, v){
  const [debut, sig] = String(v||'').split('.');
  return /^\d{9,11}$/.test(debut||'') && sig && memeTexte(sig, signe(secret, debut)) ? +debut : null;
}

export default async (req, context) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET, JETON = process.env.ACCES_JETON;
  if(!secret || !JETON) return json({ok:false, erreur:'config'}, 500);
  const maintenant = Math.floor(Date.now()/1000);
  const cookie = (req.headers.get('cookie')||'').match(/(?:^|;\s*)m1_essai=([^;]+)/);
  /* le plus ancien des essais connus de cet appareil (cookie ou mémoire locale) */
  const connus = [cookie && lireJeton(secret, cookie[1]), lireJeton(secret, (await lireCorps(req)).jeton)].filter(x=>x && x <= maintenant);
  let debut = connus.length ? Math.min(...connus) : null;
  if(!debut){
    if(!(await sousLaLimite(JETON, 'essai:'+empreinteIP(secret, req, context), MAX_PAR_IP)))
      return json({ok:false, erreur:'limite'}, 429);
    debut = maintenant;
  }
  const jeton = debut+'.'+signe(secret, debut), fin = debut + DUREE;
  return json({ok: maintenant < fin, erreur: maintenant < fin ? undefined : 'fini', jeton, fin}, 200,
    {'Set-Cookie':'m1_essai='+jeton+'; Max-Age='+UN_AN+'; Path=/; HttpOnly; Secure; SameSite=Lax'});
};

export const config = { path: '/.netlify/functions/acces-essai' };
