/* ════════════════════════════════════════════════════════════
   bequick-notif — l'alerte BeQuick de 18 h 30 (6.0.0 « Ducat »)
   Fonction planifiée Netlify, sans aucune dépendance : le chiffrement
   des notifications (RFC 8291) et la signature VAPID (RFC 8292) sont
   faits avec le module crypto de Node.

   Netlify lance les fonctions planifiées à heure fixe en UTC : elle
   tourne à 16 h 30 et 17 h 30 UTC, du lundi au vendredi, et n'envoie
   que lorsqu'il est 18 h 30 à Paris (17 h 30 UTC en hiver, 16 h 30 UTC en été).

   Variables d'environnement (Netlify → Site configuration →
   Environment variables) :
     VAPID_PUBLIC   clé publique (la même que CLE_PUSH dans bequick.js)
     VAPID_PRIVATE  clé privée — ne jamais la mettre dans le dépôt
   ════════════════════════════════════════════════════════════ */
import {supa, envoyerUn, cles} from '../push.mjs';

export const MESSAGE = {
  title: '⚡ BeQuick est ouvert',
  body: "18 h 30 : la série du jour t'attend. 15 questions, 10 minutes, une seule chance — toute la promo joue la même. Fermeture à 22 h.",
  url: '/bequick.html',
  tag: 'bequick'
};

function heureParis(){
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Paris',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {h:+p.hour, mi:+p.minute, weekend:p.weekday === 'Sat' || p.weekday === 'Sun'};
}

export async function envoyerATous(publique, privee, message = MESSAGE){
  const abonnes = await supa('push_abonnements?select=endpoint,p256dh,auth') || [];
  let ok = 0, oublies = 0, echecs = 0;
  await Promise.all(abonnes.map(async a=>{
    try{
      const st = (await envoyerUn(a, message, publique, privee)).status;
      if(st === 404 || st === 410){ oublies++; await supa('rpc/push_oublier', {method:'POST', body:{e:a.endpoint}}).catch(()=>{}); }
      else if(st >= 200 && st < 300) ok++;
      else echecs++;
    }catch(e){ echecs++; }
  }));
  return {abonnes:abonnes.length, ok, oublies, echecs};
}

export default async (req) => {
  const {publique, privee} = cles();
  if(!privee) return new Response('Clé VAPID_PRIVATE absente', {status:500});
  const {h, mi, weekend} = heureParis();
  if(weekend) return new Response('Week-end : pas de BeQuick.');
  if(h !== 18) return new Response('Pas encore 18 h 30 à Paris ('+h+' h '+mi+').');
  /* une étiquette par jour : sur iPhone, une notification qui porte la même
     étiquette qu'une précédente la remplace sans bannière ni son (6.3.1) */
  const jour = new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris'}).format(new Date());
  const bilan = await envoyerATous(publique, privee, {...MESSAGE, tag:'bequick-'+jour});
  console.log('[bequick-notif]', JSON.stringify(bilan));
  return new Response(JSON.stringify(bilan), {headers:{'Content-Type':'application/json'}});
};

export const config = { schedule: '30 16,17 * * 1-5' };   // du lundi au vendredi
