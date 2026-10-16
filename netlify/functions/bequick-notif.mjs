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
import crypto from 'node:crypto';

const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';   // clé publique, déjà dans lb.js
const CONTACT  = 'https://partielsmastercpa.netlify.app';

export const MESSAGE = {
  title: '⚡ BeQuick est ouvert',
  body: "18 h 30 : la série du jour t'attend. 30 questions, 20 minutes, une seule chance — toute la promo joue la même. Fermeture à 22 h.",
  url: '/bequick.html',
  tag: 'bequick'
};

const b64u = buf => Buffer.from(buf).toString('base64url');
const deB64u = s => Buffer.from(s, 'base64url');
const hmac = (cle, data) => crypto.createHmac('sha256', cle).update(data).digest();

/* Chiffrement d'un message pour un abonné (aes128gcm, RFC 8291) */
export function chiffrer(texte, p256dh, auth, essai = {}){
  const uaPublic = deB64u(p256dh), secret = deB64u(auth);
  const ecdh = crypto.createECDH('prime256v1');
  if(essai.asPrivee) ecdh.setPrivateKey(deB64u(essai.asPrivee)); else ecdh.generateKeys();   // essai : jeu d'essai de la RFC
  const asPublic = ecdh.getPublicKey();
  const partage = ecdh.computeSecret(uaPublic);
  const prkCle = hmac(secret, partage);
  const ikm = hmac(prkCle, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const sel = essai.sel ? deB64u(essai.sel) : crypto.randomBytes(16);
  const prk = hmac(sel, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const chiffre = Buffer.concat([c.update(Buffer.concat([Buffer.from(texte), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sel, rs, Buffer.from([asPublic.length]), asPublic, chiffre]);
}

/* Jeton VAPID signé (ES256) pour le service de notifications */
export function jetonVapid(endpoint, publique, privee){
  const pub = deB64u(publique);
  const cle = crypto.createPrivateKey({key:{kty:'EC', crv:'P-256', d:privee, x:b64u(pub.subarray(1,33)), y:b64u(pub.subarray(33,65))}, format:'jwk'});
  const entete = b64u(JSON.stringify({typ:'JWT', alg:'ES256'}));
  const corps = b64u(JSON.stringify({aud:new URL(endpoint).origin, exp:Math.floor(Date.now()/1000) + 12*3600, sub:CONTACT}));
  const sig = crypto.sign('sha256', Buffer.from(entete+'.'+corps), {key:cle, dsaEncoding:'ieee-p1363'});
  return entete+'.'+corps+'.'+b64u(sig);
}

async function supa(chemin, opts = {}){
  const r = await fetch(SUPA_URL+'/rest/v1/'+chemin, {method:opts.method||'GET',
    headers:Object.assign({apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY}, opts.body?{'Content-Type':'application/json'}:{}),
    body:opts.body?JSON.stringify(opts.body):undefined});
  if(!r.ok) throw new Error('Supabase '+r.status+' '+await r.text());
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

function heureParis(){
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));
  return {h:+p.hour, mi:+p.minute};
}

export async function envoyerATous(publique, privee, message = MESSAGE){
  const abonnes = await supa('push_abonnements?select=endpoint,p256dh,auth') || [];
  const texte = JSON.stringify(message);
  let ok = 0, oublies = 0, echecs = 0;
  await Promise.all(abonnes.map(async a=>{
    try{
      const r = await fetch(a.endpoint, {method:'POST', headers:{
        'Content-Encoding':'aes128gcm', 'Content-Type':'application/octet-stream',
        'TTL':'12600', 'Urgency':'high', 'Topic':'bequick',
        'Authorization':'vapid t='+jetonVapid(a.endpoint, publique, privee)+', k='+publique
      }, body:chiffrer(texte, a.p256dh, a.auth)});
      if(r.status === 404 || r.status === 410){ oublies++; await supa('rpc/push_oublier', {method:'POST', body:{e:a.endpoint}}).catch(()=>{}); }
      else if(r.ok) ok++;
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
