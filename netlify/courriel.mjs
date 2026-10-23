/* ════════════════════════════════════════════════════════════
   courriel.mjs — envoi d'un e-mail à Corentin
   Utilisé par « signaler » (A3) et par la demande de clé (B6).
   Tout l'envoi tient ici : changer de service ne touche que ce
   fichier. Aucune dépendance : fetch seulement.

   Service : Resend (gratuit, 100 e-mails par jour). Sans nom de
   domaine, Resend envoie depuis onboarding@resend.dev et seulement
   vers l'adresse du compte Resend — ici, celle de Corentin.

   Variables d'environnement Netlify (jamais dans le dépôt) :
     RESEND_CLE     clé d'API Resend (droit « Sending access »)
     SIGNALER_DEST  adresse de Corentin (celle du compte Resend)
   ════════════════════════════════════════════════════════════ */

export function courrielConfigure(){
  return !!(process.env.RESEND_CLE && process.env.SIGNALER_DEST);
}

/* {sujet, texte, html?, repondreA?} → true si Resend a accepté le message.
   repondreA : adresse mise en « Répondre à » (demande de clé, par exemple). */
export async function envoyerCourriel({sujet, texte, html, repondreA}){
  if(!courrielConfigure()) return false;
  const corps = {from:'Hub M1 <onboarding@resend.dev>', to:[process.env.SIGNALER_DEST], subject:String(sujet||'').slice(0, 200), text:String(texte||'')};
  if(html) corps.html = html;
  if(repondreA && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(repondreA)) corps.reply_to = repondreA;
  try{
    const r = await fetch('https://api.resend.com/emails', {method:'POST',
      headers:{Authorization:'Bearer '+process.env.RESEND_CLE, 'Content-Type':'application/json'},
      body:JSON.stringify(corps)});
    if(!r.ok) console.log('[courriel] Resend', r.status, (await r.text()).slice(0, 300));
    return r.ok;
  }catch(e){
    console.log('[courriel]', e.message);
    return false;
  }
}
