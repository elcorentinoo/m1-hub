/* ════════════════════════════════════════════════════════════
   bequick.js — le mode BeQuick (6.0.0 « Ducat »)
   Chaque soir à 18 h 30 (heure de Paris), la même série de 30
   questions pour toute la promo : 20 minutes, une seule chance,
   fermeture à 22 h 00. Une bonne réponse rapporte de 500 points
   (immédiate) à 250 points (40 secondes ou plus).

   Dépend de : calendrier.js (dates de partiels), banque.js (les
   questions), lb.js (projet Supabase et pseudo). Si lb.js manque,
   il est chargé à la demande.

   Côté Supabase (voir supabase/bequick.sql) :
     bequick_jours     la série du jour, figée par le premier joueur
     bequick_parties   une ligne par joueur et par jour ; le serveur
                       horodate le départ et refuse toute réponse
                       après 20 minutes ou hors de 18 h 30 – 22 h 00
     push_abonnements  les téléphones qui reçoivent l'alerte
   ════════════════════════════════════════════════════════════ */
(function(){
  const NOM = 'BeQuick';
  const OUVERTURE = 18*60+30, FERMETURE = 22*60;      // minutes depuis minuit, Paris
  const DUREE = 20*60*1000, NB_Q = 30;
  const PTS_MAX = 500, PTS_MIN = 250, T_REF = 40;     // secondes pour tomber à 250
  /* clé publique d'envoi des notifications (la clé privée est chez Netlify) */
  const CLE_PUSH = 'BGudFKvHrz5uqtu2wW2HlNTfMgpuAvXR-E0EacuHaqb-9WSJV7oLdBxpwTc7EOtx2Ffn3JdBjPr0BcqVw8T8tzA';
  const PREMIER_JOUR = '2026-10-17';                  // lancement de BeQuick

  /* ---------- heure de Paris ---------- */
  const FMT = new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  function paris(t){
    const o = {}; FMT.formatToParts(new Date(t)).forEach(p=>{ o[p.type] = p.value; });
    return {y:+o.year, mo:+o.month, d:+o.day, h:+o.hour, mi:+o.minute, s:+o.second,
            jour:o.year+'-'+o.month+'-'+o.day, min:(+o.hour)*60+(+o.minute)};
  }
  let decalage = 0;                                   // horloge du serveur − horloge locale
  function maintenant(){ return Date.now() + decalage; }
  function jourDe(t){ return paris(t==null ? maintenant() : t).jour; }
  /* l'instant UTC d'une heure de Paris donnée (gère l'heure d'été) */
  function instant(jour, minutes){
    const [y,mo,d] = jour.split('-').map(Number);
    let g = Date.UTC(y, mo-1, d, Math.floor(minutes/60), minutes%60);
    for(let i=0;i<2;i++){
      const p = paris(g);
      const vu = Date.UTC(p.y, p.mo-1, p.d, p.h, p.mi);
      g += Date.UTC(y, mo-1, d, Math.floor(minutes/60), minutes%60) - vu;
    }
    return g;
  }
  function ouverture(jour){ return instant(jour||jourDe(), OUVERTURE); }
  function fermeture(jour){ return instant(jour||jourDe(), FERMETURE); }
  /* 'avant' · 'ouvert' · 'ferme' */
  function phase(t){
    const m = paris(t==null ? maintenant() : t).min;
    return m < OUVERTURE ? 'avant' : (m < FERMETURE ? 'ouvert' : 'ferme');
  }
  function decaleJour(jour, n){
    const [y,mo,d] = jour.split('-').map(Number);
    const t = new Date(Date.UTC(y, mo-1, d+n, 12));
    return t.toISOString().slice(0,10);
  }

  /* ---------- points ---------- */
  function points(juste, secondes){
    if(!juste) return 0;
    return Math.round(PTS_MAX - (PTS_MAX-PTS_MIN)*Math.min(1, Math.max(0, secondes)/T_REF));
  }

  /* ---------- tirage du jour ----------
     1 ou 2 matières, plus souvent celles dont le partiel approche ;
     une matière dont le partiel est passé n'est plus tirée. Le tirage
     ne dépend que de la date : tout le monde obtient le même, et le
     premier joueur le fige sur le serveur (bequick_jours). */
  function graine(txt){ let h = 1779033703 ^ txt.length; for(let i=0;i<txt.length;i++){ h = Math.imul(h ^ txt.charCodeAt(i), 3432918353); h = h<<13 | h>>>19; } return h>>>0; }
  function hasard(seed){ let s = seed>>>0; return ()=>{ s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s>>>15, 1 | s); t = t + Math.imul(t ^ t>>>7, 61 | t) ^ t; return ((t ^ t>>>14)>>>0)/4294967296; }; }
  function poidsMatieres(jour){
    const t = instant(jour, OUVERTURE), ech = window.ECHEANCES || [];
    const sids = [...new Set((window.BANQUE||[]).map(q=>q.m))].sort();
    const out = [];
    sids.forEach(sid=>{
      const e = ech.filter(x=>x.sid===sid);
      if(e.length && e.every(x=>x.end + 10*3600e3 < t)) return;        // partiel passé
      const futur = e.filter(x=>x.end + 10*3600e3 >= t).map(x=>(x.end-t)/864e5);
      const j = futur.length ? Math.min(...futur) : null;
      out.push({sid, poids: j==null ? 1 : 1 + 3*Math.max(0, 1 - j/30), jours:j});
    });
    return out;
  }
  function tirage(jour){
    const r = hasard(graine(NOM+jour));
    let pool = poidsMatieres(jour);
    const nb = pool.length >= 2 && r() < 0.5 ? 2 : 1, choisies = [];
    for(let k=0;k<nb && pool.length;k++){
      const tot = pool.reduce((a,x)=>a+x.poids,0); let v = r()*tot, i = 0;
      while(i < pool.length-1 && v >= pool[i].poids){ v -= pool[i].poids; i++; }
      choisies.push(pool[i].sid); pool = pool.filter((_,j)=>j!==i);
    }
    const melange = arr=>{ const a = arr.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(r()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; };
    const parMat = choisies.map(sid=>melange((window.BANQUE||[]).filter(q=>q.m===sid && (q.type==='qcm'||q.type==='num')).map(q=>q.id)));
    const ids = [];
    const part = Math.ceil(NB_Q/Math.max(1,parMat.length));
    parMat.forEach(l=>ids.push(...l.slice(0, part)));
    parMat.forEach(l=>l.slice(part).forEach(id=>{ if(ids.length < NB_Q) ids.push(id); }));
    return {matieres:choisies, ids:melange(ids.slice(0, NB_Q))};
  }
  function questions(ids){
    const index = {}; (window.BANQUE||[]).forEach(q=>{ index[q.id] = q; });
    return ids.map(id=>index[id]).filter(Boolean);
  }

  /* ---------- accès Supabase ---------- */
  function chargerLB(){
    if(window.LB && typeof SUPA !== 'undefined') return Promise.resolve();
    return new Promise(ok=>{ const s = document.createElement('script'); s.src = 'lb.js'; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  }
  function cfg(){ return (typeof SUPA !== 'undefined') ? SUPA : null; }
  async function api(chemin, opts){
    await chargerLB();
    const c = cfg(); if(!c) throw new Error('Supabase non configuré');
    opts = opts || {};
    const h = Object.assign({'apikey':c.key, 'Authorization':'Bearer '+c.key}, opts.body ? {'Content-Type':'application/json'} : {}, opts.headers||{});
    const r = await fetch(c.url+'/rest/v1/'+chemin, {method:opts.method||'GET', headers:h, body:opts.body ? JSON.stringify(opts.body) : undefined, keepalive:!!opts.keepalive});
    const txt = await r.text();
    let data = null; try{ data = txt ? JSON.parse(txt) : null; }catch(e){}
    if(!r.ok){ const err = new Error((data && (data.message || data.hint)) || ('HTTP '+r.status)); err.status = r.status; err.data = data; throw err; }
    return data;
  }
  function pseudo(){ return (window.LB && LB.pseudo()) || null; }
  function cle(p){ return String(p||'').trim().toLowerCase(); }
  function enc(v){ return encodeURIComponent(v); }

  /* la série du jour : celle du serveur si elle existe, sinon on la fige */
  async function serie(jour, figer){
    try{
      let l = await api('bequick_jours?jour=eq.'+jour+'&select=ids,matieres');
      if((!l || !l.length) && figer){
        const t = tirage(jour);
        await api('bequick_jours', {method:'POST', headers:{'Prefer':'resolution=ignore-duplicates,return=minimal'},
          body:{jour, ids:t.ids.join(','), matieres:t.matieres.join(',')}}).catch(()=>{});
        l = await api('bequick_jours?jour=eq.'+jour+'&select=ids,matieres');
      }
      if(l && l.length) return {ids:String(l[0].ids).split(',').filter(Boolean), matieres:String(l[0].matieres||'').split(',').filter(Boolean), serveur:true};
    }catch(e){}
    const t = tirage(jour); return Object.assign(t, {serveur:false});
  }
  async function maPartie(jour){
    const p = pseudo(); if(!p) return null;
    const l = await api('bequick_parties?jour=eq.'+jour+'&pseudo_cle=eq.'+enc(cle(p))+'&select=*');
    return (l && l[0]) || null;
  }
  /* départ : le serveur horodate ; une seconde tentative est refusée */
  async function demarrer(){
    const p = pseudo(); if(!p) throw new Error('Choisis d\'abord un pseudo.');
    const avant = Date.now();
    const l = await api('bequick_parties', {method:'POST', headers:{'Prefer':'return=representation'},
      body:{jour:jourDe(), pseudo:p, pseudo_cle:cle(p)}});
    const ligne = l && l[0];
    if(ligne && ligne.debut) decalage = Date.parse(ligne.debut) - Math.round((avant + Date.now())/2);
    return ligne;
  }
  function envoyer(id, champs, keepalive){
    return api('bequick_parties?id=eq.'+id, {method:'PATCH', headers:{'Prefer':'return=minimal'}, body:champs, keepalive});
  }
  async function classement(jour){
    const l = await api('bequick_parties?jour=eq.'+jour+'&select=pseudo,pseudo_cle,score,bonnes,repondues,debut&order=score.desc,bonnes.desc,debut.asc');
    return l || [];
  }
  async function toutes(){
    return (await api('bequick_parties?select=pseudo,pseudo_cle,score,bonnes,repondues,jour&limit=20000')) || [];
  }
  function general(lignes){
    const u = {};
    lignes.forEach(r=>{
      const k = r.pseudo_cle || cle(r.pseudo);
      if(!u[k]) u[k] = {pseudo:r.pseudo, total:0, jours:0, bonnes:0, repondues:0, meilleur:0};
      const o = u[k]; o.total += r.score|0; o.jours++; o.bonnes += r.bonnes|0; o.repondues += r.repondues|0; o.meilleur = Math.max(o.meilleur, r.score|0);
    });
    return Object.values(u).sort((a,b)=> b.total-a.total || b.meilleur-a.meilleur || a.pseudo.localeCompare(b.pseudo,'fr'));
  }

  /* ---------- mémoire locale ---------- */
  function lireLocal(jour){ try{ return JSON.parse(localStorage.getItem('bq_'+jour) || 'null'); }catch(e){ return null; } }
  function ecrireLocal(jour, o){ try{ localStorage.setItem('bq_'+jour, JSON.stringify(o)); }catch(e){} }

  /* ---------- notifications sur le téléphone ---------- */
  function b64(u){ const p = '='.repeat((4 - u.length % 4) % 4); const s = atob((u + p).replace(/-/g,'+').replace(/_/g,'/')); return Uint8Array.from(s, c=>c.charCodeAt(0)); }
  function versB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function pushPossible(){ return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function estIOS(){ return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function installe(){ return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  async function etatPush(){
    if(!pushPossible()) return estIOS() && !installe() ? 'ios' : 'impossible';
    if(Notification.permission === 'denied') return 'refuse';
    try{
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return sub ? 'actif' : 'inactif';
    }catch(e){ return 'inactif'; }
  }
  async function activerPush(){
    const perm = await Notification.requestPermission();
    if(perm !== 'granted') throw new Error('Notifications refusées dans les réglages du navigateur.');
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if(!sub) sub = await reg.pushManager.subscribe({userVisibleOnly:true, applicationServerKey:b64(CLE_PUSH)});
    const j = sub.toJSON();
    let inscrit = true;
    try{
      await api('push_abonnements', {method:'POST', headers:{'Prefer':'resolution=merge-duplicates,return=minimal'},
        body:{endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth, pseudo:pseudo()}});
    }catch(e){ inscrit = false; }          // base pas encore prête : le test part quand même
    const t = await testerPush(j);
    return inscrit ? t : t+'-noninscrit';
  }
  /* Notification de test : une minute après l'activation (fonction Netlify
     en arrière-plan) ; si ce n'est pas possible, tout de suite.
     Renvoie 'minute', 'immediat' ou 'echec'. */
  async function testerPush(j){
    const corps = JSON.stringify({endpoint:j.endpoint, p256dh:j.keys.p256dh, auth:j.keys.auth});
    try{
      const r = await fetch('/.netlify/functions/push-test-background', {method:'POST', headers:{'Content-Type':'application/json'}, body:corps});
      if(r.status === 202) return 'minute';
    }catch(e){}
    try{
      const r = await fetch('/.netlify/functions/push-test', {method:'POST', headers:{'Content-Type':'application/json'}, body:corps});
      if(r.ok) return 'immediat';
    }catch(e){}
    return 'echec';
  }
  const MSG_TEST = {
    minute:"✓ Alerte activée. Une notification de test arrive dans une minute : tu peux fermer l'appli pour vérifier.",
    immediat:"✓ Alerte activée. Une notification de test vient d'être envoyée.",
    echec:"✓ Alerte activée, mais la notification de test n'a pas pu partir. L'alerte de 18 h 30 reste programmée."
  };
  const NON_INSCRIT = " Attention : ton appareil n'a pas pu être inscrit pour l'alerte de 18 h 30, car la base de données BeQuick n'est pas encore prête.";
  ['minute','immediat','echec'].forEach(k=>{ MSG_TEST[k+'-noninscrit'] = MSG_TEST[k].replace(" L'alerte de 18 h 30 reste programmée.", '') + NON_INSCRIT; });
  async function desactiverPush(){
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if(sub){ const e = sub.endpoint; await sub.unsubscribe(); await api('rpc/push_oublier', {method:'POST', body:{e}}).catch(()=>{}); }
  }

  /* ---------- la cloche : ce qui mérite d'être signalé ----------
     Calculé sur l'appareil, sans serveur. Chaque alerte a un
     identifiant : une fois vue, elle ne compte plus dans la pastille. */
  function alertes(){
    const out = [], t = maintenant(), j = jourDe(t), ph = phase(t), loc = lireLocal(j);
    if(ph === 'ouvert' && !loc) out.push({id:'bq-'+j, ico:'⚡', titre:NOM+" est ouvert jusqu'à 22 h", texte:"30 questions, 20 minutes, une seule chance. Toute la promo joue la même série.", url:'bequick.html', fort:true});
    if(ph === 'ouvert' && loc && loc.fini) out.push({id:'bq-res-'+j, ico:'🏆', titre:"Ton "+NOM+" du jour : "+(loc.score||0).toLocaleString('fr-FR')+" points", texte:"Le classement du jour se complète jusqu'à 22 h 20.", url:'bequick.html#classement'});
    if(ph === 'avant'){ const m = OUVERTURE - paris(t).min; if(m <= 60) out.push({id:'bq-bientot-'+j, ico:'⏳', titre:NOM+" ouvre dans "+m+" min", texte:"Rendez-vous à 18 h 30.", url:'bequick.html'}); }
    (window.ECHEANCES||[]).forEach(e=>{
      const n = Math.ceil((e.end - t)/864e5);
      if(n >= 0 && n <= 7 && !e.provisoire) out.push({id:'partiel-'+e.sid+'-'+n, ico:'📅', titre:(n===0?"Partiel aujourd'hui : ":n===1?"Partiel demain : ":"Partiel dans "+n+" jours : ")+e.titre, texte:e.format, url:e.matiere});
    });
    try{
      if(window.P && P.aReviser && window.BANQUE){
        const a = P.aReviser(window.BANQUE.map(q=>q.id));
        if(a.dus.length) out.push({id:'revision-'+j, ico:'🔁', titre:a.dus.length+" question"+(a.dus.length>1?'s':'')+" à réviser aujourd'hui", texte:"Ta révision espacée du jour.", url:'revision.html'});
      }
    }catch(e){}
    return out;
  }

  window.BQ = {NOM, OUVERTURE, FERMETURE, DUREE, NB_Q, PTS_MAX, PTS_MIN, T_REF, PREMIER_JOUR,
    paris, maintenant, jourDe, instant, ouverture, fermeture, phase, decaleJour, points,
    tirage, poidsMatieres, questions, serie, maPartie, demarrer, envoyer, classement, toutes, general,
    lireLocal, ecrireLocal, pseudo, cle, api, MSG_TEST,
    pushPossible, estIOS, installe, etatPush, activerPush, desactiverPush, alertes};
})();
