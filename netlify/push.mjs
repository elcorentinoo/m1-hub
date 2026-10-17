/* ════════════════════════════════════════════════════════════
   push.mjs — envoi de notifications Web Push, sans dépendance
   Partagé par les fonctions Netlify (bequick-notif, push-test).
   Chiffrement aes128gcm (RFC 8291, vérifié sur le jeu d'essai de la
   RFC) et jeton VAPID ES256 (RFC 8292), avec le module crypto de Node.
   ════════════════════════════════════════════════════════════ */
import crypto from 'node:crypto';

export const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
export const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';   // clé publique, déjà dans lb.js
const CONTACT  = 'https://partielsmastercpa.netlify.app';

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

export async function supa(chemin, opts = {}){
  const r = await fetch(SUPA_URL+'/rest/v1/'+chemin, {method:opts.method||'GET',
    headers:Object.assign({apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY}, opts.body?{'Content-Type':'application/json'}:{}),
    body:opts.body?JSON.stringify(opts.body):undefined});
  if(!r.ok) throw new Error('Supabase '+r.status+' '+await r.text());
  const t = await r.text(); return t ? JSON.parse(t) : null;
}

/* Un envoi à un abonné ; renvoie le code HTTP du service de notifications
   (201 : accepté · 404 / 410 : abonnement expiré). */
export async function envoyerUn(abonne, message, publique, privee){
  const r = await fetch(abonne.endpoint, {method:'POST', headers:{
    'Content-Encoding':'aes128gcm', 'Content-Type':'application/octet-stream',
    'TTL':'12600', 'Urgency':'high', 'Topic':message.tag || 'm1',
    'Authorization':'vapid t='+jetonVapid(abonne.endpoint, publique, privee)+', k='+publique
  }, body:chiffrer(JSON.stringify(message), abonne.p256dh, abonne.auth)});
  let texte = ''; try{ texte = (await r.text()).slice(0, 300); }catch(e){}
  return {status:r.status, texte};
}

/* Les clés d'envoi. La publique n'est pas secrète (elle est aussi dans
   bequick.js) : on la garde ici en secours si la variable manque. */
export const CLE_PUBLIQUE = 'BGudFKvHrz5uqtu2wW2HlNTfMgpuAvXR-E0EacuHaqb-9WSJV7oLdBxpwTc7EOtx2Ffn3JdBjPr0BcqVw8T8tzA';
export function cles(){
  const env = (globalThis.Netlify && Netlify.env) ? (k=>Netlify.env.get(k)) : (k=>process.env[k]);
  return {publique: env('VAPID_PUBLIC') || CLE_PUBLIQUE, privee: env('VAPID_PRIVATE') || ''};
}

/* Lecture du corps d'une requête (fonctions « classiques » : il peut
   arriver encodé en base64). */
export function lireCorps(event){
  try{
    const brut = event.isBase64Encoded ? Buffer.from(event.body||'', 'base64').toString('utf8') : (event.body||'');
    return JSON.parse(brut || '{}');
  }catch(e){ return null; }
}

/* Garde-fou : on n'envoie qu'à un vrai service de notifications
   (Apple, Google, Mozilla, Microsoft), jamais à une adresse quelconque. */
const SERVICES = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
export function abonnementValide(a){
  try{
    const u = new URL(a.endpoint);
    return u.protocol === 'https:' && SERVICES.test(u.hostname) &&
      /^[A-Za-z0-9_-]{80,100}$/.test(a.p256dh||'') && /^[A-Za-z0-9_-]{16,32}$/.test(a.auth||'');
  }catch(e){ return false; }
}

export const MESSAGE_TEST = {
  title: '🔔 Notification de test',
  body: "Ça marche ! Tu recevras l'alerte BeQuick à 18 h 30, du lundi au vendredi.",
  url: '/bequick.html',
  tag: 'test'
};
