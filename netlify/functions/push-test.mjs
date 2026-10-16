/* ════════════════════════════════════════════════════════════
   push-test — la notification de test, envoyée tout de suite.
   Utilisée par le bouton « Envoyer une notification de test » de la
   cloche : elle renvoie au site la réponse exacte du service de
   notifications (Apple, Google…), affichée à l'écran.
   ════════════════════════════════════════════════════════════ */
import {envoyerUn, abonnementValide, MESSAGE_TEST, cles} from '../push.mjs';

const json = (o, status = 200) => new Response(JSON.stringify(o), {status, headers:{'Content-Type':'application/json'}});

export default async (req) => {
  if(req.method !== 'POST') return json({etape:'methode', ok:false}, 405);
  let a = null;
  try{ a = await req.json(); }catch(e){}
  if(!a || !abonnementValide(a)) return json({etape:'abonnement', ok:false, detail:a ? String(a.endpoint).slice(0, 60) : 'corps illisible'}, 400);
  const {publique, privee} = cles();
  if(!privee) return json({etape:'cle', ok:false, detail:'VAPID_PRIVATE absente'}, 500);
  try{
    const r = await envoyerUn(a, MESSAGE_TEST, publique, privee);
    console.log('[push-test] réponse du service :', r.status, r.texte);
    return json({etape:'envoi', ok:r.status >= 200 && r.status < 300, service:r.status, detail:r.texte});
  }catch(e){
    console.log('[push-test] erreur :', e.message);
    return json({etape:'envoi', ok:false, detail:e.message}, 502);
  }
};
