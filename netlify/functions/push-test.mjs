/* ════════════════════════════════════════════════════════════
   push-test — la notification de test, envoyée tout de suite.
   Repli de push-test-background quand l'attente d'une minute
   n'est pas disponible.
   ════════════════════════════════════════════════════════════ */
import {envoyerUn, abonnementValide, MESSAGE_TEST} from '../push.mjs';

export default async (req) => {
  if(req.method !== 'POST') return new Response('POST attendu', {status:405});
  let a = null;
  try{ a = await req.json(); }catch(e){}
  if(!a || !abonnementValide(a)) return new Response('Abonnement invalide', {status:400});
  const publique = process.env.VAPID_PUBLIC, privee = process.env.VAPID_PRIVATE;
  if(!publique || !privee) return new Response('Clés VAPID absentes', {status:500});
  const st = await envoyerUn(a, MESSAGE_TEST, publique, privee);
  return new Response(JSON.stringify({service:st}), {status: st >= 200 && st < 300 ? 200 : 502, headers:{'Content-Type':'application/json'}});
};
