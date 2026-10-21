/* ════════════════════════════════════════════════════════════
   acces.mjs — outils communs des clés d'accès (6.5.0)
   Utilisé par les fonctions acces-activer et acces-admin. La
   signature du cookie doit rester identique à celle de la fonction
   Edge netlify/edge-functions/acces.js (HMAC-SHA256, base64url).
   ════════════════════════════════════════════════════════════ */
import crypto from 'node:crypto';

const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
const UN_AN = 365 * 86400;
/* Sans 0/O, 1/I/L : une clé se recopie sans erreur. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export async function rpc(nom, args){
  const r = await fetch(SUPA_URL+'/rest/v1/rpc/'+nom, {method:'POST',
    headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json'},
    body:JSON.stringify(args)});
  const t = await r.text();
  if(!r.ok) throw Object.assign(new Error('Supabase '+r.status+' '+t), {status:r.status});
  return t ? JSON.parse(t) : null;
}
/* « k7q m2x-9pl » → « K7QM2X9PL » */
export function normaliser(cle){ return String(cle||'').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
export function empreinte(cle){ return crypto.createHash('sha256').update(normaliser(cle)).digest('hex'); }
export function nouvelleCle(){
  let s = ''; for(let i=0;i<9;i++) s += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return s.slice(0,3)+'-'+s.slice(3,6)+'-'+s.slice(6);
}
export function cookieAcces(secret, id){
  const chk = Math.floor(Date.now()/1000);
  const sig = crypto.createHmac('sha256', secret).update(id+'.'+chk).digest('base64url');
  return 'm1_acces='+id+'.'+chk+'.'+sig+'; Max-Age='+UN_AN+'; Path=/; HttpOnly; Secure; SameSite=Lax';
}
export function memeTexte(a, b){
  const x = Buffer.from(String(a||'')), y = Buffer.from(String(b||''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
/* « iPhone · Safari », « Windows · Chrome »… pour reconnaître l'appareil dans /admin */
export function appareil(ua){
  ua = String(ua||'');
  const os = /iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Mac OS X/.test(ua)?'Mac':/Windows/.test(ua)?'Windows':/Linux/.test(ua)?'Linux':'Appareil';
  const nav = /Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/CriOS|Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'navigateur';
  return os+' · '+nav;
}
export async function lireCorps(req){ try{ return await req.json(); }catch(e){ return {}; } }
export const json = (obj, status=200, extra={}) => new Response(JSON.stringify(obj), {status, headers:Object.assign({'Content-Type':'application/json', 'Cache-Control':'no-store'}, extra)});
