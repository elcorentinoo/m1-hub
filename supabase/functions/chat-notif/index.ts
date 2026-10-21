/* ════════════════════════════════════════════════════════════
   chat-notif — notification « Léa a envoyé un message » (7.1.0)
   Fonction Supabase (Edge Function, Deno), gratuite : elle envoie les
   notifications du chat même appli fermée, sans passer par Netlify.
   Fichier unique, à coller tel quel dans Supabase → Edge Functions.
   Chiffrement identique à netlify/push.mjs (vérifié octet pour octet).
   ════════════════════════════════════════════════════════════ */
const te = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const deB64u = s => Uint8Array.from(atob(String(s).replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const concat = (...l) => { const n = l.reduce((a,x)=>a+x.length,0), o = new Uint8Array(n); let i = 0; l.forEach(x=>{ o.set(x, i); i += x.length; }); return o; };
async function hmac(cle, data){
  const k = await crypto.subtle.importKey('raw', cle, {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

/* essai = {asJwk, sel} : uniquement pour les tests (clé d'envoi et sel imposés) */
async function chiffrer(texte, p256dh, auth, essai = {}){
  const uaPublic = deB64u(p256dh), secret = deB64u(auth);
  const uaCle = await crypto.subtle.importKey('raw', uaPublic, {name:'ECDH', namedCurve:'P-256'}, false, []);
  let asPrivee, asPublic;
  if(essai.asJwk){
    asPrivee = await crypto.subtle.importKey('jwk', essai.asJwk, {name:'ECDH', namedCurve:'P-256'}, false, ['deriveBits']);
    asPublic = concat(new Uint8Array([4]), deB64u(essai.asJwk.x), deB64u(essai.asJwk.y));
  }else{
    const paire = await crypto.subtle.generateKey({name:'ECDH', namedCurve:'P-256'}, true, ['deriveBits']);
    asPrivee = paire.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey));
  }
  const partage = new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH', public:uaCle}, asPrivee, 256));
  const prkCle = await hmac(secret, partage);
  const ikm = await hmac(prkCle, concat(te.encode('WebPush: info\0'), uaPublic, asPublic, new Uint8Array([1])));
  const sel = essai.sel ? deB64u(essai.sel) : crypto.getRandomValues(new Uint8Array(16));
  const prk = await hmac(sel, ikm);
  const cek = (await hmac(prk, te.encode('Content-Encoding: aes128gcm\0\x01'))).slice(0, 16);
  const nonce = (await hmac(prk, te.encode('Content-Encoding: nonce\0\x01'))).slice(0, 12);
  const k = await crypto.subtle.importKey('raw', cek, {name:'AES-GCM'}, false, ['encrypt']);
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM', iv:nonce, tagLength:128}, k, concat(te.encode(texte), new Uint8Array([2]))));
  return concat(sel, new Uint8Array([0,0,16,0]), new Uint8Array([asPublic.length]), asPublic, chiffre);
}

async function jetonVapid(endpoint, publique, privee, contact){
  const pub = deB64u(publique);
  const cle = await crypto.subtle.importKey('jwk', {kty:'EC', crv:'P-256', d:privee, x:b64u(pub.slice(1,33)), y:b64u(pub.slice(33,65)), ext:true},
    {name:'ECDSA', namedCurve:'P-256'}, false, ['sign']);
  const entete = b64u(te.encode(JSON.stringify({typ:'JWT', alg:'ES256'})));
  const corps = b64u(te.encode(JSON.stringify({aud:new URL(endpoint).origin, exp:Math.floor(Date.now()/1000) + 12*3600, sub:contact})));
  const sig = await crypto.subtle.sign({name:'ECDSA', hash:'SHA-256'}, cle, te.encode(entete+'.'+corps));
  return entete+'.'+corps+'.'+b64u(sig);
}

async function envoyerUn(abonne, message, publique, privee, contact){
  const r = await fetch(abonne.endpoint, {method:'POST', headers:{
    'Content-Encoding':'aes128gcm', 'Content-Type':'application/octet-stream',
    'TTL':'3600', 'Urgency':'normal', 'Topic':message.tag || 'm1',
    'Authorization':'vapid t='+await jetonVapid(abonne.endpoint, publique, privee, contact)+', k='+publique
  }, body:await chiffrer(JSON.stringify(message), abonne.p256dh, abonne.auth)});
  return r.status;
}

/* On n'envoie qu'à un vrai service de notifications (Apple, Google, Mozilla, Microsoft). */
const SERVICES = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
function abonnementValide(a){
  try{ const u = new URL(a.endpoint); return u.protocol === 'https:' && SERVICES.test(u.hostname) && !!a.p256dh && !!a.auth; }
  catch(e){ return false; }
}

/* ───────────── la fonction ─────────────
   Appelée par la base (trigger sur chat_messages, via pg_net) à chaque
   nouveau message. Elle demande à la base s'il faut prévenir (anti-spam :
   au plus une notification toutes les 3 minutes, qui regroupe les messages
   arrivés entre-temps), puis l'envoie à tous les abonnés aux notifications,
   sauf à l'auteur et à ceux qui ont coupé les notifications du chat.

   Secrets (Supabase → Edge Functions → Secrets) :
     CHAT_NOTIF_SECRET  le même que dans le coffre de la base (vault)
     VAPID_PRIVATE      la clé privée des notifications (comme sur Netlify)
   SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont fournis par Supabase. */
const VAPID_PUBLIQUE = 'BGudFKvHrz5uqtu2wW2HlNTfMgpuAvXR-E0EacuHaqb-9WSJV7oLdBxpwTc7EOtx2Ffn3JdBjPr0BcqVw8T8tzA';
const CONTACT = 'https://partielsmastercpa.netlify.app';

function base(chemin, opts = {}){
  const url = Deno.env.get('SUPABASE_URL'), cle = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  return fetch(url+'/rest/v1/'+chemin, {method:opts.method||'GET',
    headers:{apikey:cle, Authorization:'Bearer '+cle, 'Content-Type':'application/json'},
    body:opts.body ? JSON.stringify(opts.body) : undefined});
}
function texte(t){
  const p = t.pseudos || [], n = t.nb || 1;
  if(p.length > 1) return p[0]+' et '+(p.length-1)+' autre'+(p.length > 2 ? 's' : '')+' ont envoyé des messages';
  if(n > 1) return (p[0] || 'Quelqu’un')+' a envoyé '+n+' messages';
  return (p[0] || 'Quelqu’un')+' a envoyé un message';
}

Deno.serve(async (req) => {
  if(req.headers.get('x-chat-secret') !== Deno.env.get('CHAT_NOTIF_SECRET')) return new Response('refusé', {status:401});
  const privee = Deno.env.get('VAPID_PRIVATE');
  if(!privee) return new Response('VAPID_PRIVATE manquante', {status:500});
  const {id, pseudo} = await req.json().catch(()=>({}));
  const r = await base('rpc/chat_notif_tour', {method:'POST', body:{p_id:id}});
  if(!r.ok) return new Response('base '+r.status+' '+await r.text(), {status:502});
  const tour = await r.json();
  if(!tour || !tour.envoyer) return new Response('regroupé avec la notification précédente');
  const a = await base('push_abonnements?select=endpoint,p256dh,auth,pseudo,chat');
  const abonnes = (await a.json()).filter(x => x.chat !== false && abonnementValide(x) &&
    (x.pseudo||'').trim().toLowerCase() !== String(pseudo||'').trim().toLowerCase());
  const message = {title:'💬 Messagerie M1', body:texte(tour), url:'/?chat=1', tag:'chat'};
  let ok = 0, oublies = 0, echecs = 0;
  await Promise.all(abonnes.map(async x => {
    try{
      const st = await envoyerUn(x, message, VAPID_PUBLIQUE, privee, CONTACT);
      if(st === 404 || st === 410){ oublies++; await base('rpc/push_oublier', {method:'POST', body:{e:x.endpoint}}).catch(()=>{}); }
      else if(st >= 200 && st < 300) ok++; else echecs++;
    }catch(e){ echecs++; }
  }));
  const bilan = {abonnes:abonnes.length, ok, oublies, echecs, texte:message.body};
  console.log('[chat-notif]', JSON.stringify(bilan));
  return new Response(JSON.stringify(bilan), {headers:{'Content-Type':'application/json'}});
});
