/* ════════════════════════════════════════════════════════════
   bequick-notif — l'alerte BeQuick de 18 h 30 (6.0.0 « Ducat »)
   Fonction planifiée Netlify, sans aucune dépendance : le chiffrement
   des notifications (RFC 8291) et la signature VAPID (RFC 8292) sont
   faits avec le module crypto de Node.

   Netlify lance les fonctions planifiées à heure fixe en UTC : elle
   tourne à 16 h 30 et 17 h 30 UTC, et n'envoie que lorsqu'il est
   18 h 30 à Paris (17 h 30 UTC en hiver, 16 h 30 UTC en été).

   Variables d'environnement (Netlify → Site configuration →
   Environment variables) :
     VAPID_PUBLIC   clé publique (la même que CLE_PUSH dans bequick.js)
     VAPID_PRIVATE  clé privée — ne jamais la mettre dans le dépôt
   ════════════════════════════════════════════════════════════ */
import {supa, envoyerUn} from '../push.mjs';

export const MESSAGE = {
  title: '⚡ BeQuick est ouvert',
  body: "18 h 30 : la série du jour t'attend. 30 questions, 20 minutes, une seule chance — toute la promo joue la même. Fermeture à 22 h.",
  url: '/bequick.html',
  tag: 'bequick'
};

function heureParis(){
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {h:+p.hour, mi:+p.minute};
}

export async function envoyerATous(publique, privee, message = MESSAGE){
  const abonnes = await supa('push_abonnements?select=endpoint,p256dh,auth') || [];
  let ok = 0, oublies = 0, echecs = 0;
  await Promise.all(abonnes.map(async a=>{
    try{
      const st = await envoyerUn(a, message, publique, privee);
      if(st === 404 || st === 410){ oublies++; await supa('rpc/push_oublier', {method:'POST', body:{e:a.endpoint}}).catch(()=>{}); }
      else if(st >= 200 && st < 300) ok++;
      else echecs++;
    }catch(e){ echecs++; }
  }));
  return {abonnes:abonnes.length, ok, oublies, echecs};
}

export default async (req) => {
  const publique = process.env.VAPID_PUBLIC, privee = process.env.VAPID_PRIVATE;
  if(!publique || !privee) return new Response('Clés VAPID absentes', {status:500});
  const {h, mi} = heureParis();
  if(h !== 18) return new Response('Pas encore 18 h 30 à Paris ('+h+' h '+mi+').');
  const bilan = await envoyerATous(publique, privee);
  console.log('[bequick-notif]', JSON.stringify(bilan));
  return new Response(JSON.stringify(bilan), {headers:{'Content-Type':'application/json'}});
};

export const config = { schedule: '30 16,17 * * *' };
