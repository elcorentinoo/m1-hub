/* ════════════════════════════════════════════════════════════
   acces — la porte du site (6.5.0, niveaux et essai : hub multi-promos)
   Fonction Edge Netlify : elle s'exécute avant chaque fichier servi.
   Un appareil autorisé porte un cookie signé « m1_acces » posé par
   la fonction acces-activer quand il a consommé sa clé. Sans ce
   cookie, les pages renvoient vers acces.html et le reste refuse.

   Une fois par jour, le cookie est revérifié auprès de Supabase :
   une clé révoquée depuis /admin (ou dont l'année est finie) coupe
   l'appareil sous 24 h. Si Supabase ne répond pas, l'appareil déjà
   autorisé passe.

   Cookie m1_acces : « id.chk.sig » (format 6.5.0, lu comme M1
   2026-2027) ou « id.chk.sig.niveau.annee.admin.sig2 ». Les trois
   premiers morceaux gardent leur sens : l'ancien code accepte encore
   le nouveau cookie, un retour arrière ne verrouille personne.

   Sans clé : essai de 24 h (cookie signé « m1_essai », posé par la
   fonction acces-essai), limité à l'accueil et à la matière d'essai
   de chaque niveau (tableau ESSAI ci-dessous).

   Cookie lisible « acces_info » (affichage seulement, jamais une
   preuve) : statut=cle&niveau=m1&annee=2026-2027, ou
   statut=essai&fin=<secondes>&m1=systeme_bancaire…

   Variable d'environnement : ACCES_SECRET (signature des cookies).
   ════════════════════════════════════════════════════════════ */

/* ── Réglages ─────────────────────────────────────────────── */
/* Matière d'essai de chaque niveau : nom de la page sans « .html » ; null = aucune. */
const ESSAI = { licence: null, m1: 'systeme_bancaire', m2: null };
/* Pages réservées à un niveau (nom sans « .html » ; finissant par « / » = tout un dossier).
   Toute page absente de ces listes est COMMUNE : ouverte à toutes les clés. */
const PAGES = {
  licence: ['licence/'],
  m1: ['marche_des_particuliers', 'produits_derives', 'produits_derives_2', 'marketing_numerique', 'es_banque',
       'fiscalite_particulier', 'droits_particuliers', 'etudes_de_marche', 'systeme_bancaire',
       'entrainement_changes', 'entrainement_fiscal'],
  m2: ['m2/'],
};
/* ─────────────────────────────────────────────────────────── */

