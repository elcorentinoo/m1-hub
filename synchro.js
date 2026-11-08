/* ════════════════════════════════════════════════════════════
   synchro.js — progression partagée entre appareils
   La progression de progress.js (leçons, XP, meilleurs scores,
   réponses, planning de révision) reste d'abord sur l'appareil :
   le site marche hors ligne comme avant. Quand le réseau est là,
   elle est fusionnée avec celle des autres appareils du même pseudo.

   · Identité : le jeton Supabase de la messagerie (acces-jeton),
     délivré d'après le cookie signé de la clé d'accès. La base ne
     croit que l'identifiant de clé du jeton ; elle rattache la clé
     au pseudo une fois pour toutes (supabase/progression.sql).
   · Fusion élément par élément, jamais d'écrasement global :
       d  leçon validée            → union
       b  meilleur score           → le meilleur
       l  dernière leçon vue       → la plus récente
       p  planning d'une question  → le plus récent
       r  réponse donnée           → union sans doublon
       x  XP gagnés par un appareil → total = somme des appareils
       z  remise à zéro            → efface ce qui la précède
   · Échanges incrémentaux : on ne tire que ce qui a changé depuis la
     dernière fois (curseur rev), on ne pousse que ce que la base ne
     connaît pas encore (empreintes « sig »).
   Chargé par ui.js quand progress.js est présent.
   ════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  const RPC = 'https://vrlvtcydgdyrcljfgasg.supabase.co/rest/v1/rpc/';
  const CLE_PUB = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
  const K_ETAT = 'm1_synchro';
  const LOT = 500, PAGE = 1000, MAX_PAGES = 30;
  const PAS_MIN = 60*1000;                 // pas plus d'un aller-retour par minute
  const MAX_REPONSES = 4000;               // comme progress.js
  const SUJET = /^[a-z0-9-]{2,40}$/;

  /* ---------- état local de la synchro ---------- */
  function neuf(){
    const a = new Uint8Array(8);
    try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<8;i++) a[i] = Math.random()*256|0; }
    return {dev:Array.from(a, b=>b.toString(16).padStart(2,'0')).join(''), rev:0, sig:{}, xp:{}, zt:{}};
  }
  function lireEtat(){
    try{
      const o = JSON.parse(localStorage.getItem(K_ETAT) || 'null');
      if(o && o.dev){ o.sig = o.sig || {}; o.xp = o.xp || {}; o.zt = o.zt || {}; o.rev = o.rev || 0; return o; }
    }catch(e){}
    return neuf();
  }
  function ecrireEtat(e){ try{ localStorage.setItem(K_ETAT, JSON.stringify(e)); }catch(err){} }

  /* ---------- outils de fusion (purs : testables sans réseau) ---------- */
  function bloc(doc, m){
    if(!doc.mat[m]) doc.mat[m] = {done:{}, xp:0, best:{}, last:null, vu:null};
    const b = doc.mat[m]; b.done = b.done || {}; b.best = b.best || {};
    return b;
  }
  const ratio = s => s && s.total ? s.correct/s.total : 0;
  const matiereDe = k => k.split(':')[1];
  /* la clé k appartient-elle à la portée d'une remise à zéro (une matière ou « * ») ? */
  const dansPortee = (k, portee) => k[0] !== 'z' && (portee === '*' || matiereDe(k) === portee);

  /* Gains d'XP faits sur cet appareil depuis la dernière synchro :
     ils s'ajoutent à la part de l'appareil (compteur par appareil,
     jamais compté deux fois). */
  function absorberXp(doc, etat){
    Object.keys(doc.mat || {}).forEach(m=>{
      if(!SUJET.test(m)) return;
      const x = etat.xp[m] = etat.xp[m] || {c:0, base:0, autres:{}};
      const gain = (doc.mat[m].xp || 0) - x.base;
      if(gain) x.c = Math.max(0, x.c + gain);
      x.base = doc.mat[m].xp || 0;
    });
  }
  /* XP affichés = part de cet appareil + parts des autres */
  function recompterXp(doc, etat){
    Object.keys(etat.xp).forEach(m=>{
      const x = etat.xp[m];
      const total = x.c + Object.values(x.autres || {}).reduce((a, n)=>a + (n || 0), 0);
      if(total || doc.mat[m]) bloc(doc, m).xp = total;
      x.base = total;
    });
  }

  /* Ce que l'appareil sait, découpé en éléments {k, v, s} :
     s sert d'arbitre (plus grand = gagne) pour b, l, p, x. */
  function elements(doc, etat){
    const els = [];
    Object.keys(doc.mat || {}).forEach(m=>{
      if(!SUJET.test(m)) return;
      const b = doc.mat[m];
      Object.keys(b.done || {}).forEach(l=>{ if(b.done[l]) els.push({k:'d:'+m+':'+l, v:1, s:0}); });
      Object.keys(b.best || {}).forEach(mode=>{
        const s = b.best[mode]; if(!s || !s.total) return;
        els.push({k:'b:'+m+':'+mode, v:{c:s.correct, n:s.total, t:s.ts||0}, s:ratio(s)});
      });
      if(b.last != null) els.push({k:'l:'+m, v:{l:b.last, t:b.vu||0}, s:b.vu||0});
      const x = etat.xp[m];
      if(x && x.c > 0) els.push({k:'x:'+m+':'+etat.dev, v:x.c, s:x.c});
    });
    const pl = doc.plan || {};
    Object.keys(pl).forEach(q=>{
      if(!SUJET.test(q.split(':')[0]) || !pl[q]) return;
      els.push({k:'p:'+q, v:pl[q], s:pl[q].maj||0});
    });
    (doc.rep || []).forEach(r=>{
      if(!r || !SUJET.test(r.m || '') || !r.t) return;
      els.push({k:'r:'+r.m+':'+r.t+':'+r.k, v:{ok:r.ok?1:0, c:r.c||''}, s:r.t});
    });
    return els.filter(e=>e.k.length <= 200);
  }
  /* à envoyer : ce que la base n'a pas, ou a en moins bien */
  function aPousser(els, etat){
    return els.filter(e=>!(e.k in etat.sig) || e.s > etat.sig[e.k]);
  }

  /* Remise à zéro reçue d'un autre appareil : on oublie ce qui la précède. */
  function effacerLocal(doc, etat, portee, t){
    const vise = m => portee === '*' || m === portee;
    Object.keys(doc.mat).forEach(m=>{
      if(!vise(m)) return;
      const b = doc.mat[m];
      const best = {};
      Object.keys(b.best || {}).forEach(k=>{ if((b.best[k].ts||0) > t) best[k] = b.best[k]; });
      doc.mat[m] = {done:{}, xp:0, best, last:(b.vu||0) > t ? b.last : null, vu:(b.vu||0) > t ? b.vu : null};
    });
    doc.rep = (doc.rep || []).filter(r=>!vise(r.m) || r.t > t);
    const pl = doc.plan || {};
    Object.keys(pl).forEach(q=>{ if(vise(q.split(':')[0]) && !((pl[q].maj||0) > t)) delete pl[q]; });
    Object.keys(etat.xp).forEach(m=>{ if(vise(m)) etat.xp[m] = {c:0, base:0, autres:{}}; });
    Object.keys(etat.sig).forEach(k=>{ if(dansPortee(k, portee)) delete etat.sig[k]; });
    etat.zt[portee] = Math.max(etat.zt[portee] || 0, t);
  }

  /* Applique à la progression locale ce que la base renvoie.
     Renvoie true si quelque chose a changé à l'écran. */
  function appliquer(doc, etat, lignes){
    doc.mat = doc.mat || {}; doc.rep = doc.rep || []; doc.plan = doc.plan || {};
    const vues = new Set(doc.rep.map(r=>r.m+':'+r.t+':'+r.k));
    let change = false;
    lignes.forEach(row=>{
      const k = String(row.k || ''), v = row.v, s = +row.s || 0;
      const p = k.split(':'), type = p[0], m = p[1];
      if(type === 'z'){
        if((etat.zt[m] || 0) < s){ effacerLocal(doc, etat, m, s); vues.clear(); doc.rep.forEach(r=>vues.add(r.m+':'+r.t+':'+r.k)); change = true; }
        return;
      }
      if(!SUJET.test(m || '')) return;
      if(type === 'd'){
        const l = p.slice(2).join(':'), b = bloc(doc, m);
        if(!b.done[l]){ b.done[l] = true; change = true; }
      }else if(type === 'b'){
        const mode = p.slice(2).join(':'), b = bloc(doc, m), loc = b.best[mode];
        if(v && v.n && (!loc || v.c/v.n > ratio(loc))){ b.best[mode] = {correct:v.c, total:v.n, ts:v.t||0}; change = true; }
      }else if(type === 'l'){
        const b = bloc(doc, m);
        if(v && (v.t||0) > (b.vu||0)){ b.last = v.l; b.vu = v.t; change = true; }
      }else if(type === 'p'){
        const q = p.slice(1).join(':'), loc = doc.plan[q];
        if(v && (!loc || (v.maj||0) > (loc.maj||0))){ doc.plan[q] = v; change = true; }
      }else if(type === 'r'){
        const t = +p[2], cle = p.slice(3).join(':'), id = m+':'+t+':'+cle;
        if(t && !vues.has(id)){ vues.add(id); doc.rep.push({m, k:cle, ok:!!(v && v.ok), c:(v && v.c)||'', t}); change = true; }
      }else if(type === 'x'){
        const dev = p[2]; if(dev === etat.dev) return;
        const x = etat.xp[m] = etat.xp[m] || {c:0, base:bloc(doc, m).xp||0, autres:{}};
        x.autres = x.autres || {};
        if((+v||0) > (x.autres[dev]||0)){ x.autres[dev] = +v; change = true; }
      }else return;
      if(!(k in etat.sig) || s > etat.sig[k]) etat.sig[k] = s;
    });
    if(change){
      doc.rep.sort((a, b)=>a.t - b.t);
      if(doc.rep.length > MAX_REPONSES) doc.rep = doc.rep.slice(-MAX_REPONSES);
    }
    return change;
  }

  /* ---------- réseau ---------- */
  const lireJSON = (k, d)=>{ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(e){ return d; } };
  /* même jeton que chat.js et le suivi (localStorage « chat_jeton ») */
  async function jeton(neuf){
    let pseudo = null; try{ pseudo = localStorage.getItem('lb_name'); }catch(e){}
    if(!pseudo || !pseudo.trim()) return null;
    const j = lireJSON('chat_jeton', null);
    if(!neuf && j && j.jeton && j.p === pseudo && j.exp - Date.now()/1000 > 3*86400) return j.jeton;
    const r = await fetch('/.netlify/functions/acces-jeton', {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({pseudo})}).catch(()=>null);
    if(!r || !r.ok) return null;
    const d = await r.json().catch(()=>({}));
    if(!d.jeton) return null;
    try{ localStorage.setItem('chat_jeton', JSON.stringify({jeton:d.jeton, exp:d.exp, p:pseudo})); }catch(e){}
    return d.jeton;
  }
  let refuse = false;
  async function rpc(nom, args, keepalive){
    for(let essai = 0; essai < 2; essai++){
      const j = await jeton(essai > 0); if(!j) throw new Error('jeton');
      const r = await fetch(RPC+nom, {method:'POST', keepalive:!!keepalive,
        headers:{apikey:CLE_PUB, Authorization:'Bearer '+j, 'Content-Type':'application/json'},
        body:JSON.stringify(args)});
      if(r.status === 401 && essai === 0) continue;              // jeton expiré : on en redemande un
      if(r.status === 403 || r.status === 401){ refuse = true; throw new Error('refusé'); }
      if(!r.ok) throw new Error('Supabase '+r.status);
      const t = await r.text();
      return t ? JSON.parse(t) : null;
    }
  }

  /* ---------- un aller-retour complet ---------- */
  let enCours = null, dernier = 0;
  async function synchroniser(opts){
    opts = opts || {};
    if(refuse || !navigator.onLine || !P.disponible()) return false;
    if(enCours) return enCours;
    if(!opts.force && Date.now() - dernier < PAS_MIN) return false;
    dernier = Date.now();
    enCours = (async ()=>{
      let etat = lireEtat();
      /* 1. remises à zéro faites ici, pas encore transmises */
      const raz = (P._lire().raz) || {};
      for(const portee of Object.keys(raz)){
        const t = raz[portee];
        if((etat.zt[portee] || 0) >= t || !(portee === '*' || SUJET.test(portee))) continue;
        await rpc('progression_effacer', {p_portee:portee, p_t:t, p_dev:etat.dev});
        etat = lireEtat();
        Object.keys(etat.xp).forEach(m=>{ if(portee === '*' || m === portee) etat.xp[m] = {c:0, base:0, autres:{}}; });
        Object.keys(etat.sig).forEach(k=>{ if(dansPortee(k, portee)) delete etat.sig[k]; });
        etat.zt[portee] = t;
        ecrireEtat(etat);
      }
      /* 2. tirer ce qui a changé ailleurs */
      let lignes = [], rev = etat.rev;
      if(!opts.pousserSeulement){
        for(let i = 0; i < MAX_PAGES; i++){
          const res = await rpc('progression_tirer', {p_depuis:rev, p_dev:etat.dev, p_limite:PAGE}) || [];
          res.forEach(r=>{ if(r.rev > rev) rev = r.rev; });
          lignes = lignes.concat(res);
          if(res.length < PAGE) break;
        }
      }
      /* 3. fusionner, d'un seul geste (sans attente : la page ne peut pas écrire entre-temps) */
      etat = lireEtat();
      const doc = P._lire();
      absorberXp(doc, etat);
      const change = appliquer(doc, etat, lignes);
      recompterXp(doc, etat);
      etat.rev = Math.max(etat.rev, rev);
      P._ecrire(doc);
      ecrireEtat(etat);
      if(change){ try{ window.dispatchEvent(new CustomEvent('m1progression')); }catch(e){} }
      /* 4. pousser ce que la base ne connaît pas encore */
      const els = elements(doc, etat), envoi = aPousser(els, etat);
      const taille = opts.pousserSeulement ? 120 : LOT;     // keepalive : 64 Ko au plus par envoi
      for(let i = 0; i < envoi.length; i += taille){
        const lot = envoi.slice(i, i + taille);
        await rpc('progression_pousser', {p_elements:lot, p_dev:etat.dev}, opts.pousserSeulement);
        const e2 = lireEtat();
        lot.forEach(x=>{ if(!(x.k in e2.sig) || x.s > e2.sig[x.k]) e2.sig[x.k] = x.s; });
        ecrireEtat(e2);
      }
      /* 5. on oublie les empreintes d'éléments disparus (réponses élaguées) */
      const e3 = lireEtat(), garde = {};
      els.forEach(x=>{ if(x.k in e3.sig) garde[x.k] = e3.sig[x.k]; });
      e3.sig = garde; e3.ok = Date.now();
      ecrireEtat(e3);
      return true;
    })().catch(e=>{ console.warn('[synchro]', e.message); return false; })
      .finally(()=>{ enCours = null; });
    return enCours;
  }

  /* ---------- quand synchroniser ---------- */
  function demarrer(){
    if(!window.fetch || !P.disponible()) return;
    synchroniser({force:true});
    setInterval(()=>{ if(document.visibilityState === 'visible') synchroniser(); }, 5*60*1000);
    document.addEventListener('visibilitychange', ()=>{
      if(document.visibilityState === 'visible') synchroniser();
      else synchroniser({force:true, pousserSeulement:true});    // on part : on envoie ce qui reste
    });
    addEventListener('online', ()=>synchroniser({force:true}));
  }

  window.M1Synchro = {synchroniser, derniere:()=>lireEtat().ok || null,
    _fusion:{elements, aPousser, appliquer, absorberXp, recompterXp, effacerLocal, neuf}};
  if(window.P && P._lire && !window.M1SYNCHRO_TEST) demarrer();
})();
