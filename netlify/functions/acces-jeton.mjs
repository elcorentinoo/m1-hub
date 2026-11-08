/* acces-jeton — laissez-passer de la messagerie (7.1.0)
   POST {pseudo} ; l'appareil est reconnu par son cookie signé m1_acces.
   Renvoie un jeton Supabase valable 30 jours, qui porte l'identifiant de
   la clé d'accès et le pseudo : la base n'accepte de lire et d'écrire dans
   le chat qu'avec ce jeton, et seulement si la clé n'est pas révoquée.
   Une seule requête Netlify par appareil et par mois : les messages, eux,
   passent directement entre le navigateur et Supabase. */
import {rpc, lireAcces, lireCorps, json, jwtSupabase, nettoyerPseudo} from '../acces.mjs';

const TRENTE_JOURS = 30 * 86400;

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET;
  const c = secret && lireAcces(secret, req.headers.get('cookie'));
  const id = c && c.id;
  if(!id) return json({ok:false, erreur:'cle'}, 401);
  const JWT = process.env.SUPABASE_JWT_SECRET;
  if(!JWT) return json({ok:false, erreur:'config'}, 500);
  const pseudo = nettoyerPseudo((await lireCorps(req)).pseudo);
  if(pseudo.length < 2) return json({ok:false, erreur:'pseudo'}, 400);
  try{ await rpc('acces_pseudo', {p_id:id, p_pseudo:pseudo}); }
  catch(e){ console.log('[acces-jeton]', e.message); }       // sans gravité : le jeton reste valable
  const iat = Math.floor(Date.now()/1000), exp = iat + TRENTE_JOURS;
  const jeton = jwtSupabase(JWT, {role:'authenticated', aud:'authenticated', sub:id, cle:id, pseudo, niveau:c.niveau, iat, exp});
  return json({ok:true, jeton, exp});
};

export const config = { path: '/.netlify/functions/acces-jeton' };
