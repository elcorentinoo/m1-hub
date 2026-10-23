/* courriel.mjs — envoi d'un e-mail à Corentin par Resend (hub multi-promos)
   Partagé par « signaler une erreur » (A3) et les demandes de clé.
   Variables Netlify : RESEND_CLE (clé d'API Resend) et SIGNALER_DEST
   (adresse de réception). Aucune adresse dans le dépôt. Sans domaine
   vérifié chez Resend, l'expéditeur onboarding@resend.dev ne peut
   écrire qu'à l'adresse du compte Resend : c'est bien celle de Corentin. */
export async function envoyerCourriel({sujet, texte, repondreA}){
  const CLE = process.env.RESEND_CLE, DEST = process.env.SIGNALER_DEST;
  if(!CLE || !DEST) throw Object.assign(new Error('config'), {code:'config'});
  const corps = {from:'Hub de révision <onboarding@resend.dev>', to:[DEST],
                 subject:String(sujet||'').slice(0, 150), text:String(texte||'')};
  if(repondreA && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(repondreA)) corps.reply_to = repondreA;
  const r = await fetch('https://api.resend.com/emails', {method:'POST',
    headers:{Authorization:'Bearer '+CLE, 'Content-Type':'application/json'}, body:JSON.stringify(corps)});
  if(!r.ok) throw Object.assign(new Error('Resend '+r.status+' '+(await r.text()).slice(0, 200)), {status:r.status});
  return true;
}
