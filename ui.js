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
  const VERSION_APP = '4.2.1';
  const NOM_VERSION = 'Sesterce';
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
      '<div class="ds-left">'+
        '<button class="ds-ic ds-burger" aria-label="Sommaire de la matière">'+icone(IC_BURG,'Sommaire')+'</button>'+
        '<a class="ds-logo" href="index.html"><span class="mk"></span>M1<b>MBAF</b></a>'+
      '</div>'+
      '<nav class="ds-nav" aria-label="Navigation principale">'+liens+'</nav>'+
      '<div class="ds-acts">'+
        '<span class="ds-slot" id="ds-slot"></span>'+
        '<button class="ds-ic" id="ds-rech" title="Recherche (Ctrl+K)">'+icone(IC_RECH,'Rechercher')+'</button>'+
        '<button class="ds-ic" id="ds-menu" aria-label="Ouvrir la navigation">'+icone(IC_MENU,'Menu')+'</button>'+
      '</div>';

    document.body.insertBefore(h, document.body.firstChild);
    document.getElementById('ds-rech').onclick = ouvrirRecherche;
    document.getElementById('ds-menu').onclick = ouvrir;

    /* on récupère les widgets de la page : progression, XP, identité */
    const slot = document.getElementById('ds-slot');
    ['.progress-wrap', '.xp', '#lb-id-slot', '#hub-id'].forEach(sel=>{
      const el = document.querySelector(sel);
      if(el && !slot.contains(el)) slot.appendChild(el);
    });

    /* le bouton « sommaire » ne sert que sur les pages à barre latérale */
    const burger = h.querySelector('.ds-burger');
    if(document.querySelector('.sidebar')){
      burger.onclick = ()=>{ if(typeof window.toggleSidebar === 'function') window.toggleSidebar(); };
    } else {
      burger.remove();
    }

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
      '<div class="ds-fv">v'+VERSION_APP+' « '+NOM_VERSION+' »</div>';
    document.body.appendChild(f);
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
    {t:'Classement', s:'Scores de la promo', u:'classement.html', i:'🏆'}
  ];
  const norm = s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  function indexComplet(){
    const out = INDEX.slice();
    // les leçons et le glossaire, si banque.js est chargé
    if(window.CARTES) window.CARTES.forEach(c=>{
      out.push({t:c.q, s:(c.d||'')+' · '+(c.ex||'').slice(0,70), u:fichierDe(c.m)+'#'+c.l, i:'🔤', g:'Glossaire'});
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
  const LABM = {'marche-particuliers':'Marché des Particuliers','produits-derives':'Produits Dérivés','marketing-numerique':'Marketing Numérique','es-banque':'ES Banque','fiscalite-particulier':'Fiscalité du Particulier','droits-particuliers':'Droits des Particuliers'};
  function fichierDe(m){
    return {'marche-particuliers':'marche_des_particuliers.html','produits-derives':'produits_derives.html','marketing-numerique':'marketing_numerique.html','es-banque':'es_banque.html','fiscalite-particulier':'fiscalite_particulier.html','droits-particuliers':'droits_particuliers.html'}[m] || 'index.html';
  }

  function ouvrirRecherche(){
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
    const idx = indexComplet();
    let sel = 0, res = [];
    function dessine(){
      const v = norm(q.value.trim());
      res = (v ? idx.filter(o=>norm(o.t+' '+(o.s||'')).includes(v)) : idx.slice(0,8)).slice(0,30);
      sel = 0;
      const host = document.getElementById('ui-pal-r');
      host.innerHTML = res.length
        ? res.map((o,i)=>'<a class="ui-pal-i'+(i===0?' sel':'')+'" href="'+o.u+'">'+
            '<span class="pi">'+o.i+'</span><span class="pt">'+echap(o.t)+
            '<span class="ps">'+echap(o.s||'')+'</span></span></a>').join('')
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

  /* ---------- exports ---------- */
  window.uiOuvrirMenu = ouvrir;
  window.uiFermerMenu = fermer;
  window.uiSetTheme   = function(){};   /* conservé : le thème ne change plus */
  window.uiTheme      = function(){ return 'dark'; };

  document.addEventListener('keydown', e=>{
    if(e.key==='Escape') fermer();
    if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); ouvrirRecherche(); }
  });

  function init(){
    construireEntete();
    construirePied();
    appliquerTheme();
    enregistrerSW();
    majReseau();
    setTimeout(ouvrirAncre, 60);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.addEventListener('hashchange', ouvrirAncre);

})();
