/* ════════════════════════════════════════════════════════════
   push-test-background — la notification de test, une minute après
   l'activation de l'alerte sur un appareil.
   « -background » : Netlify répond tout de suite (202) et laisse la
   fonction tourner jusqu'à 15 minutes ; elle attend 60 secondes puis
   envoie le message de test. Chaque étape est écrite dans le journal
   (Netlify → Logs → Functions → push-test-background).
   ════════════════════════════════════════════════════════════ */
import {envoyerUn, abonnementValide, MESSAGE_TEST, cles, lireCorps} from '../push.mjs';

export const handler = async (event) => {
  const a = lireCorps(event);
  if(!a || !abonnementValide(a)){
    console.log('[push-test-background] abonnement refusé :', a ? String(a.endpoint).slice(0, 60) : 'corps illisible');
    return {statusCode:400, body:'Abonnement invalide'};
  }
  const {publique, privee} = cles();
  if(!privee){ console.log('[push-test-background] clé VAPID_PRIVATE absente'); return {statusCode:500, body:'Clé absente'}; }
  console.log('[push-test-background] reçu pour', new URL(a.endpoint).hostname, '— envoi dans 60 s');
  await new Promise(ok=>setTimeout(ok, 60000));
  const r = await envoyerUn(a, MESSAGE_TEST, publique, privee);
  console.log('[push-test-background] réponse du service :', r.status, r.texte);
  return {statusCode:200, body:String(r.status)};
};
