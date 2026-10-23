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
/* Cookie signé de l'appareil. Format historique (6.5.0) : « id.chk.sig ».
   Depuis le hub multi-promos, on y ajoute « .niveau.annee.admin.sig2 » : l'ancien
   code, qui ne lit que les trois premiers morceaux, l'accepte toujours (retour
   arrière sans danger) ; un cookie à trois morceaux est lu comme M1 2026-2027. */
export const NIVEAUX = ['licence', 'm1', 'm2'];
export const PAR_DEFAUT = {niveau:'m1', annee:'2026-2027'};
const signe = (secret, txt) => crypto.createHmac('sha256', secret).update(txt).digest('base64url');
export const niveauOk = n => NIVEAUX.includes(n);
export function anneeOk(a){
  const m = /^(\d{4})-(\d{4})$/.exec(String(a||''));
  return !!m && +m[2] === +m[1] + 1 && +m[1] >= 2020 && +m[1] < 2100;
}
export function cookieAcces(secret, id, niveau, annee, admin){
  if(!niveauOk(niveau)) niveau = PAR_DEFAUT.niveau;
  if(!anneeOk(annee)) annee = PAR_DEFAUT.annee;
  const chk = Math.floor(Date.now()/1000);
  const base = id+'.'+chk, ext = niveau+'.'+annee+'.'+(admin ? 1 : 0);
  return 'm1_acces='+base+'.'+signe(secret, base)+'.'+ext+'.'+signe(secret, base+'.'+ext)+
         '; Max-Age='+UN_AN+'; Path=/; HttpOnly; Secure; SameSite=Lax';
}
/* Cookie lisible par le navigateur (pas une preuve : la porte, c'est m1_acces).
   statut=cle&niveau=m1&annee=2026-2027, ou statut=essai&fin=<secondes>&m1=<matière>… */
export function cookieInfo(params){
  return 'acces_info='+encodeURIComponent(new URLSearchParams(params).toString())+'; Max-Age='+UN_AN+'; Path=/; Secure; SameSite=Lax';
}
/* {id, niveau, annee, admin} portés par le cookie signé, ou null s'il est absent ou falsifié. */
export function lireAcces(secret, entete){
  const m = String(entete||'').match(/(?:^|;\s*)m1_acces=([^;]+)/); if(!m) return null;
  const [id, chk, sig, niveau, annee, adm, sig2] = m[1].split('.');
  if(!id || !chk || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if(!memeTexte(sig, signe(secret, id+'.'+chk))) return null;
  if(sig2 && niveauOk(niveau) && anneeOk(annee) && /^[01]$/.test(adm) &&
     memeTexte(sig2, signe(secret, id+'.'+chk+'.'+niveau+'.'+annee+'.'+adm)))
    return {id, chk:+chk, niveau, annee, admin: adm === '1'};
  return {id, chk:+chk, niveau:PAR_DEFAUT.niveau, annee:PAR_DEFAUT.annee, admin:false};
}
/* Identifiant de clé porté par le cookie signé, ou null (appelants historiques). */
export function lireCookie(secret, entete){ const c = lireAcces(secret, entete); return c ? c.id : null; }
/* État de la clé en base : {valide, niveau, annee, admin}. Repli tant que
   supabase/acces-niveaux.sql n'est pas lancé : M1 2026-2027, jamais admin. */
export async function etatCle(id){
  try{ return await rpc('acces_etat', {p_id:id}); }
  catch(e){
    if(e.status !== 404) throw e;
    const valide = await rpc('acces_valide', {p_id:id});
    return {valide: valide !== false, niveau:PAR_DEFAUT.niveau, annee:PAR_DEFAUT.annee, admin:false};
  }
}
/* Adresse IP du visiteur, hachée avec le secret : sert seulement aux limites anti-abus. */
export function empreinteIP(secret, req, context){
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for')||'').split(',')[0].trim() || 'inconnue';
  return signe(secret, 'ip.'+ip).slice(0, 22);
}
/* Compteur du jour (table acces_limites) : true tant que « max » n'est pas dépassé.
   Si la base ne répond pas, on laisse passer (le champ piège reste actif). */
export async function sousLaLimite(jeton, cle, max){
  try{ return (await rpc('acces_limite', {p_jeton:jeton, p_cle:cle, p_max:max})) !== false; }
  catch(e){ console.log('[limite]', e.message); return true; }
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
/* Jeton Supabase (7.1.0) : JWT HS256 signé avec le secret JWT « legacy » du
   projet (variable SUPABASE_JWT_SECRET). Supabase le reconnaît comme un
   utilisateur « authenticated » ; les règles de la base (RLS) lisent ensuite
   ses champs (cle, pseudo) avec auth.jwt(). Aucune bibliothèque : node:crypto. */
export function jwtSupabase(secret, payload){
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corps = b64({alg:'HS256', typ:'JWT'})+'.'+b64(payload);
  return corps+'.'+crypto.createHmac('sha256', secret).update(corps).digest('base64url');
}
/* Pseudo affiché dans le chat : sans caractères de contrôle, espaces
   resserrés, 24 caractères au plus. */
export function nettoyerPseudo(p){
  const t = String(p||'').replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, '').replace(/\s+/g, ' ').trim();
  return Array.from(t).slice(0, 24).join('').trim();     // compte les émojis pour un caractère
}
