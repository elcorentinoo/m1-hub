/* acces-admin — gestion des clés d'accès, pour Corentin seul (6.5.0)
   POST {action:'moi'|'liste'|'generer'|'revoquer'|'retablir'|'admin'|'devenir_admin'
         |'chat_supprimer'|'tableau'|'associer'|'dissocier'|'note'|'bq_reset', mdp?, ...}
   Qui peut entrer (hub multi-promos) :
   - l'appareil dont la clé est marquée « admin » en base (vérifié à chaque appel) ;
   - en secours, le mot de passe ADMIN_MDP, mais SEULEMENT tant qu'aucune clé
     admin n'existe. Ce mode sert à désigner sa clé (« devenir_admin »).
   Le serveur parle ensuite à Supabase avec ACCES_JETON (dont seule
   l'empreinte est dans la base). Les clés générées ne sont renvoyées
   qu'une fois, en clair : la base n'en garde que l'empreinte. */
import {rpc, empreinte, nouvelleCle, memeTexte, lireCorps, json, lireAcces, etatCle, cookieAcces,
        NIVEAUX, anneeOk, PAR_DEFAUT} from '../acces.mjs';

async function qui(req, d, MDP, JETON){
  const secret = process.env.ACCES_SECRET;
  const c = secret ? lireAcces(secret, req.headers.get('cookie')) : null;
  const e = c ? await etatCle(c.id).catch(()=>null) : null;
  const cle = c && e && e.valide ? {id:c.id, niveau:e.niveau, annee:e.annee, admin:!!e.admin} : null;
  if(cle && cle.admin) return {mode:'cle', cle};
  if(MDP && d.mdp && memeTexte(d.mdp, MDP)){
    let existe = false;                       // acces-niveaux.sql pas encore lancé : pas de clé admin
    try{ existe = (await rpc('acces_admin', {p_jeton:JETON, p_action:'admin_existe', p_donnees:{}})) === true; }catch(err){}
    return existe ? {refus:'cle_admin'} : {mode:'mdp', cle};
  }
  return {refus: d.mdp ? 'mdp' : 'connexion'};
}

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const MDP = process.env.ADMIN_MDP, JETON = process.env.ACCES_JETON;
  if(!JETON) return json({ok:false, erreur:'config'}, 500);
  const d = await lireCorps(req);
  const q = await qui(req, d, MDP, JETON);
  if(q.refus){
    if(q.refus !== 'connexion') await new Promise(r=>setTimeout(r, 1500));
    return json({ok:false, erreur:q.refus}, 401);
  }
  const ok = (o={}, extra) => json(Object.assign({ok:true, mode:q.mode}, o), 200, extra);
  try{
    if(d.action === 'moi') return ok({appareil:q.cle});
    if(d.action === 'liste') return ok({cles:await rpc('acces_admin', {p_jeton:JETON, p_action:'liste', p_donnees:{}})});
    if(d.action === 'generer'){
      const n = Math.max(1, Math.min(100, parseInt(d.nombre, 10) || 1));
      const nom = String(d.nom||'').trim().slice(0, 60);
      const niveau = NIVEAUX.includes(d.niveau) ? d.niveau : PAR_DEFAUT.niveau;
      const annee = anneeOk(d.annee) ? d.annee : PAR_DEFAUT.annee;
      const cles = Array.from({length:n}, ()=>nouvelleCle());
      await rpc('acces_admin', {p_jeton:JETON, p_action:'creer', p_donnees:{cles:cles.map((c,i)=>({
        hash:empreinte(c), suffixe:c.slice(-3), nom: n > 1 && nom ? nom+' '+(i+1) : nom, niveau, annee }))}});
      return ok({cles, niveau, annee});
    }
    if(d.action === 'revoquer' || d.action === 'retablir'){
      if(!/^[0-9a-f-]{36}$/.test(String(d.id||''))) return json({ok:false}, 400);
      await rpc('acces_admin', {p_jeton:JETON, p_action:d.action, p_donnees:{id:d.id}});
      return ok();
    }
    /* Clé administratrice : désigner celle de cet appareil (aussi en mode mot de
       passe : c'est la transition), puis marquer ou retirer les autres (clé admin seulement). */
    if(d.action === 'devenir_admin'){
      if(!q.cle) return json({ok:false, erreur:'sans_cle'}, 400);
      await rpc('acces_admin', {p_jeton:JETON, p_action:'admin', p_donnees:{id:q.cle.id, admin:true}});
      /* cookie réécrit tout de suite : la porte laisse voir tous les niveaux sans attendre 24 h */
      return json({ok:true, mode:'cle'}, 200, {'Set-Cookie':cookieAcces(process.env.ACCES_SECRET, q.cle.id, q.cle.niveau, q.cle.annee, true)});
    }
    if(d.action === 'admin'){
      if(q.mode !== 'cle') return json({ok:false, erreur:'cle_admin'}, 403);
      if(!/^[0-9a-f-]{36}$/.test(String(d.id||''))) return json({ok:false}, 400);
      await rpc('acces_admin', {p_jeton:JETON, p_action:'admin', p_donnees:{id:d.id, admin:d.admin === true}});
      return ok();
    }
    /* Messagerie (7.1.0) : retirer un message */
    if(d.action === 'chat_supprimer'){
      if(!/^\d{1,18}$/.test(String(d.id||''))) return json({ok:false}, 400);
      await rpc('chat_admin', {p_jeton:JETON, p_action:'supprimer', p_donnees:{id:Number(d.id)}});
      return ok();
    }
    /* Tableau de bord (7.3.0) : toutes les données, puis regroupements et notes */
    if(d.action === 'tableau'){
      const donnees = await rpc('admin_tableau', {p_jeton:JETON, p_action:'donnees', p_donnees:{}});
      /* niveau et année de chaque clé, pour le filtre par promo (admin.sql inchangé) */
      try{
        const l = await rpc('acces_admin', {p_jeton:JETON, p_action:'liste', p_donnees:{}});
        donnees.cles = l.map(c=>({pseudo:c.pseudo, nom:c.nom, utilisee:c.utilisee, revoquee:c.revoquee, appareil:c.appareil,
          niveau:c.niveau || PAR_DEFAUT.niveau, annee:c.annee || PAR_DEFAUT.annee}));
      }catch(e){ console.log('[acces-admin] promos', e.message); }
      return ok({donnees});
    }
    if(d.action === 'associer' || d.action === 'dissocier' || d.action === 'note' || d.action === 'bq_reset'){
      await rpc('admin_tableau', {p_jeton:JETON, p_action:d.action, p_donnees:{
        pseudo:String(d.pseudo||'').slice(0, 40), personne:String(d.personne||'').slice(0, 60), note:String(d.note||'').slice(0, 2000)}});
      return ok();
    }
    return json({ok:false, erreur:'action'}, 400);
  }catch(e){
    console.log('[acces-admin]', e.message);
    return json({ok:false, erreur: e.status === 404 ? 'sql' : 'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-admin' };
