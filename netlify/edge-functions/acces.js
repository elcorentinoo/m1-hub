/* ════════════════════════════════════════════════════════════
   acces — la porte du site (6.5.0)
   Fonction Edge Netlify : elle s'exécute avant chaque fichier servi.
   Un appareil autorisé porte un cookie signé « m1_acces » posé par
   la fonction acces-activer quand il a consommé sa clé. Sans ce
   cookie, les pages renvoient vers acces.html et le reste refuse.

   Une fois par jour, le cookie est revérifié auprès de Supabase :
   une clé révoquée depuis /admin coupe l'appareil sous 24 h. Si
   Supabase ne répond pas, l'appareil déjà autorisé passe.

   Variable d'environnement : ACCES_SECRET (signature des cookies).
   ════════════════════════════════════════════════════════════ */
const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
const COOKIE = 'm1_acces';
const UN_JOUR = 86400, UN_AN = 365 * 86400;

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function signer(secret, txt){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(txt)));
}
function egal(a, b){ if(a.length !== b.length) return false; let d = 0; for(let i=0;i<a.length;i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
async function cookieAcces(secret, id){
  const chk = Math.floor(Date.now()/1000);
  return COOKIE+'='+id+'.'+chk+'.'+await signer(secret, id+'.'+chk)+'; Max-Age='+UN_AN+'; Path=/; HttpOnly; Secure; SameSite=Lax';
}
async function lire(req, secret){
  const m = (req.headers.get('cookie')||'').match(/(?:^|;\s*)m1_acces=([^;]+)/);
  if(!m) return null;
  const [id, chk, sig] = m[1].split('.');
  if(!id || !chk || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if(!egal(sig, await signer(secret, id+'.'+chk))) return null;
  return {id, chk:+chk};
}
async function toujoursValide(id){
  try{
    const r = await fetch(SUPA_URL+'/rest/v1/rpc/acces_valide', {method:'POST',
      headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json'},
      body:JSON.stringify({p_id:id})});
    if(!r.ok) return true;                       // Supabase indisponible : on ne bloque pas
    return (await r.json()) !== false;
  }catch(e){ return true; }
}
function refuser(req){
  const url = new URL(req.url);
  const page = req.method === 'GET' && ((req.headers.get('accept')||'').includes('text/html') || req.headers.get('sec-fetch-mode') === 'navigate');
  if(page){
    const cible = url.pathname + url.search;
    return new Response(null, {status:302, headers:{
      Location:'/acces.html' + (cible && cible !== '/' ? '?r='+encodeURIComponent(cible) : ''),
      'Cache-Control':'no-store',
      'Set-Cookie': COOKIE+'=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'}});
  }
  return new Response('Accès réservé aux étudiants du M1 MBAF.', {status:401, headers:{'Cache-Control':'no-store', 'Content-Type':'text/plain; charset=utf-8'}});
}

export default async (req, context) => {
  const secret = Netlify.env.get('ACCES_SECRET');
  if(!secret) return context.next();             // pas encore configuré : site ouvert
  const c = await lire(req, secret);
  if(!c) return refuser(req);
  const age = Math.floor(Date.now()/1000) - c.chk;
  if(age < UN_JOUR) return context.next();
  if(!(await toujoursValide(c.id))) return refuser(req);
  const rep = await context.next();
  const r = new Response(rep.body, rep);
  r.headers.append('Set-Cookie', await cookieAcces(secret, c.id));
  return r;
};

/* Restent ouverts : la page d'entrée et ce qu'il lui faut, la gestion
   (/admin, protégée par mot de passe), les fonctions Netlify, le service
   worker (pour que les mises à jour arrivent toujours) et les icônes. */
export const config = {
  path: '/*',
  excludedPath: ['/acces.html', '/admin', '/acces-admin.html', '/.netlify/*', '/sw.js',
                 '/manifest.webmanifest', '/icons/*', '/favicon.ico', '/theme.css', '/ui.css']
};
