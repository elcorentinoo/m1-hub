/* ════════════════════════════════════════════════════════════
   progress.js — mémoire de progression du site A+
   · leçons validées, XP, meilleurs scores, dernière leçon vue
   · historique des réponses (socle des stats et de la révision
     espacée)
   Tout est stocké sur l'appareil ; synchro.js la partage ensuite
   entre les appareils du même pseudo quand le réseau est là.
   La matière est identifiée par l'attribut subject-id du <html>.
   ════════════════════════════════════════════════════════════ */
window.P = (function(){
  const CLE = 'm1_progress_v1';
  const MAX_REPONSES = 4000;         // au-delà, on élague les plus anciennes

  const MATIERES = {
    'marche-particuliers':{lab:'Marché des Particuliers', f:'marche_des_particuliers.html', ico:'🏦'},
    'produits-derives'   :{lab:'Produits Dérivés I',      f:'produits_derives.html',        ico:'💱'},
    'produits-derives-2' :{lab:'Produits Dérivés II',     f:'produits_derives_2.html',      ico:'⏳'},
    'marketing-numerique':{lab:'Marketing Numérique',     f:'marketing_numerique.html',     ico:'📊'},
    'es-banque'          :{lab:'ES Banque',              f:'es_banque.html',               ico:'🏛️'},
    'fiscalite-particulier':{lab:'Fiscalité du Particulier', f:'fiscalite_particulier.html', ico:'§'},
    'droits-particuliers':{lab:'Droits des Particuliers', f:'droits_particuliers.html',     ico:'⚖'},
    'etudes-marche'      :{lab:'Études de marché',       f:'etudes_de_marche.html',        ico:'👤'},
    'systeme-bancaire'   :{lab:'Le système bancaire français', f:'systeme_bancaire.html', ico:'🏦'}
  };

  /* ---------- lecture / écriture ---------- */
  function vide(){ return {mat:{}, rep:[], maj:null}; }
  function lire(){
    try{
      const raw = localStorage.getItem(CLE);
      if(!raw) return vide();
      const o = JSON.parse(raw);
      if(!o || typeof o!=='object') return vide();
      o.mat = o.mat || {}; o.rep = o.rep || [];
      return o;
    }catch(e){ return vide(); }
  }
  function ecrire(o){
    try{
      o.maj = Date.now();
      if(o.rep.length > MAX_REPONSES) o.rep = o.rep.slice(-MAX_REPONSES);
      localStorage.setItem(CLE, JSON.stringify(o));
      return true;
    }catch(e){ return false; }   // quota plein ou stockage refusé : on continue sans planter
  }

  function idMatiere(){
    return document.documentElement.getAttribute('subject-id') || null;
  }
  function bloc(o, id){
    if(!o.mat[id]) o.mat[id] = {done:{}, xp:0, best:{}, last:null, vu:null};
    return o.mat[id];
  }

  /* ---------- progression d'une matière ---------- */
  function etat(id){
    id = id || idMatiere();
    if(!id) return {done:{}, xp:0, best:{}, last:null};
    return bloc(lire(), id);
  }
  function marquerLecon(lecon, id){
    id = id || idMatiere(); if(!id) return;
    const o = lire(); const b = bloc(o,id);
    b.done[lecon] = true; b.vu = Date.now();
    ecrire(o);
  }
  function ajouterXp(n, id){
    id = id || idMatiere(); if(!id) return;
    const o = lire(); const b = bloc(o,id);
    b.xp = (b.xp||0) + n; b.vu = Date.now();
    ecrire(o);
  }
  function setXp(n, id){
    id = id || idMatiere(); if(!id) return;
    const o = lire(); const b = bloc(o,id);
    b.xp = n; b.vu = Date.now();
    ecrire(o);
  }
  function derniereLecon(lecon, id){
    id = id || idMatiere(); if(!id) return;
    const o = lire(); const b = bloc(o,id);
    b.last = lecon; b.vu = Date.now();
    ecrire(o);
  }
  function meilleurScore(mode, correct, total, id){
    id = id || idMatiere(); if(!id) return false;
    const o = lire(); const b = bloc(o,id);
    const ancien = b.best[mode];
    const mieux = !ancien || (correct/total) > (ancien.correct/ancien.total);
    if(mieux) b.best[mode] = {correct, total, ts:Date.now()};
    b.vu = Date.now();
    ecrire(o);
    return mieux;
  }

  /* ---------- historique des réponses ---------- */
  /* cle : identifiant stable de la question (matière + origine + rang) */
  function noterReponse(cle, ok, chap, id){
    id = id || idMatiere(); if(!id) return;
    const o = lire();
    o.rep.push({m:id, k:cle, ok:!!ok, c:chap||'', t:Date.now()});
    ecrire(o);
  }

  /* ---------- statistiques ---------- */
  function stats(){
    const o = lire();
    const parMatiere = {};
    Object.keys(MATIERES).forEach(id=>{
      const b = o.mat[id];
      const reps = o.rep.filter(r=>r.m===id);
      const justes = reps.filter(r=>r.ok).length;
      parMatiere[id] = {
        lab: MATIERES[id].lab, ico: MATIERES[id].ico, f: MATIERES[id].f,
        lecons: b ? Object.keys(b.done).length : 0,
        xp: b ? (b.xp||0) : 0,
        best: b ? (b.best||{}) : {},
        last: b ? b.last : null,
        vu: b ? b.vu : null,
        reponses: reps.length,
        justes,
        taux: reps.length ? justes/reps.length*100 : null
      };
    });
    // notions les plus ratées, tous cours confondus
    const parChap = {};
    o.rep.forEach(r=>{
      if(!r.c) return;
      const k = r.m+'§'+r.c;
      parChap[k] = parChap[k] || {m:r.m, chap:r.c, tot:0, ko:0};
      parChap[k].tot++;
      if(!r.ok) parChap[k].ko++;
    });
    const faiblesses = Object.values(parChap)
      .filter(c=>c.tot>=2 && c.ko>0)
      .map(c=>Object.assign(c,{taux:c.ko/c.tot*100, lab:(MATIERES[c.m]||{}).lab||c.m}))
      .sort((a,b)=>b.taux-a.taux || b.ko-a.ko);

    const total = o.rep.length, justes = o.rep.filter(r=>r.ok).length;
    return {
      parMatiere, faiblesses,
      global:{reponses:total, justes, taux: total? justes/total*100 : null,
              xp: Object.values(parMatiere).reduce((a,m)=>a+m.xp,0),
              lecons: Object.values(parMatiere).reduce((a,m)=>a+m.lecons,0)},
      maj:o.maj
    };
  }

  /* ---------- série de révision (jours consécutifs) ---------- */
  function serie(){
    const o = lire();
    if(!o.rep.length) return 0;
    const jours = new Set(o.rep.map(r=>new Date(r.t).toDateString()));
    let n = 0; const d = new Date();
    // on tolère que la série parte d'hier si rien n'a encore été fait aujourd'hui
    if(!jours.has(d.toDateString())) d.setDate(d.getDate()-1);
    while(jours.has(d.toDateString())){ n++; d.setDate(d.getDate()-1); }
    return n;
  }

  /* ---------- révision espacée ---------- */
  /* Paliers en jours : une réussite fait monter d'un cran, un échec
     ramène au premier. Inspiré de la répétition espacée classique. */
  const PALIERS = [1, 3, 7, 16, 35, 75];

  function planning(){
    const o = lire();
    return o.plan = o.plan || {};
  }
  function jour(ts){ return Math.floor(ts / 86400000); }

  /* Éléments à réviser aujourd'hui : jamais vus, ou dont l'échéance est atteinte */
  function aReviser(ids){
    const o = lire(); const pl = o.plan || {};
    const auj = jour(Date.now());
    const neufs = [], dus = [];
    ids.forEach(id=>{
      const p = pl[id];
      if(!p) neufs.push(id);
      else if(p.due <= auj) dus.push({id, retard: auj - p.due, niv: p.niv});
    });
    // les plus en retard d'abord, puis les paliers les plus bas
    dus.sort((a,b)=> b.retard - a.retard || a.niv - b.niv);
    return {dus: dus.map(d=>d.id), neufs};
  }

  /* 7.6.0 : « aide » = réussite obtenue après avoir ouvert le bouton Aide
     (Produits Dérivés I et II, révision). Elle compte comme « en cours » :
     pas de palier gagné (au plus le palier 1), retour dès le lendemain. */
  function planifier(id, reussi, aide){
    const o = lire();
    o.plan = o.plan || {};
    const p = o.plan[id] || {niv:0, vus:0, ko:0};
    const aidee = !!(reussi && aide);
    p.niv = aidee ? Math.min(p.niv, 1) : reussi ? Math.min(p.niv + 1, PALIERS.length) : 0;
    p.vus = (p.vus||0) + 1;
    if(!reussi) p.ko = (p.ko||0) + 1;
    if(aidee) p.aides = (p.aides||0) + 1;
    const delai = aidee ? PALIERS[0] : reussi ? PALIERS[Math.min(p.niv, PALIERS.length) - 1] : 0;
    p.due = jour(Date.now()) + (reussi ? delai : 0);   // raté → à revoir dès aujourd'hui
    p.maj = Date.now();
    o.plan[id] = p;
    ecrire(o);
    return p;
  }

  function etatPlan(id){
    const pl = (lire().plan)||{};
    return pl[id] || null;
  }

  /* Répartition pour le tableau de bord de révision */
  function bilanPlan(ids){
    const pl = (lire().plan)||{};
    const auj = jour(Date.now());
    let acquis=0, encours=0, aRevoir=0, neufs=0;
    ids.forEach(id=>{
      const p = pl[id];
      if(!p){ neufs++; return; }
      if(p.due <= auj) aRevoir++;
      else if(p.niv >= 4) acquis++;
      else encours++;
    });
    return {acquis, encours, aRevoir, neufs, total:ids.length};
  }

  /* ---------- remise à zéro ---------- */
  function reinitialiser(id){
    const o = lire();
    o.plan = o.plan || {};
    if(id){
      delete o.mat[id];
      o.rep = o.rep.filter(r=>r.m!==id);
      Object.keys(o.plan).forEach(k=>{ if(k.startsWith(id+':')) delete o.plan[k]; });
    } else { o.mat = {}; o.rep = []; o.plan = {}; }
    /* trace de la remise à zéro : synchro.js la transmet aux autres appareils */
    o.raz = o.raz || {}; o.raz[id || '*'] = Date.now();
    ecrire(o);
  }

  /* ---------- complétion d'une matière (0 → 100 %) ----------
     Leçons lues 50 % · mini-quiz réussis 25 % · test final 25 %
     (le test compte en entier dès 80 % de bonnes réponses). */
  const POIDS = {lecons:50, quiz:25, test:25};
  const SEUIL_TEST = 0.8;
  function completion(id, nbLecons){
    const o = lire(); const b = o.mat[id] || {done:{}, best:{}};
    const nL = Object.keys(b.done||{}).length;
    const totL = nbLecons || nL || 1;
    const banque = (window.BANQUE||[]).filter(q=>q.m===id && q.id.indexOf(':quiz:')>0);
    const totQ = banque.length;
    const reussis = new Set();
    o.rep.forEach(r=>{ if(r.m===id && r.ok && r.k.indexOf('quiz:')>-1) reussis.add(r.k.replace(id+':','')); });
    const nQ = banque.filter(q=>reussis.has(q.id.replace(id+':',''))).length;
    const bt = (b.best||{})['Test final'];
    const ratioT = bt ? bt.correct/bt.total : 0;
    const pL = Math.min(1, nL/totL), pQ = totQ ? nQ/totQ : pL, pT = Math.min(1, ratioT/SEUIL_TEST);
    const pct = Math.floor(pL*POIDS.lecons + pQ*POIDS.quiz + pT*POIDS.test + 1e-9);
    return {pct, lecons:{n:Math.min(nL,totL), tot:totL}, quiz:{n:nQ, tot:totQ},
            test:{fait:!!bt, pct:Math.round(ratioT*100), ok:ratioT>=SEUIL_TEST}};
  }

  function disponible(){
    try{ localStorage.setItem('__t','1'); localStorage.removeItem('__t'); return true; }
    catch(e){ return false; }
  }

  return {
    MATIERES, PALIERS, idMatiere, etat, marquerLecon, ajouterXp, setXp, derniereLecon,
    meilleurScore, noterReponse, completion, stats, serie, reinitialiser, disponible,
    aReviser, planifier, etatPlan, bilanPlan, planning,
    _lire: lire, _ecrire: ecrire
  };
})();
