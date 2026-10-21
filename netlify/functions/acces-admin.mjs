/* acces-admin — gestion des clés d'accès, pour Corentin seul (6.5.0)
   POST {mdp, action:'liste'|'generer'|'revoquer'|'retablir'|'chat_supprimer', ...}
   Le mot de passe est comparé à ADMIN_MDP ; le serveur parle ensuite à
   Supabase avec ACCES_JETON (dont seule l'empreinte est dans la base).
   Les clés générées ne sont renvoyées qu'une fois, en clair : la base
   n'en garde que l'empreinte. */
import {rpc, empreinte, nouvelleCle, memeTexte, lireCorps, json} from '../acces.mjs';

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const MDP = process.env.ADMIN_MDP, JETON = process.env.ACCES_JETON;
  if(!MDP || !JETON) return json({ok:false, erreur:'config'}, 500);
  const d = await lireCorps(req);
  if(!memeTexte(d.mdp, MDP)){
    await new Promise(r=>setTimeout(r, 1500));
    return json({ok:false, erreur:'mdp'}, 401);
  }
  try{
    if(d.action === 'liste') return json({ok:true, cles:await rpc('acces_admin', {p_jeton:JETON, p_action:'liste', p_donnees:{}})});
    if(d.action === 'generer'){
      const n = Math.max(1, Math.min(100, parseInt(d.nombre, 10) || 1));
      const nom = String(d.nom||'').trim().slice(0, 60);
      const cles = Array.from({length:n}, ()=>nouvelleCle());
      await rpc('acces_admin', {p_jeton:JETON, p_action:'creer', p_donnees:{cles:cles.map((c,i)=>({
        hash:empreinte(c), suffixe:c.slice(-3), nom: n > 1 && nom ? nom+' '+(i+1) : nom }))}});
      return json({ok:true, cles});
    }
    if(d.action === 'revoquer' || d.action === 'retablir'){
      if(!/^[0-9a-f-]{36}$/.test(String(d.id||''))) return json({ok:false}, 400);
      await rpc('acces_admin', {p_jeton:JETON, p_action:d.action, p_donnees:{id:d.id}});
      return json({ok:true});
    }
    /* Messagerie (7.1.0) : retirer un message */
    if(d.action === 'chat_supprimer'){
      if(!/^\d{1,18}$/.test(String(d.id||''))) return json({ok:false}, 400);
      await rpc('chat_admin', {p_jeton:JETON, p_action:'supprimer', p_donnees:{id:Number(d.id)}});
      return json({ok:true});
    }
    return json({ok:false, erreur:'action'}, 400);
  }catch(e){
    console.log('[acces-admin]', e.message);
    return json({ok:false, erreur: e.status === 404 ? 'sql' : 'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-admin' };
