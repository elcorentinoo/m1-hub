/* ════════════════════════════════════════════════════════════
   niveau.js — le niveau d'études de l'appareil (8.0.0, hub multi-promos)
   Trois niveaux : Licence (LP ABF), M1, M2. Chacun a son espace :
   licence.html, index.html (le hub M1, adresse inchangée), m2.html.

   Ordre de lecture du niveau :
   1. celui de la clé d'accès, posé par la porte dans le cookie lisible
      « acces_info » (format formulaire : statut=cle&niveau=m1&annee=…,
      ou statut=essai&fin=…&m1=… pendant l'essai de 24 h) ;
   2. celui choisi sur niveaux.html (localStorage « niveau-choisi ») ;
   3. sinon M1 : une clé M1 actuelle n'est jamais redirigée.

   Ce fichier ne pose rien sur la page : chaque espace porte son
   data-niveau en dur sur <html>.
   ════════════════════════════════════════════════════════════ */
(function(){
  const NIVEAUX = ['licence', 'm1', 'm2'];
  const ESPACES = {licence:'licence.html', m1:'index.html', m2:'m2.html'};
  const valide = n => NIVEAUX.includes(n) ? n : null;

  function lireLocal(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function ecrireLocal(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }
  function lireCookie(n){
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)'+n+'=([^;]*)'));
    return m ? m[1] : null;
  }

  /* le contenu du cookie acces_info, encodé en bloc ou champ par champ */
  function info(){
    let v = lireCookie('acces_info');
    if(!v) return {};
    if(!v.includes('=')){ try{ v = decodeURIComponent(v); }catch(e){ return {}; } }
    try{ return Object.fromEntries(new URLSearchParams(v)); }catch(e){ return {}; }
  }
  const cle = () => info().statut === 'cle' ? valide(info().niveau) : null;
  const essai = () => info().statut === 'essai';
  const choisi = () => valide(lireLocal('niveau-choisi'));

  window.NIVEAU = {
    liste: NIVEAUX,
    espace: n => ESPACES[valide(n) || 'm1'],
    info, cle, choisi, essai,
    courant: () => cle() || choisi() || 'm1',
    /* retenu sur l'appareil ; le M2, encore vide, ne l'est jamais */
    choisir(n){ if(valide(n) && n !== 'm2') ecrireLocal('niveau-choisi', n); }
  };
})();