const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
const COOKIE = 'm1_acces', ESSAI_COOKIE = 'm1_essai', INFO = 'acces_info';
const UN_JOUR = 86400, UN_AN = 365 * 86400, DUREE_ESSAI = 86400;
const NIVEAUX = ['licence', 'm1', 'm2'];
const DEFAUT = {niveau:'m1', annee:'2026-2027', admin:false};

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function signer(secret, txt){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(txt)));
}
function egal(a, b){ if(a.length !== b.length) return false; let d = 0; for(let i=0;i<a.length;i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
const anneeOk = a => { const m = /^(\d{4})-(\d{4})$/.exec(String(a||'')); return !!m && +m[2] === +m[1] + 1; };
const lireBrut = (req, nom) => { const m = (req.headers.get('cookie')||'').match(new RegExp('(?:^|;\\s*)'+nom+'=([^;]+)')); return m ? m[1] : null; };

async function cookieAcces(secret, id, e){
  const chk = Math.floor(Date.now()/1000), base = id+'.'+chk;
  const ext = (NIVEAUX.includes(e.niveau) ? e.niveau : DEFAUT.niveau)+'.'+(anneeOk(e.annee) ? e.annee : DEFAUT.annee)+'.'+(e.admin ? 1 : 0);
  return COOKIE+'='+base+'.'+await signer(secret, base)+'.'+ext+'.'+await signer(secret, base+'.'+ext)+
         '; Max-Age='+UN_AN+'; Path=/; HttpOnly; Secure; SameSite=Lax';
}
async function lire(req, secret){
  const v = lireBrut(req, COOKIE); if(!v) return null;
  const [id, chk, sig, niveau, annee, adm, sig2] = v.split('.');
  if(!id || !chk || !sig || !/^[0-9a-f-]{36}$/.test(id)) return null;
  if(!egal(sig, await signer(secret, id+'.'+chk))) return null;
  if(sig2 && NIVEAUX.includes(niveau) && anneeOk(annee) && /^[01]$/.test(adm) &&
     egal(sig2, await signer(secret, id+'.'+chk+'.'+niveau+'.'+annee+'.'+adm)))
    return {id, chk:+chk, niveau, annee, admin: adm === '1', ancien:false};
  return Object.assign({id, chk:+chk, ancien:true}, DEFAUT);       // cookie 6.5.0 : M1
}
/* Essai : « debut.sig », signature distincte de celle des clés. */
async function lireEssai(req, secret){
  const v = lireBrut(req, ESSAI_COOKIE); if(!v) return null;
  const [debut, sig] = v.split('.');
  if(!/^\d{9,11}$/.test(debut||'') || !sig || !egal(sig, await signer(secret, 'essai.'+debut))) return null;
  return {debut:+debut, fin:+debut + DUREE_ESSAI};
}
/* État en base (contrôle quotidien) : {valide, niveau, annee, admin}, ou null si
   Supabase ne répond pas. Repli sur acces_valide tant que acces-niveaux.sql
   n'est pas lancé (la fonction acces_etat n'existe pas encore : 404). */
async function etat(id){
  const appel = nom => fetch(SUPA_URL+'/rest/v1/rpc/'+nom, {method:'POST',
    headers:{apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY, 'Content-Type':'application/json'},
    body:JSON.stringify({p_id:id})});
  try{
    let r = await appel('acces_etat');
    if(r.ok) return await r.json();
    if(r.status !== 404) return null;
    r = await appel('acces_valide');
    if(!r.ok) return null;
    return Object.assign({}, DEFAUT, {valide: (await r.json()) !== false});
  }catch(e){ return null; }
}

/* « /produits_derives.html », « /produits_derives » → « produits_derives » ; « / » → « index » */
function nomPage(url){
  let p = url.pathname; try{ p = decodeURIComponent(p); }catch(e){}
  p = p.replace(/^\/+/, '').replace(/\.html$/, '');
  return p === '' || p.endsWith('/') ? p + 'index' : p;
}
/* Une page HTML (et non une image, un script, une feuille de style…) */
const estPage = url => /(^|\/)[^.\/]*$|\.html$/.test(url.pathname);
const dans = (liste, nom) => (liste||[]).some(x => x.endsWith('/') ? nom.startsWith(x) : nom === x);
function niveauDePage(nom){ for(const n of NIVEAUX) if(dans(PAGES[n], nom)) return n; return null; }   // null = commune
/* Pendant l'essai : accueil, choix du niveau, espaces Licence et M2, et la matière d'essai de chaque niveau. */
const PAGES_ESSAI = ['index', 'niveaux', 'licence', 'm2'];
const pageEssai = nom => PAGES_ESSAI.includes(nom) || NIVEAUX.some(n => ESSAI[n] && nom === ESSAI[n]);

function versAcces(req, motif, effacer){
  const url = new URL(req.url);
  const navigation = req.method === 'GET' && ((req.headers.get('accept')||'').includes('text/html') || req.headers.get('sec-fetch-mode') === 'navigate');
  const entetes = {'Cache-Control':'no-store'};
  if(effacer) entetes['Set-Cookie'] = COOKIE+'=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';
  if(navigation){
    const cible = url.pathname + url.search, q = new URLSearchParams();
    if(motif) q.set('motif', motif);
    if(cible && cible !== '/') q.set('r', cible);
    entetes.Location = '/acces.html' + (q.toString() ? '?'+q : '');
    return new Response(null, {status:302, headers:entetes});
  }
  entetes['Content-Type'] = 'text/plain; charset=utf-8';
  return new Response('Accès réservé.', {status:401, headers:entetes});
}
/* Ajoute des Set-Cookie à la réponse de la page demandée. */
async function suite(context, cookies){
  const rep = await context.next();
  if(!cookies.length) return rep;
  const r = new Response(rep.body, rep);
  cookies.forEach(c => r.headers.append('Set-Cookie', c));
  return r;
}
function info(req, params){
  const v = encodeURIComponent(new URLSearchParams(params).toString());
  return lireBrut(req, INFO) === v ? [] : [INFO+'='+v+'; Max-Age='+UN_AN+'; Path=/; Secure; SameSite=Lax'];
}

export default async (req, context) => {
  const secret = Netlify.env.get('ACCES_SECRET');
  if(!secret) return context.next();             // pas encore configuré : site ouvert
  const url = new URL(req.url);
  const page = estPage(url), nom = page ? nomPage(url) : '';

  /* 1. Appareil à clé */
  let c = await lire(req, secret);
  if(c){
    const cookies = [];
    if(Math.floor(Date.now()/1000) - c.chk >= UN_JOUR){
      const e = await etat(c.id);
      if(e && e.valide === false) return versAcces(req, null, true);
      if(e) c = Object.assign(c, {niveau:e.niveau, annee:e.annee, admin:!!e.admin});
      cookies.push(await cookieAcces(secret, c.id, c));
    }
    if(page){
      const niv = niveauDePage(nom);
      if(niv && niv !== c.niveau && !c.admin) return versAcces(req, 'niveau', false);
      cookies.push(...info(req, Object.assign({statut:'cle', niveau:c.niveau, annee:c.annee}, c.admin ? {admin:1} : {})));
    }
    return suite(context, cookies);
  }

  /* 2. Essai de 24 h */
  const e = await lireEssai(req, secret);
  if(e){
    if(Math.floor(Date.now()/1000) >= e.fin) return versAcces(req, 'essai-fini', false);
    if(!page) return context.next();
    if(!pageEssai(nom)) return versAcces(req, 'essai', false);
    const p = {statut:'essai', fin:e.fin};
    NIVEAUX.forEach(n => { if(ESSAI[n]) p[n] = ESSAI[n]; });
    return suite(context, info(req, p));
  }

  /* 3. Rien : la page d'entrée */
  return versAcces(req, null, true);
};

/* Restent ouverts : la page d'entrée et ce qu'il lui faut, la gestion
   (/admin, protégée par la clé administratrice), les fonctions Netlify,
   le service worker (pour que les mises à jour arrivent toujours) et les icônes. */
export const config = {
  path: '/*',
  excludedPath: ['/acces.html', '/admin', '/acces-admin.html', '/.netlify/*', '/sw.js',
                 '/manifest.webmanifest', '/icons/*', '/favicon.ico', '/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/theme.css', '/ui.css']
};
