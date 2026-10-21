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
  const VERSION_APP = '7.3.2';
  const NOM_VERSION = 'Thaler';
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
    {g:'Cours',    href:'systeme_bancaire.html',        ico:'🏦', t:'Le système bancaire français', s:'12 leçons · Livret A, crédits, régulation'},
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
        '<button class="ds-ic ds-bulle" id="ds-chat" aria-label="Messagerie" aria-expanded="false" aria-controls="chat">'+ic('bulle')+'<span class="ds-pastille" id="ds-chat-pastille" hidden></span></button>'+
        '<button class="ds-ic ds-cloche" id="ds-cloche" aria-label="Notifications" aria-expanded="false" aria-controls="ds-notifs">'+ic('cloche')+'<span class="ds-pastille" id="ds-pastille" hidden></span></button>'+
        '<button class="ds-ic" id="ds-menu" aria-label="Ouvrir la navigation">'+icone(IC_MENU,'Menu')+'</button>'+
      '</div>';

    document.body.insertBefore(h, document.body.firstChild);
    document.getElementById('ds-rech').onclick = ouvrirRecherche;
    brancherRechercheEntete();
    document.getElementById('ds-menu').onclick = ouvrir;
    document.getElementById('ds-cloche').onclick = basculerNotifs;
    document.getElementById('ds-chat').onclick = basculerChat;

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
      '<div class="ds-credits">Tes progrès (leçons, temps de révision, résultats) sont partagés avec l\'administrateur du hub.</div>'+
      '<div class="ds-credits">Photos <a href="https://unsplash.com/?utm_source=m1_mbaf&utm_medium=referral" rel="noopener">Unsplash</a> : '+
        CREDITS.map(c=>'<a href="https://unsplash.com/@'+c[1]+'?utm_source=m1_mbaf&utm_medium=referral" rel="noopener">'+c[0]+'</a>').join(', ')+'.</div>';
    document.body.appendChild(f);
  }

  /* ---------- PHOTOS : crédits Unsplash ---------- */
  const CREDITS = [
    ['Tobias Keller','tokeller'], ['Miles Smith','msmith0912'], ['Kelly Sikkema','kellysikkema'],
    ['Anne Nygård','polarmermaid'], ['Shutter Speed','shutter_speed_'], ['David Trinks','dtrinksrph'],
    ['Jakub Żerdzicki','jakubzerdzicki'], ['FotoFlo','flotography_91'], ['Athithan Vignakaran','avignakaran']
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
    cloche:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    lecture:'<path d="M8 5.5v13l10.5-6.5z"/>',
    bulle:'<path d="M5.5 4.5h13a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2H11l-4.5 3.5V17H5.5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/>'
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
  const NOMS = {'marche-particuliers':'Marché des Particuliers','produits-derives':'Produits Dérivés I','marketing-numerique':'Marketing Numérique','es-banque':'ES Banque','fiscalite-particulier':'Fiscalité du Particulier','droits-particuliers':'Droits des particuliers','etudes-marche':'Études de marché','systeme-bancaire':'Le système bancaire français'};
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
    if(it.v === 'intro') return 'Présentation';
    if(estLecon(it.v)) return 'Leçon '+(seq.filter(x=>estLecon(x.v)).indexOf(it)+1);
    return it.lab;
  }
  function construireCours(){
    const main = document.querySelector('.main'), side = document.querySelector('.sidebar');
    if(!main || !side || document.querySelector('.ds-cadre') || typeof window.go !== 'function') return;
    const sid = document.documentElement.getAttribute('subject-id') || '';
    document.body.classList.add('ds-cours');
    const intro = construireIntro(sid);

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
    /* Première visite d'un cours (aucune leçon validée) : on ouvre la présentation. */
    if(intro && !location.hash && !lireLocal('m1-intro-'+sid) && !side.querySelector('.nav-item.done')){
      ecrireLocal('m1-intro-'+sid, '1');
      window.go('intro');
    }
    majCours();
  }

  /* ---------- PRÉSENTATION DU COURS (6.3.0) ----------
     Une vidéo par matière, sur sa propre page, avant la leçon 1.
     Elle s'insère dans le menu de gauche : la barre « précédent /
     suivant » la prend donc en compte, mais pas la progression. */
  const PRESENTATIONS = {
    'droits-particuliers':   {yt:'j9Ut6ASrw-E', duree:'7 min'},
    'fiscalite-particulier': {yt:'Yczyh77_k3I', duree:'7 min'},
    'marche-particuliers':   {yt:'NWaHjAD3hVM', duree:'7 min'},
    'produits-derives':      {yt:'boIFCkjpHtI', duree:'7 min'},
    'es-banque':             {yt:'8DjZuDmS22I', duree:'8 min'},
    'marketing-numerique':   {yt:'suhvus2KxpY', duree:'10 min'},
    'etudes-marche':         {yt:'Czg3Q9YZK9U', duree:'8 min'},
    'systeme-bancaire':      {yt:'kV5Ruf3QC4I', duree:'9 min'}
  };
  function lireLocal(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function ecrireLocal(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function construireIntro(sid){
    const pr = PRESENTATIONS[sid], side = document.querySelector('.sidebar'),
          l1 = document.querySelector('.view[data-view="l1"]');
    if(!pr || !side || !l1 || document.querySelector('.view[data-view="intro"]')) return false;
    const h = document.createElement('h4');
    h.textContent = 'Introduction';
    const it = document.createElement('div');
    it.className = 'nav-item ds-intro'; it.dataset.view = 'intro';
    it.setAttribute('role','button'); it.tabIndex = 0;
    it.innerHTML = '<span class="num">'+ic('lecture')+'</span><span class="lab">Présentation du cours</span>';
    it.addEventListener('click', ()=>window.go('intro'));
    it.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); window.go('intro'); } });
    side.insertBefore(it, side.firstChild);
    side.insertBefore(h, it);
    const v = document.createElement('section');
    v.className = 'view'; v.dataset.view = 'intro';
    v.innerHTML = '<span class="tag">Introduction</span>'+
      '<h1 class="lesson-title">Présentation du cours</h1>'+
      '<p class="subtitle">Le plan du cours, ses notions clés et ses pièges'+(pr.duree?', en '+pr.duree:'')+'. À regarder avant de commencer, ou pour tout revoir d’un coup d’œil.</p>'+
      '<div class="video-lecon" data-yt="'+pr.yt+'" data-duree="'+pr.duree+'" data-leg="Le cours en vidéo"></div>'+
      '<div class="lesson-nav ds-intro-nav"><button type="button" class="btn primary">Commencer la leçon 1 →</button></div>';
    v.querySelector('.ds-intro-nav .btn').addEventListener('click', ()=>window.go('l1'));
    l1.parentNode.insertBefore(v, l1);
    return true;
  }

  /* Fenêtre vidéo par-dessus la page (pastille ▶ des cartes du hub). */
  let vmRetour = null;
  function ouvrirVideo(id, titre){
    if(!/^[\w-]{11}$/.test(id||'')) return;
    fermerVideo();
    vmRetour = document.activeElement;
    const m = document.createElement('div');
    m.className = 'ds-vmodal'; m.id = 'ds-vmodal';
    m.innerHTML = '<div class="ds-vm-boite" role="dialog" aria-modal="true" aria-label="'+(titre||'Vidéo').replace(/"/g,'&quot;')+'">'+
      '<div class="ds-vm-haut"><span class="ds-vm-titre"></span>'+
      '<button type="button" class="ds-vm-fermer" aria-label="Fermer la vidéo">✕</button></div>'+
      (navigator.onLine
        ? '<iframe src="https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1&playsinline=1" title="'+(titre||'Vidéo').replace(/"/g,'&quot;')+'" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>'
        : '<div class="ds-vm-horsligne">La vidéo demande une connexion internet.</div>')+
      '<p class="ds-vm-info">Résumé généré par IA à partir du cours — le texte des leçons fait foi.</p></div>';
    m.querySelector('.ds-vm-titre').textContent = titre || '';
    m.addEventListener('click', e=>{ if(e.target === m) fermerVideo(); });
    m.querySelector('.ds-vm-fermer').addEventListener('click', fermerVideo);
    document.body.appendChild(m);
    document.body.classList.add('ds-vm-ouvert');
    m.querySelector('.ds-vm-fermer').focus();
  }
  function fermerVideo(){
    const m = document.getElementById('ds-vmodal'); if(!m) return;
    m.remove();                                   /* retire l'iframe : la vidéo s'arrête */
    document.body.classList.remove('ds-vm-ouvert');
    if(vmRetour && vmRetour.focus) vmRetour.focus();
    vmRetour = null;
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
  const LABM = {'marche-particuliers':'Marché des Particuliers','produits-derives':'Produits Dérivés','marketing-numerique':'Marketing Numérique','es-banque':'ES Banque','fiscalite-particulier':'Fiscalité du Particulier','droits-particuliers':'Droits des Particuliers','etudes-marche':'Études de marché','systeme-bancaire':'Le système bancaire français'};
  function fichierDe(m){
    return {'marche-particuliers':'marche_des_particuliers.html','produits-derives':'produits_derives.html','marketing-numerique':'marketing_numerique.html','es-banque':'es_banque.html','fiscalite-particulier':'fiscalite_particulier.html','droits-particuliers':'droits_particuliers.html','etudes-marche':'etudes_de_marche.html','systeme-bancaire':'systeme_bancaire.html'}[m] || 'index.html';
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
      else if(e.key==='Enter'){ e.preventDefault(); if(estAdmin(q.value)){ location.href = '/admin'; return; } const a = box.querySelectorAll('.ds-q-i')[sel]; if(a) location.href = a.getAttribute('href'); }
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
      else if(e.key==='Enter'){ e.preventDefault(); if(estAdmin(q.value)){ location.href = '/admin'; return; } const a=document.querySelectorAll('.ui-pal-i')[sel]; if(a) location.href=a.getAttribute('href'); }
      else if(e.key==='Escape'){ p.remove(); }
    });
    dessine(); q.focus();
  }
  /* « /admin » + Entrée ouvre la gestion des clés d'accès (6.5.0) : jamais proposé
     dans les résultats, et la page reste protégée par un mot de passe. */
  function estAdmin(v){ return String(v||'').trim().toLowerCase() === '/admin'; }
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
    return [{id:'version-'+VERSION_APP, ico:'✨', titre:'Nouveau : réactions dans le chat et suivi des progrès', texte:'Version '+VERSION_APP+' : touche un message pour réagir ou répondre. Tes progrès (leçons, temps, résultats) sont désormais partagés avec l\'administrateur du hub.', url:'index.html?chat=1', chat:true}];
  }
  let _alertes = [];
  async function majCloche(){
    const BQ = await pretBQ();
    const chat = (window.M1Chat && M1Chat.alertes()) || [];
    try{ _alertes = chat.concat(nouveautes(), BQ ? BQ.alertes() : []); }catch(e){ _alertes = chat.concat(nouveautes()); }
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
      ? _alertes.map(a=>'<a class="ds-n'+(v.has(a.id)?'':' neuf')+(a.fort?' fort':'')+'" href="'+a.url+'"'+(a.chat?' data-chat="1"':'')+'><span class="ni" aria-hidden="true">'+a.ico+'</span><span class="nt"><b>'+echap(a.titre)+'</b><small>'+echap(a.texte||'')+'</small></span></a>').join('')
      : '<div class="ds-n-vide">Rien de neuf pour l\'instant.</div>';
    pn.innerHTML = '<div class="ds-n-tete"><b>Notifications</b><button type="button" class="ds-n-x" aria-label="Fermer">✕</button></div>'+
      '<div class="ds-n-liste">'+liste+'</div><div class="ds-n-push" id="ds-n-push"></div>';
    pn.querySelector('.ds-n-x').onclick = fermerNotifs;
    pn.querySelectorAll('[data-chat]').forEach(a=>a.onclick = e=>{ e.preventDefault(); fermerNotifs(); ouvrirChat(); });
    dessinerPush();
  }
  async function dessinerPush(){
    const z = document.getElementById('ds-n-push'); if(!z || !window.BQ) return;
    const et = await BQ.etatPush();
    const txt = {
      actif:'<b>Alerte BeQuick activée</b> sur cet appareil : tu seras prévenu à 18 h 30, du lundi au vendredi.<button type="button" class="ds-n-b" data-t="1">Envoyer une notification de test</button><button type="button" class="ds-n-b sec" data-a="off">Désactiver</button>',
      inactif:'<b>Être prévenu à 18 h 30</b> (du lundi au vendredi) sur cet appareil, même site fermé, quand BeQuick ouvre.<button type="button" class="ds-n-b" data-a="on">Activer l\'alerte</button>',
      refuse:'<b>Notifications bloquées</b> pour ce site dans les réglages du navigateur. Autorise-les, puis reviens ici.',
      ios:'<b>Sur iPhone</b> : touche Partager, puis « Sur l\'écran d\'accueil ». Ouvre ensuite le site depuis cette nouvelle icône et reviens ici pour activer l\'alerte de 18 h 30.',
      impossible:'Ce navigateur ne permet pas de recevoir des notifications.'
    }[et] || '';
    z.innerHTML = '<div class="ds-n-p">'+txt+'</div>';
    /* 7.1.0 : les notifications du chat passent par le même abonnement ;
       on peut les couper ici sans couper l'alerte BeQuick. */
    if(et === 'actif'){
      let chatOn = true; try{ chatOn = localStorage.getItem('chat_push') !== '0'; }catch(e){}
      z.insertAdjacentHTML('beforeend','<div class="ds-n-p" style="margin-top:8px"><b>Messagerie</b> : '+
        (chatOn ? 'tu es prévenu quand quelqu\'un écrit, même appli fermée.' : 'notifications du chat coupées.')+
        '<button type="button" class="ds-n-b sec" data-c="'+(chatOn?'off':'on')+'">'+(chatOn?'Couper celles du chat':'Réactiver celles du chat')+'</button></div>');
      const c = z.querySelector('[data-c]');
      c.onclick = async ()=>{
        c.disabled = true;
        const actif = c.dataset.c === 'on';
        try{
          const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
          if(sub) await BQ.api('rpc/push_chat', {method:'POST', body:{e:sub.endpoint, actif}});
          try{ localStorage.setItem('chat_push', actif ? '1' : '0'); }catch(e){}
          dessinerPush();
        }catch(err){ c.disabled = false; z.insertAdjacentHTML('beforeend','<div class="ds-n-err">'+echap(err.message || 'Réglage impossible.')+'</div>'); }
      };
    }
    const t = z.querySelector('[data-t]');
    if(t) t.onclick = async ()=>{
      t.disabled = true; t.textContent = 'Envoi…';
      const r = await BQ.testerMaintenant().catch(e=>({ok:false, texte:e.message}));
      t.disabled = false; t.textContent = 'Envoyer une notification de test';
      const old = z.querySelector('.ds-n-res'); if(old) old.remove();
      z.insertAdjacentHTML('beforeend','<div class="ds-n-p ds-n-res'+(r.ok?'':' ds-n-err')+'" style="margin-top:8px">'+echap(r.texte)+'</div>');
    };
    const b = z.querySelector('[data-a]');
    if(b) b.onclick = async ()=>{
      b.disabled = true;
      try{
        if(b.dataset.a === 'on'){ const t = await BQ.activerPush(); await dessinerPush(); const zz = document.getElementById('ds-n-push'); if(zz) zz.insertAdjacentHTML('beforeend','<div class="ds-n-p" style="margin-top:8px">'+echap(BQ.MSG_TEST[t]||'')+'</div>'); }
        else { await BQ.desactiverPush(); dessinerPush(); }
      }
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

  /* ---------- VIDÉOS D'OUVERTURE DE LEÇON (6.2.0) ----------
     <div class="video-lecon" data-yt="ID" data-duree="6 min"></div>
     Aperçu léger ; le lecteur YouTube (domaine sans cookies) ne se
     charge qu'au clic, pour garder les pages rapides. */
  function construireVideos(){
    document.querySelectorAll('.video-lecon[data-yt]').forEach(box=>{
      const id = (box.dataset.yt||'').trim();
      if(!/^[\w-]{11}$/.test(id) || box.dataset.pret) return;
      box.dataset.pret = '1';
      const duree = box.dataset.duree ? ' · '+box.dataset.duree : '';
      const leg = '<div class="vl-leg"><span class="vl-titre">'+(box.dataset.leg||'La leçon en vidéo')+duree+'</span>'+
                  '<span class="vl-info">Résumé généré par IA à partir du cours — le texte '+(box.dataset.leg?'des leçons':'de la leçon')+' fait foi.</span></div>';
      box.innerHTML = '<button type="button" class="vl-ecran" aria-label="Lire la vidéo de la leçon">'+
        '<img src="https://i.ytimg.com/vi/'+id+'/hqdefault.jpg" alt="" loading="lazy">'+
        '<span class="vl-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span></button>'+leg;
      box.querySelector('.vl-ecran').addEventListener('click', ()=>{
        if(!navigator.onLine){
          box.querySelector('.vl-ecran').outerHTML = '<div class="vl-horsligne">La vidéo demande une connexion internet. Le cours, lui, reste disponible hors ligne.</div>';
          return;
        }
        const f = document.createElement('iframe');
        f.src = 'https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1&playsinline=1';
        f.title = 'Vidéo de la leçon';
        f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        box.querySelector('.vl-ecran').replaceWith(f);
      });
    });
  }

  /* ---------- exports ---------- */
  window.uiOuvrirMenu = ouvrir;
  window.uiFermerMenu = fermer;
  window.uiVideo      = ouvrirVideo;
  window.uiSetTheme   = function(){};   /* conservé : le thème ne change plus */
  window.uiTheme      = function(){ return 'dark'; };

  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ fermer(); fermerNotifs(); fermerVideo(); }
    if(e.key==='Tab'){ const m = document.getElementById('ds-vmodal');   /* le focus reste dans la fenêtre vidéo */
      if(m){ const f = [...m.querySelectorAll('button, iframe')]; const i = f.indexOf(document.activeElement);
        if(e.shiftKey && i<=0){ e.preventDefault(); f[f.length-1].focus(); }
        else if(!e.shiftKey && i===f.length-1){ e.preventDefault(); f[0].focus(); } } }
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); ouvrirRecherche(); }
  });

  /* Clé d'accès (7.0.0) : on rattache une fois le pseudo du site à la clé de
     cet appareil, pour que /admin sache qui utilise quelle clé. */
  function signalerPseudo(){
    let p = null, deja = null;
    /* « acces_pseudo_ok » (7.0.1) : envoyé et confirmé par le serveur. Les clés
       activées avant que la base sache stocker le pseudo se complètent ainsi. */
    try{ p = localStorage.getItem('lb_name'); deja = localStorage.getItem('acces_pseudo_ok'); }catch(e){ return; }
    if(!p || p === deja || !navigator.onLine) return;
    fetch('/.netlify/functions/acces-pseudo', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({pseudo:p})})
      .then(r=>{ if(r.ok){ try{ localStorage.setItem('acces_pseudo_ok', p); }catch(e){} } })
      .catch(()=>{});
  }

  /* ---------- VERROU BEQUICK (7.2.0) ----------
     De 18 h 30 à 22 h, les cours des matières de la série du soir (et la
     révision espacée, qui puise dans les mêmes questions) restent fermés
     tant que la personne n'a pas fini sa série. Le contrôle se fait sur le
     serveur par pseudo : ordinateur et téléphone se débloquent ensemble.
     Sans réponse du serveur, on reste fermé (sauf partie finie ici). */
  let verrouMinuterie = null;
  async function verrouBeQuick(){
    const fichier = (location.pathname.split('/').pop() || '').replace(/\.html$/, '');
    const sid = document.documentElement.getAttribute('subject-id');
    const revision = fichier === 'revision';
    if(!revision && (!sid || /^entrainement_/.test(fichier))) return;
    clearTimeout(verrouMinuterie);
    await pretBQ();
    if(!window.BQ) return;
    const t = BQ.maintenant(), j = BQ.jourDe(t), ph = BQ.phase(t);
    if(ph === 'avant'){ ouvrirVerrou(); verrouMinuterie = setTimeout(verrouBeQuick, BQ.ouverture(j) - t + 2000); return; }
    if(ph !== 'ouvert'){ ouvrirVerrou(); return; }
    verrouMinuterie = setTimeout(verrouBeQuick, Math.min(60000, BQ.fermeture(j) - t + 2000));
    const s = await BQ.serie(j, false);
    const matieres = (s && s.matieres) || [];
    if(!revision && !matieres.includes(sid)){ ouvrirVerrou(); return; }
    const loc = BQ.lireLocal(j);
    let partie = null, joint = true;
    try{ partie = await BQ.maPartie(j); }catch(e){ joint = false; }
    /* la mémoire locale ne compte que hors connexion (partie effacée par l'admin : 7.3.1) */
    if(!joint && loc && loc.fini){ ouvrirVerrou(); return; }
    const finie = partie && ((partie.repondues|0) >= BQ.NB_Q || BQ.maintenant() > Date.parse(partie.debut) + BQ.DUREE + 20000);
    if(finie){ ouvrirVerrou(); return; }
    fermerVerrou({revision, matieres, enCours:!!partie, joint});
  }
  function fermerVerrou(o){
    const noms = o.matieres.map(m=>NOMS[m] || m);
    const quoi = o.revision
      ? 'La révision reprend les questions de BeQuick : elle est fermée ce soir'
      : 'Ce soir, BeQuick porte sur <b>'+echap(noms.join(' et '))+'</b>. Ce cours est fermé';
    const html =
      '<div class="bqv-carte">'+
        '<div class="bqv-ico" aria-hidden="true">⚡</div>'+
        '<h1 id="bqv-t">'+(o.enCours ? 'Termine d\'abord ta série' : (o.revision ? 'Révision en pause' : 'Cours en pause'))+'</h1>'+
        '<p>'+quoi+' jusqu\'à ce que tu aies joué ta série, sur n\'importe quel appareil, ou jusqu\'à 22 h. Comme ça, c\'est juste pour tout le monde.</p>'+
        (o.joint ? '' : '<p class="bqv-petit">Pas de connexion : impossible de vérifier ta partie pour l\'instant.</p>')+
        '<a class="bqv-b" href="bequick.html">'+(o.enCours ? 'Reprendre ma série' : 'Jouer au BeQuick')+'</a>'+
        '<a class="bqv-l" href="index.html">Retour à l\'accueil</a>'+
      '</div>';
    let v = document.getElementById('bq-verrou');
    if(!v){
      v = document.createElement('div');
      v.id = 'bq-verrou'; v.className = 'bq-verrou';
      v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-labelledby', 'bqv-t');
      document.body.appendChild(v);
    }
    if(v.innerHTML !== html) v.innerHTML = html;
    [...document.body.children].forEach(el=>{ if(el !== v && el.id !== 'chat') el.inert = true; });
    document.documentElement.classList.add('bq-verrouille');
  }
  function ouvrirVerrou(){
    const v = document.getElementById('bq-verrou'); if(!v) return;
    v.remove();
    [...document.body.children].forEach(el=>{ el.inert = false; });
    document.documentElement.classList.remove('bq-verrouille');
  }
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'visible') verrouBeQuick(); });

  /* ---------- SUIVI DES PROGRÈS (7.3.0) ----------
     Pour le tableau de bord /admin : temps passé par matière (onglet visible
     et utilisé dans les 3 dernières minutes), réponses données (historique de
     progress.js) et, depuis le hub, la progression de chaque matière.
     Envoi toutes les 2 minutes et quand on quitte la page, directement à
     Supabase (rien ne passe par Netlify), avec le jeton de la messagerie :
     seule une clé valide écrit, et seulement sous son propre pseudo. */
  const SUIVI_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co/rest/v1/rpc/suivi_envoyer';
  const SUIVI_CLE = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
  const SUIVI_PAS = 15, SUIVI_INACTIF = 3*60*1000, SEPT_JOURS = 7*86400*1000;
  const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', {timeZone:'Europe/Paris', year:'numeric', month:'2-digit', day:'2-digit'});
  let suiviGeste = Date.now(), suiviEnvoi = false, progressionEnvoyee = 0;
  const lireJSON = (k, d)=>{ try{ const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; }catch(e){ return d; } };
  const ecrireJSON = (k, v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  function sujetSuivi(){
    const sid = document.documentElement.getAttribute('subject-id');
    if(sid) return sid;
    const f = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '') || 'index';
    return f === 'index' ? 'hub' : f.replace(/_/g, '-').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) || 'hub';
  }
  function compterTemps(){
    if(document.visibilityState !== 'visible' || Date.now() - suiviGeste > SUIVI_INACTIF) return;
    const a = lireJSON('suivi_attente', {}), k = JOUR_PARIS.format(new Date())+'|'+sujetSuivi();
    a[k] = (a[k] || 0) + SUIVI_PAS;
    ecrireJSON('suivi_attente', a);
  }
  /* même jeton que chat.js (localStorage « chat_jeton ») */
  async function jetonSuivi(){
    let pseudo = null; try{ pseudo = localStorage.getItem('lb_name'); }catch(e){}
    if(!pseudo || !pseudo.trim() || !navigator.onLine) return null;
    const j = lireJSON('chat_jeton', null);
    if(j && j.jeton && j.p === pseudo && j.exp - Date.now()/1000 > 3*86400) return j.jeton;
    const r = await fetch('/.netlify/functions/acces-jeton', {method:'POST', credentials:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({pseudo})}).catch(()=>null);
    if(!r || !r.ok) return null;
    const d = await r.json().catch(()=>({}));
    if(!d.jeton) return null;
    ecrireJSON('chat_jeton', {jeton:d.jeton, exp:d.exp, p:pseudo});
    return d.jeton;
  }
  /* Progression de chaque matière : seulement depuis le hub, qui connaît le
     nombre de leçons (MATIERES) et charge banque.js. */
  function photoProgression(){
    if(typeof MATIERES === 'undefined' || !Array.isArray(MATIERES) || !window.P || !P.completion || !window.BANQUE) return [];
    if(Date.now() - progressionEnvoyee < 10*60*1000) return [];
    return MATIERES.filter(m=>m.sid && m.nb).map(m=>{
      const c = P.completion(m.sid, m.nb);
      const ids = BANQUE.filter(q=>q.m === m.sid).map(q=>q.id);
      const b = P.bilanPlan ? P.bilanPlan(ids) : {};
      return {sujet:m.sid, pct:c.pct, l:c.lecons.n, lt:c.lecons.tot, q:c.quiz.n, qt:c.quiz.tot,
              t:c.test.fait ? c.test.pct : null, a:b.acquis|0, e:b.encours|0, v:b.aRevoir|0, xp:(P.etat(m.sid).xp)|0};
    });
  }
  async function envoyerSuivi(depart){
    if(suiviEnvoi || !navigator.onLine) return;
    const attente = lireJSON('suivi_attente', {});
    /* réponses données depuis le dernier envoi (7 jours au plus) */
    const prog = lireJSON('m1_progress_v1', {rep:[]});
    const depuis = Math.max(lireJSON('suivi_rep_t', 0) || 0, Date.now() - SEPT_JOURS);
    const lignes = {}, ligne = k=>(lignes[k] = lignes[k] || {s:0, r:0, b:0});
    let dernier = depuis;
    (prog.rep || []).forEach(r=>{
      if(!r || !r.m || !(r.t > depuis)) return;
      const l = ligne(JOUR_PARIS.format(new Date(r.t))+'|'+r.m); l.r++; if(r.ok) l.b++;
      if(r.t > dernier) dernier = r.t;
    });
    Object.keys(attente).forEach(k=>{ ligne(k).s += attente[k]; });
    const activite = Object.keys(lignes).map(k=>{ const [jour, sujet] = k.split('|'); const l = lignes[k];
      return {jour, sujet, s:Math.min(l.s, 3600), r:Math.min(l.r, 500), b:Math.min(l.b, 500)}; })
      .filter(x=>/^[a-z0-9-]{2,40}$/.test(x.sujet) && (x.s || x.r));
    const progression = photoProgression();
    if(!activite.length && !progression.length) return;
    suiviEnvoi = true;
    try{
      const jeton = await jetonSuivi(); if(!jeton) return;
      ecrireJSON('suivi_attente', {});                       // ce qui arrive pendant l'envoi repart au prochain
      const r = await fetch(SUIVI_URL, {method:'POST', keepalive:!!depart,
        headers:{apikey:SUIVI_CLE, Authorization:'Bearer '+jeton, 'Content-Type':'application/json'},
        body:JSON.stringify({p_activite:activite.slice(0, 80), p_progression:progression})}).catch(()=>null);
      if(r && r.ok){
        ecrireJSON('suivi_rep_t', dernier);
        if(progression.length) progressionEnvoyee = Date.now();
      }else{
        /* échec : on remet le temps en attente (les jours de plus d'une semaine sont abandonnés) */
        const a = lireJSON('suivi_attente', {}), limite = JOUR_PARIS.format(new Date(Date.now() - SEPT_JOURS));
        Object.keys(attente).forEach(k=>{ if(k.split('|')[0] >= limite) a[k] = (a[k] || 0) + attente[k]; });
        ecrireJSON('suivi_attente', a);
      }
    }finally{ suiviEnvoi = false; }
  }
  function demarrerSuivi(){
    ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'].forEach(t=>
      addEventListener(t, ()=>{ suiviGeste = Date.now(); }, {passive:true, capture:true}));
    setInterval(compterTemps, SUIVI_PAS*1000);
    setInterval(()=>envoyerSuivi(false), 2*60*1000);
    setTimeout(()=>envoyerSuivi(false), 8000);
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') envoyerSuivi(true); });
  }

  /* ---------- MESSAGERIE (7.1.0) ----------
     chat.js n'est chargé qu'au premier clic sur la bulle, ou en différé
     si cet appareil a déjà un jeton de messagerie (pour la pastille des
     non-lus). Sans jeton, rien n'est chargé : aucun coût. */
  function chargerChat(){ return chargerScript('chat.js').then(()=>window.M1Chat || null); }
  function ouvrirChat(){ fermerNotifs(); return chargerChat().then(c=>{ if(c) c.ouvrir(); }); }
  function basculerChat(e){
    if(e) e.stopPropagation();
    fermerNotifs();
    chargerChat().then(c=>{ if(c) c.basculer(); });
  }
  function majBulle(n){
    const p = document.getElementById('ds-chat-pastille'); if(p){ p.hidden = !n; p.textContent = n > 9 ? '9+' : String(n); }
    const b = document.getElementById('ds-chat'); if(b) b.setAttribute('aria-label', n ? 'Messagerie, '+n+' message'+(n>1?'s':'')+' non lu'+(n>1?'s':'') : 'Messagerie');
  }
  window.addEventListener('m1chat', e=>{ majBulle(e.detail ? e.detail.n : 0); majCloche(); });
  function demarrerChat(){
    /* lien d'une notification : /?chat=1 ouvre directement la messagerie */
    if(/[?&]chat=1\b/.test(location.search)){
      try{ const u = new URL(location.href); u.searchParams.delete('chat'); history.replaceState(history.state, '', u.pathname + u.search + u.hash); }catch(e){}
      ouvrirChat();
      return;
    }
    let j = null; try{ j = JSON.parse(localStorage.getItem('chat_jeton') || 'null'); }catch(e){}
    if(!j || !j.exp || j.exp * 1000 < Date.now() || !navigator.onLine) return;
    setTimeout(()=>{
      const go = ()=>chargerChat().then(c=>{ if(c) c.connecter(); });
      if('requestIdleCallback' in window) requestIdleCallback(go, {timeout:3000}); else go();
    }, 2000);
  }
  window.uiOuvrirChat = ouvrirChat;

  function init(){
    construireEntete();
    construireCours();
    construireVideos();
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
    setTimeout(signalerPseudo, 3000);
    demarrerChat();
    verrouBeQuick();
    demarrerSuivi();
    /* 7.2.0 : pas de zoom sur téléphone (pincer ni double-tap), le site est déjà à la bonne taille */
    document.addEventListener('gesturestart', e=>e.preventDefault(), {passive:false});
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('hashchange', ouvrirAncre);

})();
