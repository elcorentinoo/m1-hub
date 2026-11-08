/* acces-pseudo — rattache le pseudo du site à la clé de cet appareil (7.0.0)
   POST {pseudo} ; l'appareil est reconnu par son cookie signé m1_acces.
   Sert à /admin : savoir quel pseudo utilise chaque clé.
   Réponse {ok, niveau, annee} : le niveau de la clé, pour l'affichage. */
import {rpc, lireAcces, lireCorps, json} from '../acces.mjs';

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET;
  const c = secret && lireAcces(secret, req.headers.get('cookie'));
  if(!c) return json({ok:false}, 401);
  const id = c.id;
  const {pseudo} = await lireCorps(req);
  try{
    await rpc('acces_pseudo', {p_id:id, p_pseudo:String(pseudo||'').slice(0, 40)});
    return json({ok:true, niveau:c.niveau, annee:c.annee});
  }catch(e){
    console.log('[acces-pseudo]', e.message);
    return json({ok:false}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-pseudo' };
