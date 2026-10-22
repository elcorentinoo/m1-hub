/* ════════════════════════════════════════════════════════════
   sw.js — fonctionnement hors ligne du hub M1 MBAF

   ⚠️ LA VERSION CI-DESSOUS DOIT CHANGER À CHAQUE MISE À JOUR.
      Sans cela, les navigateurs servent l'ancienne version
      depuis leur cache.

   Convention (voir le lisez-moi) :
      MAJEURE  refonte ou fonctionnalité structurante
      MINEURE  nouvelle matière, nouvelle page
      CORRECTIF correction ou ajustement

   ⚠️ Cette valeur doit rester IDENTIQUE à VERSION_APP,
      en haut de ui.js.
   ════════════════════════════════════════════════════════════ */
const VERSION = '7.6.0';        // « Thaler »
const CACHE_APP  = 'm1-app-'+VERSION;      // les fichiers du site
const CACHE_EXT  = 'm1-ext-'+VERSION;      // polices et bibliothèques externes

/* Le cœur du site : mis en cache dès l'installation */
const FICHIERS = [
  './',
  'index.html',
  'marche_des_particuliers.html',
  'produits_derives.html',
  'produits_derives_2.html',
  'entrainement_changes.html',
  'entrainement_fiscal.html',
  'fiscalite_particulier.html',
  'droits_particuliers.html',
  'etudes_de_marche.html',
  'systeme_bancaire.html',
  'marketing_numerique.html',
  'es_banque.html',
  'glossaire.html',
  'revision.html',
  'stats.html',
  'classement.html',
  'bequick.html',
  'ressourcerie.html',
  'ui.css',
  'theme.css',
  'ui.js',
  'lb.js',
  'progress.js',
  'banque.js',
  'calendrier.js',
  'bequick.js',
  'formules.js',
  'chat.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  /* Copies locales des photos de matière : affichées si Unsplash ne répond pas */
  'img/accueil.webp',
  'img/sujet-droits-particuliers.webp',
  'img/sujet-etudes-marche.webp',
  'img/sujet-systeme-bancaire.webp',
  'img/sujet-fiscalite-particulier.webp',
  'img/sujet-produits-derives.webp',
  'img/sujet-produits-derives-2.webp',
  'img/sujet-marketing-numerique.webp',
  'img/sujet-es-banque.webp',
  'img/sujet-marche-particuliers.webp'
];

/* Domaines externes conservés au premier passage (polices, PDF.js, Mammoth, photos Unsplash, supabase-js) */
const EXTERNES = ['fonts.googleapis.com','fonts.gstatic.com','cdnjs.cloudflare.com','images.unsplash.com','cdn.jsdelivr.net'];

/* Ce qui ne doit JAMAIS être servi depuis le cache : les données vivantes */
const JAMAIS = ['supabase.co'];

self.addEventListener('install', e=>{
  e.waitUntil(
    caches.open(CACHE_APP)
      .then(c=>c.addAll(FICHIERS.map(f=>new Request(f, {cache:'reload'}))))
      .then(()=>self.skipWaiting())
      .catch(err=>console.warn('[sw] installation partielle', err))
  );
});

self.addEventListener('activate', e=>{
  e.waitUntil(
    caches.keys()
      .then(noms=>Promise.all(
        noms.filter(n=>n.startsWith('m1-') && n !== CACHE_APP && n !== CACHE_EXT)
            .map(n=>caches.delete(n))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message', e=>{
  if(e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);

  /* Les fonctions Netlify (notification de test) : toujours le réseau */
  if(url.pathname.startsWith('/.netlify/')) return;

  /* Les pages d'accès (clé, gestion /admin) : jamais en cache (6.5.0) */
  if(['/acces.html', '/admin', '/acces-admin.html'].includes(url.pathname)) return;

  /* Supabase : toujours le réseau, jamais de cache (classement, ressourcerie) */
  if(JAMAIS.some(d=>url.hostname.includes(d))) return;

  /* Polices et bibliothèques : le cache d'abord, sinon on récupère et on garde */
  if(EXTERNES.some(d=>url.hostname.includes(d))){
    e.respondWith(
      caches.match(req).then(hit=> hit || fetch(req).then(rep=>{
        if(rep && (rep.ok || rep.type === 'opaque')){
          const copie = rep.clone();
          caches.open(CACHE_EXT).then(c=>c.put(req, copie));
        }
        return rep;
      }).catch(()=>hit))
    );
    return;
  }

  /* Le site lui-même : le réseau d'abord (pour avoir la dernière version),
     le cache en secours dès que la connexion manque */
  e.respondWith(
    fetch(req).then(rep=>{
      /* 401 : cet appareil n'a pas (ou plus) de clé d'accès valide. On efface
         les copies hors ligne, pour qu'elles ne servent pas de porte dérobée. */
      if(rep && rep.status === 401 && url.origin === self.location.origin) caches.delete(CACHE_APP);
      if(rep && rep.ok && url.origin === self.location.origin){
        const copie = rep.clone();
        caches.open(CACHE_APP).then(c=>c.put(req, copie));
      }
      return rep;
    }).catch(()=>
      caches.match(req).then(hit=>
        hit || (req.mode === 'navigate' ? caches.match('index.html') : undefined)
      )
    )
  );
});


/* ═══════════ NOTIFICATIONS (6.0.0) ═══════════
   L'alerte BeQuick de 18 h 30 (bequick-notif) et celles du chat
   (chat-notif) portent leur propre texte. Si un appareil reçoit une
   notification illisible, on affiche un message neutre (7.1.1).
   Un clic ouvre (ou ramène au premier plan) la page. */
self.addEventListener('push', e=>{
  let m = {title:'🔔 Hub M1 MBAF', body:'Du nouveau sur le hub.', url:'/', tag:'hub'};
  try{ if(e.data) m = Object.assign(m, e.data.json()); }catch(err){}
  /* 7.2.0 : un message du chat met une pastille sur l'icône de l'app */
  const pastille = /^chat/.test(m.tag || '') && self.navigator.setAppBadge ? self.navigator.setAppBadge().catch(()=>{}) : null;
  e.waitUntil(Promise.all([pastille, self.registration.showNotification(m.title, {
    body:m.body, tag:m.tag, renotify:true, icon:'icons/icon-192.png', badge:'icons/badge-96.png',
    data:{url:m.url}
  })]));
});
self.addEventListener('notificationclick', e=>{
  e.notification.close();
  const cible = new URL((e.notification.data && e.notification.data.url) || '/bequick.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(liste=>{
    const ouvert = liste.find(c=>c.url.split('#')[0] === cible.split('#')[0]);
    if(ouvert) return ouvert.focus();
    const autre = liste.find(c=>new URL(c.url).origin === self.location.origin);
    if(autre && 'navigate' in autre) return autre.navigate(cible).then(c=>c && c.focus());
    return self.clients.openWindow(cible);
  }));
});
