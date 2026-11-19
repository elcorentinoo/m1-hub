/* ════════════════════════════════════════════════════════════════
   archives.js — matières archivées du M1 (8.4.0)

   Une matière archivée disparaît pour la promo : hub (Mes cours,
   Entraînement), menu et recherche, tirage BeQuick, révision du jour,
   statistiques. RIEN n'est supprimé : les pages restent ouvrables par
   lien direct (et depuis /admin), leurs questions restent dans
   banque.js, la progression de chacun est conservée.

   OÙ SE RÈGLE LA LISTE ?
   · D'abord dans /admin, carte « Archives » : un interrupteur
     « Visible / Archivée » par matière (table site_archives dans
     Supabase, voir supabase/archives.sql). C'est la liste qui fait foi.
   · DEFAUT ci-dessous ne sert que de repli : tant que archives.sql n'a
     pas été lancé, ou hors connexion sans liste en mémoire.
     Pour réactiver une matière sans /admin : retirer sa ligne de DEFAUT.

   Une « matière » peut couvrir plusieurs pages (PAGES) : Produits
   Dérivés I emporte aussi son générateur de change ; « partiel-derives »
   est la page de révision du partiel (pas un cours).
   ════════════════════════════════════════════════════════════════ */
(function(){
  /* Repli : archivées à la 8.4.0 (partiel du 18 novembre 2026 passé). */
  const DEFAUT = ['produits-derives', 'produits-derives-2', 'partiel-derives'];

  /* Les pages de chaque matière qu'on peut archiver */
  const PAGES = {
    'marche-particuliers':   ['marche_des_particuliers.html'],
    'produits-derives':      ['produits_derives.html', 'entrainement_changes.html'],
    'produits-derives-2':    ['produits_derives_2.html'],
    'partiel-derives':       ['partiel_derives.html'],
    'marketing-numerique':   ['marketing_numerique.html'],
    'es-banque':             ['es_banque.html'],
    'fiscalite-particulier': ['fiscalite_particulier.html', 'entrainement_fiscal.html'],
    'droits-particuliers':   ['droits_particuliers.html'],
    'etudes-marche':         ['etudes_de_marche.html'],
    'systeme-bancaire':      ['systeme_bancaire.html'],
    'organismes-tutelle':    ['organismes_tutelle.html'],
    'entreprise-banque':     ['entreprise_banque.html']
  };
  const NOMS = {
    'marche-particuliers':'Marché des Particuliers', 'produits-derives':'Produits Dérivés I',
    'produits-derives-2':'Produits Dérivés II', 'partiel-derives':'Réviser le partiel (Produits Dérivés)',
    'marketing-numerique':'Marketing Numérique', 'es-banque':'ES Banque',
    'fiscalite-particulier':'Fiscalité du Particulier', 'droits-particuliers':'Droits des Particuliers',
    'etudes-marche':'Études de marché', 'systeme-bancaire':'Le système bancaire français',
    'organismes-tutelle':'Les organismes de tutelle', 'entreprise-banque':"L'entreprise banque"
  };

  const CACHE = 'm1_archives_v1', DUREE = 3600e3;     // liste serveur gardée 1 h
  const URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
  const CLE = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';

  let sids = DEFAUT.slice(), source = 'defaut';
  try{
    const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
    if(c && Array.isArray(c.sids)){ sids = c.sids; source = 'cache'; }
  }catch(e){}

  const fichier = f => String(f||'').split('#')[0].split('?')[0].split('/').pop();
  function pagesArchivees(){ return sids.flatMap(s=>PAGES[s] || []); }

  let enVol = null;
  /* Lit la liste à jour sur le serveur. force : ignore le cache (BeQuick
     avant de figer la série du soir). Rend la liste (repli si échec). */
  function charger(force){
    try{
      const c = JSON.parse(localStorage.getItem(CACHE) || 'null');
      if(!force && c && Date.now() - c.t < DUREE) return Promise.resolve(sids);
    }catch(e){}
    if(enVol) return enVol;
    enVol = fetch(URL+'/rest/v1/rpc/site_archives_liste', {method:'POST',
        headers:{apikey:CLE, Authorization:'Bearer '+CLE, 'Content-Type':'application/json'}, body:'{}'})
      .then(r=>r.ok ? r.json() : Promise.reject(r.status))
      .then(l=>{
        if(!Array.isArray(l)) throw 0;
        const neuf = l.filter(x=>x && x.archive).map(x=>String(x.sid)).sort();
        const change = neuf.join(',') !== sids.slice().sort().join(',');
        sids = neuf; source = 'serveur';
        try{ localStorage.setItem(CACHE, JSON.stringify({t:Date.now(), sids})); }catch(e){}
        if(change) try{ window.dispatchEvent(new CustomEvent('m1archives', {detail:{sids:sids.slice()}})); }catch(e){}
        return sids;
      })
      .catch(()=>sids)
      .finally(()=>{ enVol = null; });
    return enVol;
  }

  window.ARCHIVES = {
    DEFAUT, PAGES, NOMS, charger,
    get sids(){ return sids.slice(); },
    get source(){ return source; },
    /* sid de matière archivé ? */
    estArchive: sid => sids.includes(sid),
    /* page archivée ? (« produits_derives.html#l3 » compris) */
    pageArchivee: f => pagesArchivees().includes(fichier(f))
  };
  charger(false);
})();
