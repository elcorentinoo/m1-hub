/* ════════════════════════════════════════════════════════════
   ui.js — socle commun du hub M1 MBAF
   · construit le bouton de navigation et le tiroir, sur toutes les pages
   · gère le thème : clair en journée, sombre à partir de 20 h,
     le choix manuel du jour prenant le dessus
   · permet d'ouvrir une leçon directement via une ancre (#l4)
   Chaque page doit contenir <span id="nav-slot"></span> dans sa barre.
   ════════════════════════════════════════════════════════════ */
(function(){

  /* ---------- 0. VERSION ---------- */
  /* Doit rester identique à VERSION en haut de sw.js. */
  const VERSION_APP = '6.0.1';
  const NOM_VERSION = 'Ducat';
  window.APP_VERSION = VERSION_APP;

  /* ---------- 1. THÈME ---------- */
  /* Le site est entièrement sombre depuis la 2.1.0 : plus de bascule,
     plus d'horaire. L'attribut est posé tout de suite pour éviter tout
     flash de page claire. */
  document.documentElement.setAttribute('data-theme','light');
  function appliquerTheme(){ document.documentElement.setAttribute('data-theme','light'); }
  function majBoutonsTheme(){}

  /* ---------- 2. STRUCTURE DU MENU ---------- */
  const PAGES = [
    {g:'hub', href:'index.html', ico:'🏠', t:'Hub', s:"L'accueil et tes matières", hub:true},
    {g:'Cours',    href:'marche_des_particuliers.html', ico:'🏦', t:'Marché des Particuliers', s:'11 leçons · test · mini-cas'},
    {g:'Cours',    href:'produits_derives.html',        ico:'💱', t:'Produits Dérivés I',      s:'15 leçons · comptant & terme'},
    {g:'Cours',    href:'marketing_numerique.html',     ico:'📊', t:'Marketing Numérique',      s:'11 leçons · parcours client · RGPD'},
    {g:'Cours',    href:'es_banque.html',              ico:'🏛️', t:'ES Banque',                s:'14 leçons · simulateur fiscal'},
    {g:'Cours',    href:'fiscalite_particulier.html',   ico:'§',  t:'Fiscalité du Particulier', s:"11 leçons · IR et foyer fiscal"},
    {g:'Cours',    href:'droits_particuliers.html',     ico:'⚖',  t:'Droits des Particuliers',  s:'10 leçons · droit des personnes'},
    {g:'Cours',    href:'etudes_de_marche.html',        ico:'👤', t:'Études de marché',          s:'12 leçons · quali, quanti, échantillon'},
    {g:'Entraînement', href:'bequick.html',              ico:'⚡', t:'BeQuick',                 s:'Le défi du soir · 18 h 30 – 22 h'},
    {g:'Entraînement', href:'entrainement_changes.html', ico:'🎯', t:'Marché des changes',      s:'13 notions · calculs ∞'},
    {g:'Entraînement', href:'entrainement_fiscal.html',  ico:'🧮', t:'Impôt sur le revenu',     s:'9 notions · parts et RNGI ∞'},
    {g:'Outils',   href:'ressourcerie.html', ico:'📚', t:'Ressourcerie',  s:'Documents partagés de la promo'},
    {g:'Outils',   href:'glossaire.html',    ico:'🔤', t:'Glossaire',     s:'Tous les sigles du Master'},
    {g:'Outils',   href:'revision.html',    ico:'🔁', t:'Révision du jour', s:'Entraînement espacé · flashcards'},
    {g:'Outils',   href:'stats.html',       ico:'📈', t:'Ma progression', s:'Où tu en es, ce qui coince'},
    {g:'Outils',   href:'classement.html',   ico:'🏆', t:'Classement',    s:'Qui révise le plus ?'}
  ];

  /* Les liens de l'en-tête : un sous-ensemble de PAGES, toujours dans cet ordre. */
  const ENTETE = [
    {href:'index.html',               t:'Hub'},
    {href:'#matieres',                t:'Mes cours', hubOnly:true},
    {href:'index.html#entrainement',  t:'Entraînement'},
    {href:'bequick.html',             t:'BeQuick'},
    {href:'revision.html',            t:'Révision'},
    {href:'ressourcerie.html',        t:'Ressourcerie'},
    {href:'glossaire.html',           t:'Glossaire'}
  ];

  function pageActuelle(){
    const f = location.pathname.split('/').pop() || 'index.html';
    return f === '' ? 'index.html' : f;
  }

  function construireTiroir(){
    if(document.getElementById('ui-drawer')) return;
    const ici = pageActuelle();

    const ov = document.createElement('div');
    ov.className = 'ui-ov'; ov.id = 'ui-ov';
    ov.onclick = fermer;

    const dr = document.createElement('nav');
    dr.className = 'ui-drawer'; dr.id = 'ui-drawer';
    dr.setAttribute('aria-label','Navigation du site');

    let html = '<div class="dh"><b>Navigation</b><button onclick="uiFermerMenu()" aria-label="Fermer">✕</button></div>';
    let groupe = null;
    PAGES.forEach(p=>{
      if(p.g !== groupe && p.g !== 'hub'){ html += '<h5>'+p.g+'</h5>'; groupe = p.g; }
      const actif = p.href === ici ? ' here' : '';
      const extra = p.hub ? ' ui-hub' : '';
      html += '<a class="ui-link'+extra+actif+'" href="'+p.href+'">'+
                '<span class="ei">'+p.ico+'</span>'+
                '<span class="et">'+p.t+'<span class="es">'+p.s+'</span></span>'+
              '</a>';
    });
    html += '<div class="ui-ver">M1 MBAF · v'+VERSION_APP+' « '+NOM_VERSION+' »</div>';
    dr.innerHTML = html;

    document.body.appendChild(ov);
    document.body.appendChild(dr);
    majBoutonsTheme();
  }

  function ouvrir(){
    construireTiroir();
    document.getElementById('ui-ov').classList.add('open');
    document.getElementById('ui-drawer').classList.add('open');
  }
  function fermer(){
    const o = document.getElementById('ui-ov'), d = document.getElementById('ui-drawer');
    if(o) o.classList.remove('open');
    if(d) d.classList.remove('open');
  }
  /* ---------- 3. INSERTION DANS LA BARRE DE CHAQUE PAGE ---------- */
  function icone(d, lab){
    return '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" focusable="false">'+d+'</svg>'+
           '<span class="sr">'+lab+'</span>';
  }
  const IC_RECH = '<circle cx="9" cy="9" r="5.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M13 13l4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
  const IC_MENU = '<path d="M3 5h14M3 10h14M3 15h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>';
  const IC_BURG = '<path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" fill="none"/>';

  /* ---------- 3. EN-TÊTE COMMUNE À TOUTES LES PAGES ----------
     On construit la même barre partout, puis on y déplace les widgets
     propres à la page (progression, XP, identité) et on masque son
     ancienne barre. Une seule navigation pour tout le site. */
  function construireEntete(){
    if(document.querySelector('.ds-header')) return;
    const ici = pageActuelle();
    const hub = ici === 'index.html';

    const h = document.createElement('header');
    h.className = 'ds-header';

    const liens = ENTETE.filter(l=>!l.hubOnly || hub).map(l=>{
      const actif = (l.href === ici) ? ' on' : '';
      return '<a class="ds-l'+actif+'" href="'+l.href+'">'+l.t+'</a>';
    }).join('');

    h.innerHTML =
      '<div class="ds-left verre">'+
        '<a class="ds-logo" href="index.html" aria-label="Accueil du hub"><span class="mk" aria-hidden="true"></span>M1<b>MBAF</b></a>'+
      '</div>'+
      '<nav class="ds-nav verre" aria-label="Navigation principale">'+liens+'</nav>'+
      '<div class="ds-acts verre">'+
        '<span class="ds-slot" id="ds-slot"></span>'+
        '<div class="ds-q" role="search">'+
          '<svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" focusable="false">'+IC_RECH+'</svg>'+
          '<input id="ds-q-in" type="search" placeholder="Rechercher" autocomplete="off" aria-label="Rechercher une leçon, un sigle, une page" aria-controls="ds-q-res" aria-expanded="false">'+
          '<div class="ds-q-res" id="ds-q-res" role="listbox" hidden></div>'+
        '</div>'+
        '<button class="ds-ic" id="ds-rech" title="Recherche (Ctrl+K)">'+icone(IC_RECH,'Rechercher')+'</button>'+
        '<button class="ds-ic ds-cloche" id="ds-cloche" aria-label="Notifications" aria-expanded="false" aria-controls="ds-notifs">'+ic('cloche')+'<span class="ds-pastille" id="ds-pastille" hidden></span></button>'+
        '<button class="ds-ic" id="ds-menu" aria-label="Ouvrir la navigation">'+icone(IC_MENU,'Menu')+'</button>'+
      '</div>';

    document.body.insertBefore(h, document.body.firstChild);
    document.getElementById('ds-rech').onclick = ouvrirRecherche;
    brancherRechercheEntete();
    document.getElementById('ds-menu').onclick = ouvrir;
    document.getElementById('ds-cloche').onclick = basculerNotifs;

    /* on récupère les widgets de la page : progression, XP, identité */
    const slot = document.getElementById('ds-slot');
    ['.progress-wrap', '.xp', '#lb-id-slot', '#hub-id'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(el && !slot.contains(el)) slot.appendChild(el);
    });

    /* l'ancienne barre de la page disparaît */
    document.querySelectorAll('.topbar, #topbar').forEach(b=>{ if(!b.classList.contains('ds-header')) b.classList.add('ds-gone'); });

    document.body.classList.add('ds-ready');
  }

  /* ---------- PIED DE PAGE COMMUN ---------- */
  function construirePied(){
    if(document.querySelector('.ds-foot')) return;
    if(document.querySelector('.sidebar')) return;      // pages de cours : elles ont déjà leur propre fin
    const f = document.createElement('footer');
    f.className = 'ds-foot';
    const liens = ENTETE.filter(l=>!l.hubOnly).map(l=>'<a href="'+l.href+'">'+l.t+'</a>').join('');
    f.innerHTML =
      '<a class="ds-logo" href="index.html"><span class="mk"></span>M1<b>MBAF</b></a>'+
      '<nav class="ds-fnav">'+liens+'</nav>'+
      '<div class="ds-fv">v'+VERSION_APP+' « '+NOM_VERSION+' »</div>'+
      '<div class="ds-credits">Photos <a href="https://unsplash.com/?utm_source=m1_mbaf&utm_medium=referral" rel="noopener">Unsplash</a> : '+
        CREDITS.map(c=>'<a href="https://unsplash.com/@'+c[1]+'?utm_source=m1_mbaf&utm_medium=referral" rel="noopener">'+c[0]+'</a>').join(', ')+'.</div>';
    document.body.appendChild(f);
  }

  /* ---------- PHOTOS : crédits Unsplash ---------- */
  const CREDITS = [
    ['Tobias Keller','tokeller'], ['Miles Smith','msmith0912'], ['Kelly Sikkema','kellysikkema'],
    ['Anne Nygård','polarmermaid'], ['Shutter Speed','shutter_speed_'], ['David Trinks','dtrinksrph'],
    ['Jakub Żerdzicki','jakubzerdzicki'], ['FotoFlo','flotography_91']
  ];

  /* ---------- ICÔNES AU TRAIT ---------- */
  const SVG = {
    maison:'<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    grille:'<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    boucle:'<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
    jauge:'<path d="M4 20V10M10 20V4M16 20v-7"/>',
    menu:'<path d="M4 7h16M4 12h16M4 17h10"/>',
    liste:'<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    retour:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
    suite:'<path d="M5 12h14M13 6l6 6-6 6"/>',
    cible:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>',
    eclair:'<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    cloche:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'
  };
  const ic = n => '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+SVG[n]+'</svg>';

  /* ---------- BARRE BASSE (téléphone, hors pages de cours) ---------- */
  function construireBarre(){
    if(document.querySelector('.ds-tab') || document.querySelector('.sidebar')) return;
    const ici = pageActuelle();
    const t = document.createElement('nav');
    t.className = 'ds-tab verre'; t.setAttribute('aria-label','Navigation rapide');
    const L = [
      ['index.html','maison','Accueil'], ['index.html#matieres','grille','Cours'],
      ['bequick.html','eclair','BeQuick'], ['revision.html','boucle','Révision']
    ];
    t.innerHTML = L.map(l=>{
      const on = (l[0]===ici) ? ' on' : '';
      return '<a class="'+on+'" href="'+l[0]+'" aria-label="'+l[2]+'">'+ic(l[1])+(on?'<span>'+l[2]+'</span>':'')+'</a>';
    }).join('') + '<button type="button" aria-label="Ouvrir la navigation" onclick="uiOuvrirMenu()">'+ic('menu')+'</button>';
    document.body.appendChild(t);
    document.body.classList.add('ds-a-tab');
  }

  /* ---------- PAGES DE COURS : cadre photo, progression, suite ---------- */
  const NOMS = {'marche-particuliers':'Marché des Particuliers','produits-derives':'Produits Dérivés I','marketing-numerique':'Marketing Numérique','es-banque':'ES Banque','fiscalite-particulier':'Fiscalité du Particulier','droits-particuliers':'Droits des particuliers','etudes-marche':'Études de marché'};
  function estLecon(v){ return /^l\d+$/.test(v||''); }
  function sequence(){
    const vus = {}, out = [];
    document.querySelectorAll('.sidebar .nav-item[data-view]').forEach(n=>{
      const v = n.dataset.view;
      if(v && !vus[v] && document.querySelector('.view[data-view="'+v+'"]')){ vus[v]=1; out.push({v, lab:(n.querySelector('.lab')||n).textContent.trim()}); }
    });
    return out;
  }
  function libelle(it, seq){
    if(estLecon(it.v)) return 'Leçon '+(seq.filter(x=>estLecon(x.v)).indexOf(it)+1);
    return it.lab;
  }
  function construireCours(){
    const main = document.querySelector('.main'), side = document.querySelector('.sidebar');
    if(!main || !side || document.querySelector('.ds-cadre') || typeof window.go !== 'function') return;
    const sid = document.documentElement.getAttribute('subject-id') || '';
    document.body.classList.add('ds-cours');

    const c = document.createElement('section');
    c.className = 'ds-cadre';
    c.style.viewTransitionName = 'mat-'+sid;
    const aTest = !!document.querySelector('.view[data-view="test"]');
    c.innerHTML =
      '<div class="ph"></div><div class="voile-g"></div>'+
      '<div class="haut">'+
        '<a class="ds-pil verre" href="index.html#matieres">'+ic('retour')+'<span class="txt">Mes cours</span></a>'+
        '<span style="display:flex;gap:8px">'+
          (aTest?'<button type="button" class="ds-pil verre ds-pil-test" onclick="go(\'test\')">'+ic('cible')+'<span class="txt">Test final</span></button>':'')+
          '<button type="button" class="ds-pil verre ds-pil-som" onclick="uiSommaire()">'+ic('liste')+'<span class="txt">Sommaire</span></button>'+
        '</span>'+
      '</div>'+
      '<div class="corps"><div class="ds-kick"><span class="ds-emb" aria-hidden="true"></span><span id="ds-kick">'+(NOMS[sid]||'')+'</span></div>'+
      '<h1 id="ds-titre"></h1></div>'+
      '<div class="ds-encoche"><div class="ds-prog"><div class="n" id="ds-n">0<small>/0</small></div>'+
        '<div class="l">leçons<br>validées</div><div class="j"><i id="ds-j" style="width:0"></i></div></div></div>';
    main.insertBefore(c, main.firstChild);

    const s = document.createElement('nav');
    s.className = 'ds-suite verre'; s.setAttribute('aria-label','Leçon précédente ou suivante');
    s.innerHTML = '<button type="button" id="ds-prec">'+ic('retour')+'<span></span></button>'+
                  '<button type="button" class="som" onclick="uiSommaire()" aria-label="Sommaire">'+ic('liste')+'</button>'+
                  '<button type="button" class="go" id="ds-suiv"><span></span>'+ic('suite')+'</button>';
    document.body.appendChild(s);

    const goOrig = window.go;
    window.go = function(v){ const r = goOrig.apply(this, arguments); majCours(); return r; };
    new MutationObserver(majProgres).observe(side, {subtree:true, attributes:true, attributeFilter:['class'], childList:true});
    majCours();
  }
  window.uiSommaire = function(){
    if(window.innerWidth > 880){ const s=document.querySelector('.sidebar'); if(s) s.scrollIntoView({behavior:'smooth'}); return; }
    if(typeof window.toggleSidebar === 'function') window.toggleSidebar();
  };
  function vueActive(){ return document.querySelector('.view.active'); }
  /* ---------- CLASSEMENT : envoi discret de la progression ---------- */
  let _synchro = null;
  function synchroniser(delai){
    clearTimeout(_synchro);
    _synchro = setTimeout(()=>{ try{ if(window.LB && LB.syncProgression) LB.syncProgression(); }catch(e){} }, delai);
  }
  document.addEventListener('visibilitychange', ()=>{
    if(document.visibilityState === 'hidden'){ try{ if(window.LB && LB.syncProgression) LB.syncProgression(); }catch(e){} }
  });

  function majProgres(){
    synchroniser(1500);
    const items = [...document.querySelectorAll('.sidebar .nav-item[data-view]')].filter(n=>estLecon(n.dataset.view));
    const tot = items.length, faites = items.filter(n=>n.classList.contains('done')).length;
    const n = document.getElementById('ds-n'), j = document.getElementById('ds-j');
    if(n) n.innerHTML = faites+'<small>/'+tot+'</small>';
    if(j) j.style.width = (tot? Math.round(faites/tot*100) : 0)+'%';
  }
  function majCours(){
    const vue = vueActive(); if(!vue) return;
    const sid = document.documentElement.getAttribute('subject-id') || '';
    const h1 = vue.querySelector('h1.lesson-title, h1'), tag = vue.querySelector('.tag');
    const t = document.getElementById('ds-titre'), k = document.getElementById('ds-kick');
    if(t) t.innerHTML = h1 ? h1.innerHTML : '';
    if(k) k.textContent = (NOMS[sid]||'') + (tag ? ' · '+tag.textContent.trim() : '');
    document.title = (h1 ? h1.textContent.trim()+' — ' : '') + (NOMS[sid]||'M1 MBAF');
    const seq = sequence(), i = seq.findIndex(x=>x.v===vue.dataset.view);
    const p = document.getElementById('ds-prec'), s = document.getElementById('ds-suiv');
    const prev = i>0 ? seq[i-1] : null, next = (i>=0 && i<seq.length-1) ? seq[i+1] : null;
    if(p){ p.disabled = !prev; p.querySelector('span').textContent = prev ? libelle(prev, seq) : 'Début'; p.onclick = prev ? ()=>window.go(prev.v) : null; }
    if(s){ s.disabled = !next; s.querySelector('span').textContent = next ? libelle(next, seq) : 'Fin'; s.onclick = next ? ()=>window.go(next.v) : null; }
    majProgres();
  }

  /* ---------- PRÉCHARGEMENT : les pages s'ouvrent sans attendre ---------- */
  function precharger(){
    try{
      if(HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules')){
        const sr = document.createElement('script');
        sr.type = 'speculationrules';
        sr.textContent = JSON.stringify({prerender:[{source:'document', where:{and:[{href_matches:'/*'},{not:{href_matches:'*#*'}}]}, eagerness:'moderate'}]});
        document.head.appendChild(sr);
        return;
      }
    }catch(e){}
    const faits = {};
    const pref = e=>{
      const a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
      const u = a.getAttribute('href'); if(!u || u[0]==='#' || /^https?:/.test(u) || faits[u]) return;
      faits[u] = 1; const l = document.createElement('link'); l.rel = 'prefetch'; l.href = u.split('#')[0]; document.head.appendChild(l);
    };
    document.addEventListener('pointerover', pref, {passive:true});
    document.addEventListener('touchstart', pref, {passive:true});
  }

  /* ---------- 4. OUVRIR UNE LEÇON VIA L'ANCRE (#l4) ---------- */
  function ouvrirAncre(){
    const h = (location.hash||'').slice(1);
    if(!h || typeof window.go !== 'function') return;
    if(document.querySelector('.view[data-view="'+h.replace(/"/g,'')+'"]')) window.go(h);
  }

  /* ---------- 5. FONCTIONNEMENT HORS LIGNE ---------- */
  function enregistrerSW(){
    if(!('serviceWorker' in navigator)) return;
    if(location.protocol === 'file:') return;         // inutile hors serveur
    navigator.serviceWorker.register('sw.js').then(reg=>{
      reg.addEventListener('updatefound', ()=>{
        const sw = reg.installing;
        if(!sw) return;
        sw.addEventListener('statechange', ()=>{
          if(sw.state === 'installed' && navigator.serviceWorker.controller) bandeauMaj(reg);
        });
      });
    }).catch(()=>{});
    // On ne recharge que lors d'une MISE À JOUR (une version précédente contrôlait déjà
    // la page). À la toute première visite, la prise de contrôle ne doit pas recharger.
    const dejaControle = !!navigator.serviceWorker.controller;
    let recharge = false;
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if(!dejaControle || recharge) return; recharge = true; location.reload();
    });
  }
  function bandeauMaj(reg){
    if(document.getElementById('ui-maj')) return;
    const d = document.createElement('div');
    d.id = 'ui-maj'; d.className = 'ui-maj';
    d.innerHTML = '<span>Une nouvelle version du site est disponible.</span>'+
                  '<button onclick="uiAppliquerMaj()">Mettre à jour</button>'+
                  '<button class="x" onclick="this.parentNode.remove()" aria-label="Plus tard">✕</button>';
    document.body.appendChild(d);
    window.__swReg = reg;
    setTimeout(()=>d.classList.add('vu'), 40);
  }
  window.uiAppliquerMaj = function(){
    const reg = window.__swReg;
    if(reg && reg.waiting) reg.waiting.postMessage('skipWaiting');
    else location.reload();
  };

  /* indicateur de connexion, utile en déplacement */
  function majReseau(){
    document.querySelectorAll('.ui-offline').forEach(e=>e.remove());
    if(navigator.onLine) return;
    const d = document.createElement('div');
    d.className = 'ui-offline';
    d.textContent = '📴 Hors connexion — les cours restent accessibles, le classement et la ressourcerie non.';
    document.body.appendChild(d);
  }
  window.addEventListener('online', majReseau);
  window.addEventListener('offline', majReseau);

  /* ---------- 6. RECHERCHE GLOBALE (Ctrl+K) ---------- */
  const INDEX = [
    {t:'Hub', s:'Accueil, toutes les matières', u:'index.html', i:'🏠'},
    {t:'Révision du jour', s:'Entraînement en révision espacée, flashcards', u:'revision.html', i:'🔁'},
    {t:'Ma progression', s:'Statistiques, points faibles', u:'stats.html', i:'📈'},
    {t:'Glossaire', s:'Sigles, définitions', u:'glossaire.html', i:'🔤'},
    {t:'Ressourcerie', s:'Documents partagés', u:'ressourcerie.html', i:'📚'},
    {t:'Classement', s:'Scores de la promo', u:'classement.html', i:'🏆'},
    {t:'BeQuick', s:'Le défi du soir, 18 h 30 – 22 h · classements', u:'bequick.html', i:'⚡'}
  ];
  const norm = s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function indexComplet(){
    const out = INDEX.slice();
    // les leçons et le glossaire, si banque.js est chargé
    if(window.CARTES) window.CARTES.forEach(c=>{
      out.push({t:c.q, s:'Glossaire · '+(c.d||'')+' · '+(c.ex||'').slice(0,60), u:'glossaire.html#'+String(c.id).replace(':','-'), i:'🔤', g:'Glossaire'});
    });
    if(window.BANQUE){
      const vus = {};
      window.BANQUE.forEach(q=>{
        const cle = q.m+q.l;
        if(vus[cle]) return; vus[cle] = 1;
        out.push({t:q.ch, s:'Leçon — '+(LABM[q.m]||''), u:fichierDe(q.m)+'#'+q.l, i:'📖', g:'Leçons'});
      });
    }
    return out;
  }
  const LABM = {'marche-particuliers':'Marché des Particuliers','produits-derives':'Produits Dérivés','marketing-numerique':'Marketing Numérique','es-banque':'ES Banque','fiscalite-particulier':'Fiscalité du Particulier','droits-particuliers':'Droits des Particuliers','etudes-marche':'Études de marché'};
  function fichierDe(m){
    return {'marche-particuliers':'marche_des_particuliers.html','produits-derives':'produits_derives.html','marketing-numerique':'marketing_numerique.html','es-banque':'es_banque.html','fiscalite-particulier':'fiscalite_particulier.html','droits-particuliers':'droits_particuliers.html','etudes-marche':'etudes_de_marche.html'}[m] || 'index.html';
  }

  /* Résultats d'une recherche : 8 suggestions sans texte, 30 au plus sinon. */
  let _index = null;
  function chercher(txt){
    if(!_index) _index = indexComplet();
    const v = norm(String(txt||'').trim());
    return (v ? _index.filter(o=>norm(o.t+' '+(o.s||'')).includes(v)) : _index.slice(0,8)).slice(0,30);
  }
  function ligneResultat(o, i, classe){
    return '<a class="'+classe+(i===0?' sel':'')+'" role="option" href="'+o.u+'">'+
      '<span class="pi">'+o.i+'</span><span class="pt">'+echap(o.t)+
      '<span class="ps">'+echap(o.s||'')+'</span></span></a>';
  }

  /* Le champ de recherche intégré à l'en-tête (grands écrans) :
     on tape directement, les résultats s'ouvrent dessous. */
  function rechercheEnteteVisible(){
    const q = document.querySelector('.ds-q');
    return !!(q && q.offsetParent !== null);
  }
  function brancherRechercheEntete(){
    const q = document.getElementById('ds-q-in'), box = document.getElementById('ds-q-res');
    if(!q || !box) return;
    let res = [], sel = 0;
    function ouvre(on){ box.hidden = !on; q.setAttribute('aria-expanded', on ? 'true' : 'false'); }
    function dessine(){
      res = chercher(q.value); sel = 0;
      box.innerHTML = res.length ? res.map((o,i)=>ligneResultat(o,i,'ds-q-i')).join('')
                                 : '<div class="ds-q-v">Aucun résultat.</div>';
      ouvre(true);
    }
    function bouge(d){
      if(!res.length) return;
      sel = (sel + d + res.length) % res.length;
      const items = box.querySelectorAll('.ds-q-i');
      items.forEach((e,i)=>e.classList.toggle('sel', i===sel));
      if(items[sel]) items[sel].scrollIntoView({block:'nearest'});
    }
    q.addEventListener('input', dessine);
    q.addEventListener('focus', dessine);
    q.addEventListener('keydown', e=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); if(box.hidden) dessine(); else bouge(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); bouge(-1); }
      else if(e.key==='Enter'){ e.preventDefault(); const a = box.querySelectorAll('.ds-q-i')[sel]; if(a) location.href = a.getAttribute('href'); }
      else if(e.key==='Escape'){ ouvre(false); q.blur(); }
    });
    /* on ferme quand on clique ailleurs (le clic sur un résultat suit le lien) */
    document.addEventListener('pointerdown', e=>{ if(!e.target.closest('.ds-q')) ouvre(false); });
    q.addEventListener('blur', ()=>setTimeout(()=>{ if(!document.activeElement || !document.activeElement.closest('.ds-q')) ouvre(false); }, 150));
  }

  function ouvrirRecherche(){
    if(rechercheEnteteVisible()){ document.getElementById('ds-q-in').focus(); return; }
    if(document.getElementById('ui-pal')) { document.getElementById('ui-pal-q').focus(); return; }
    const p = document.createElement('div');
    p.className = 'ui-pal-ov'; p.id = 'ui-pal';
    p.innerHTML = '<div class="ui-pal" role="dialog" aria-label="Recherche">'+
        '<input id="ui-pal-q" type="search" placeholder="Chercher une leçon, un sigle, une page…" autocomplete="off">'+
        '<div class="ui-pal-r" id="ui-pal-r"></div>'+
        '<div class="ui-pal-f">↑↓ naviguer · ⏎ ouvrir · Échap fermer</div>'+
      '</div>';
    p.onclick = e=>{ if(e.target===p) p.remove(); };
    document.body.appendChild(p);
    const q = document.getElementById('ui-pal-q');
    let sel = 0, res = [];
    function dessine(){
      res = chercher(q.value);
      sel = 0;
      const host = document.getElementById('ui-pal-r');
      host.innerHTML = res.length
        ? res.map((o,i)=>ligneResultat(o,i,'ui-pal-i')).join('')
        : '<div class="ui-pal-v">Aucun résultat.</div>';
    }
    function bouge(d){
      if(!res.length) return;
      sel = (sel + d + res.length) % res.length;
      const items = document.querySelectorAll('.ui-pal-i');
      items.forEach((e,i)=>e.classList.toggle('sel', i===sel));
      if(items[sel]) items[sel].scrollIntoView({block:'nearest'});
    }
    q.addEventListener('input', dessine);
    q.addEventListener('keydown', e=>{
      if(e.key==='ArrowDown'){ e.preventDefault(); bouge(1); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); bouge(-1); }
      else if(e.key==='Enter'){ e.preventDefault(); const a=document.querySelectorAll('.ui-pal-i')[sel]; if(a) location.href=a.getAttribute('href'); }
      else if(e.key==='Escape'){ p.remove(); }
    });
    dessine(); q.focus();
  }
  function echap(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  window.uiRecherche = ouvrirRecherche;

  /* ---------- 7. NOTIFICATIONS : la cloche (6.0.0) ----------
     Les alertes sont calculées sur l'appareil (bequick.js) : BeQuick
     ouvert, partiel proche, révisions du jour, nouveautés du site.
     Le panneau propose aussi d'activer l'alerte de 18 h 30 sur le
     téléphone (notification envoyée même site fermé). */
  function chargerScript(src){
    return new Promise(ok=>{
      if(document.querySelector('script[src="'+src+'"]')) return ok();
      const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s);
    });
  }
  async function pretBQ(){
    if(!window.ECHEANCES) await chargerScript('calendrier.js');
    if(!window.BQ) await chargerScript('bequick.js');
    return window.BQ || null;
  }
  function vues(){ try{ return JSON.parse(localStorage.getItem('notif_vues') || '[]'); }catch(e){ return []; } }
  function marquerVues(ids){ try{ const v = new Set(vues()); ids.forEach(i=>v.add(i)); localStorage.setItem('notif_vues', JSON.stringify([...v].slice(-200))); }catch(e){} }
  function nouveautes(){
    let vu = null; try{ vu = localStorage.getItem('version_vue'); }catch(e){}
    if(vu === VERSION_APP) return [];
    return [{id:'version-'+VERSION_APP, ico:'✨', titre:'Nouveau : BeQuick, le défi du soir', texte:'Version '+VERSION_APP+' « '+NOM_VERSION+' » : 30 questions à 18 h 30, la même pour toute la promo, et cette cloche.', url:'bequick.html'}];
  }
  let _alertes = [];
  async function majCloche(){
    const BQ = await pretBQ();
    try{ _alertes = nouveautes().concat(BQ ? BQ.alertes() : []); }catch(e){ _alertes = nouveautes(); }
    const v = new Set(vues()), n = _alertes.filter(a=>!v.has(a.id)).length;
    const p = document.getElementById('ds-pastille'); if(p){ p.hidden = !n; p.textContent = n > 9 ? '9+' : String(n); }
    const b = document.getElementById('ds-cloche'); if(b) b.setAttribute('aria-label', n ? 'Notifications, '+n+' non lue'+(n>1?'s':'') : 'Notifications');
    const pn = document.getElementById('ds-notifs'); if(pn && !pn.hidden) dessinerNotifs();
  }
  function basculerNotifs(e){
    if(e) e.stopPropagation();
    const pn = document.getElementById('ds-notifs');
    if(pn && !pn.hidden) fermerNotifs(); else ouvrirNotifs();
  }
  async function ouvrirNotifs(){
    let pn = document.getElementById('ds-notifs');
    if(!pn){ pn = document.createElement('div'); pn.id = 'ds-notifs'; pn.className = 'ds-notifs'; pn.setAttribute('role','dialog'); pn.setAttribute('aria-label','Notifications'); document.body.appendChild(pn); }
    pn.hidden = false;
    const b = document.getElementById('ds-cloche'); if(b) b.setAttribute('aria-expanded','true');
    await majCloche(); dessinerNotifs();
    marquerVues(_alertes.map(a=>a.id)); try{ localStorage.setItem('version_vue', VERSION_APP); }catch(e){}
    const p = document.getElementById('ds-pastille'); if(p) p.hidden = true;
  }
  function fermerNotifs(){
    const pn = document.getElementById('ds-notifs'); if(pn) pn.hidden = true;
    const b = document.getElementById('ds-cloche'); if(b) b.setAttribute('aria-expanded','false');
  }
  function dessinerNotifs(){
    const pn = document.getElementById('ds-notifs'); if(!pn) return;
    const v = new Set(vues());
    const liste = _alertes.length
      ? _alertes.map(a=>'<a class="ds-n'+(v.has(a.id)?'':' neuf')+(a.fort?' fort':'')+'" href="'+a.url+'"><span class="ni" aria-hidden="true">'+a.ico+'</span><span class="nt"><b>'+echap(a.titre)+'</b><small>'+echap(a.texte||'')+'</small></span></a>').join('')
      : '<div class="ds-n-vide">Rien de neuf pour l\'instant.</div>';
    pn.innerHTML = '<div class="ds-n-tete"><b>Notifications</b><button type="button" class="ds-n-x" aria-label="Fermer">✕</button></div>'+
      '<div class="ds-n-liste">'+liste+'</div><div class="ds-n-push" id="ds-n-push"></div>';
    pn.querySelector('.ds-n-x').onclick = fermerNotifs;
    dessinerPush();
  }
  async function dessinerPush(){
    const z = document.getElementById('ds-n-push'); if(!z || !window.BQ) return;
    const et = await BQ.etatPush();
    const txt = {
      actif:'<b>Alerte BeQuick activée</b> sur cet appareil : tu seras prévenu chaque soir à 18 h 30.<button type="button" class="ds-n-b sec" data-a="off">Désactiver</button>',
      inactif:'<b>Être prévenu à 18 h 30</b> sur cet appareil, même site fermé, quand BeQuick ouvre.<button type="button" class="ds-n-b" data-a="on">Activer l\'alerte</button>',
      refuse:'<b>Notifications bloquées</b> pour ce site dans les réglages du navigateur. Autorise-les, puis reviens ici.',
      ios:'<b>Sur iPhone</b> : touche Partager, puis « Sur l\'écran d\'accueil ». Ouvre ensuite le site depuis cette nouvelle icône et reviens ici pour activer l\'alerte de 18 h 30.',
      impossible:'Ce navigateur ne permet pas de recevoir des notifications.'
    }[et] || '';
    z.innerHTML = '<div class="ds-n-p">'+txt+'</div>';
    const b = z.querySelector('[data-a]');
    if(b) b.onclick = async ()=>{
      b.disabled = true;
      try{ if(b.dataset.a === 'on') await BQ.activerPush(); else await BQ.desactiverPush(); dessinerPush(); }
      catch(err){ b.disabled = false; z.insertAdjacentHTML('beforeend','<div class="ds-n-err">'+echap(err.message || 'Activation impossible.')+'</div>'); }
    };
  }
  document.addEventListener('pointerdown', e=>{
    const pn = document.getElementById('ds-notifs');
    if(pn && !pn.hidden && !e.target.closest('#ds-notifs, #ds-cloche')) fermerNotifs();
  });

  /* ---------- 8. LE HUB : la pilule suit le défilement ----------
     « Mes cours » et « Entraînement » sont des sections de l'accueil :
     la pilule active (en-tête et barre basse) suit la section visible. */
  function suivreSections(){
    if(pageActuelle() !== 'index.html') return;
    const secs = ['matieres','entrainement'].map(id=>document.getElementById(id)).filter(Boolean);
    if(!secs.length) return;
    const ancre = h=>{ h = h || ''; if(h === 'index.html' || h === './') return ''; const i = h.indexOf('#'); return (i >= 0 && (h.startsWith('#') || h.startsWith('index.html#'))) ? h.slice(i+1) : null; };
    function maj(){
      const y = innerHeight * 0.4; let actif = '';
      secs.forEach(s=>{ const r = s.getBoundingClientRect(); if(r.top <= y && r.bottom > y) actif = s.id; });
      document.querySelectorAll('.ds-nav .ds-l, .ds-tab a').forEach(a=>{
        const id = ancre(a.getAttribute('href')); if(id === null) return;
        const on = id === actif; a.classList.toggle('on', on);
        if(a.closest('.ds-tab')){
          const sp = a.querySelector('span:not(.sr)');
          if(on && !sp){ const t = document.createElement('span'); t.textContent = a.getAttribute('aria-label') || ''; a.appendChild(t); }
          if(!on && sp) sp.remove();
        }
      });
    }
    let att = null;
    addEventListener('scroll', ()=>{ if(!att) att = requestAnimationFrame(()=>{ att = null; maj(); }); }, {passive:true});
    addEventListener('hashchange', ()=>setTimeout(maj, 400));
    maj();
  }

  /* ---------- exports ---------- */
  window.uiOuvrirMenu = ouvrir;
  window.uiFermerMenu = fermer;
  window.uiSetTheme   = function(){};   /* conservé : le thème ne change plus */
  window.uiTheme      = function(){ return 'dark'; };

  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ fermer(); fermerNotifs(); }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); ouvrirRecherche(); }
  });

  function init(){
    construireEntete();
    construireCours();
    construireBarre();
    construirePied();
    precharger();
    appliquerTheme();
    enregistrerSW();
    majReseau();
    setTimeout(ouvrirAncre, 60);
    synchroniser(2500);
    suivreSections();
    majCloche();
    setInterval(majCloche, 60000);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('hashchange', ouvrirAncre);

})();
