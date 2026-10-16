/* ════════════════════════════════════════════════════════════
   push-test-background — la notification de test, une minute après
   l'activation de l'alerte sur un appareil (6.0.3).
   « -background » : Netlify répond tout de suite (202) et laisse la
   fonction tourner jusqu'à 15 minutes ; elle attend 60 secondes puis
   envoie le message de test à l'appareil qui vient de s'abonner.
   Si cette forme n'est pas disponible sur le forfait, le site se
   rabat sur push-test (envoi immédiat).
   ════════════════════════════════════════════════════════════ */
import {envoyerUn, abonnementValide, MESSAGE_TEST} from '../push.mjs';

export const handler = async (event) => {
  let a = null;
  try{ a = JSON.parse(event.body || '{}'); }catch(e){}
  if(event.httpMethod !== 'POST' || !a || !abonnementValide(a)) return {statusCode:400, body:'Abonnement invalide'};
  const publique = process.env.VAPID_PUBLIC, privee = process.env.VAPID_PRIVATE;
  if(!publique || !privee) return {statusCode:500, body:'Clés VAPID absentes'};
  await new Promise(ok=>setTimeout(ok, 60000));
  const st = await envoyerUn(a, MESSAGE_TEST, publique, privee);
  console.log('[push-test-background] service de notifications :', st);
  return {statusCode:200, body:String(st)};
};
