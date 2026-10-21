/* ════════════════════════════════════════════════════════════
   chat.js — la messagerie de la promo (7.1.0)
   Un salon unique, « Général ». Chargé par ui.js au premier clic sur
   la bulle 💬 (ou en différé si cet appareil a déjà un jeton, pour
   afficher les non-lus).

   · Accès : seuls les appareils avec une clé d'accès valide lisent et
     écrivent. La fonction Netlify « acces-jeton » (une fois par mois)
     remet un jeton Supabase qui porte la clé et le pseudo ; la base
     vérifie la clé à chaque lecture et à chaque envoi (supabase/chat.sql).
   · Les messages passent directement entre le navigateur et Supabase
     (Realtime) : aucun coût Netlify par message.
   · Non-lus : localStorage « chat_vu » = {general: dernier id vu}.
   · Notifications : une entrée dans la cloche, et une notification du
     système si l'autorisation est déjà accordée (jamais redemandée),
     quand le panneau est fermé ou l'onglet en arrière-plan.
   ════════════════════════════════════════════════════════════ */
(function(){
  if(window.M1Chat) return;

  const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
  const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
  const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const SALON = 'general';
  const MAX = 1000;
  const TROIS_JOURS = 3 * 86400;

  let client = null, canal = null, moi = null;
  let pret = null;                 // promesse de connexion (une seule à la fois)
  let messages = new Map();        // id → message affiché
  let filCharge = false;
  let nonlus = [];                 // messages des autres, arrivés après le dernier vu
  let ouvert = false;
  let envoiEnCours = false;
  let dernierBouton = null;

  /* ---------- petits outils ---------- */
  const $ = id => document.getElementById(id);
  const lire = (k, d) => { try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } };
  const ecrire = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const maintenant = () => Math.floor(Date.now()/1000);
  function echap(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  /* Texte échappé, puis liens http(s) rendus cliquables. */
  function rendreTexte(t){
    return echap(t).replace(/\bhttps?:\/\/[^\s<]+/g, url=>{
      const fin = (url.match(/(?:[.,;:!?)\]»]|&#39;|&quot;)+$/) || [''])[0];
      const lien = fin ? url.slice(0, -fin.length) : url;
      return '<a href="'+lien+'" target="_blank" rel="noopener noreferrer">'+lien+'</a>'+fin;
    });
  }
  function heure(iso){
    const d = new Date(iso), a = new Date();
    const hm = String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
    if(d.toDateString() === a.toDateString()) return hm;
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+' · '+hm;
  }
  function decoder(jeton){
    try{
      const b = atob(jeton.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'));
      return JSON.parse(new TextDecoder().decode(Uint8Array.from(b, c=>c.charCodeAt(0))));
    }catch(e){ return null; }
  }
  const estMoi = m => !!moi && (m.cle === moi.cle || String(m.pseudo).toLowerCase() === String(moi.pseudo).toLowerCase());
  const visible = () => ouvert && document.visibilityState === 'visible';
  const erreur = code => Object.assign(new Error(code), {code});

  /* ---------- 1. LE JETON (fonction Netlify acces-jeton) ---------- */
  async function obtenirJeton(forcer){
    let pseudo = null; try{ pseudo = localStorage.getItem('lb_name'); }catch(e){}
    if(!pseudo || !pseudo.trim()) throw erreur('pseudo');
    const j = lire('chat_jeton', null);
    if(!forcer && j && j.jeton && j.p === pseudo && j.exp - maintenant() > TROIS_JOURS) return j.jeton;
    if(!navigator.onLine) throw erreur('horsligne');
    let r;
    try{
      r = await fetch('/.netlify/functions/acces-jeton', {method:'POST', credentials:'same-origin',
        headers:{'Content-Type':'application/json'}, body:JSON.stringify({pseudo})});
    }catch(e){ throw erreur(navigator.onLine ? 'serveur' : 'horsligne'); }
    const d = await r.json().catch(()=>({}));
    if(r.status === 401){ try{ localStorage.removeItem('chat_jeton'); }catch(e){} throw erreur('cle'); }
    if(r.status === 400 && d.erreur === 'pseudo') throw erreur('pseudo');
    if(d.erreur === 'config') throw erreur('config');
    if(!r.ok || !d.jeton) throw erreur('serveur');
    ecrire('chat_jeton', {jeton:d.jeton, exp:d.exp, p:pseudo});
    return d.jeton;
  }

  /* ---------- 2. LA BIBLIOTHÈQUE SUPABASE (une fois, à la demande) ---------- */
  let sdk = null;
  function chargerSDK(){
    if(window.supabase && window.supabase.createClient) return Promise.resolve();
    if(sdk) return sdk;
    sdk = new Promise((ok, ko)=>{
      const s = document.createElement('script');
      s.src = SDK; s.async = true;
      s.onload = ()=> window.supabase && window.supabase.createClient ? ok() : ko(erreur('serveur'));
      s.onerror = ()=>{ sdk = null; s.remove(); ko(erreur(navigator.onLine ? 'serveur' : 'horsligne')); };
      document.head.appendChild(s);
    });
    return sdk;
  }

  /* ---------- 3. LA CONNEXION ---------- */
  function connecter(forcer){
    if(pret && !forcer) return pret;
    pret = (async ()=>{
      if(!navigator.onLine) throw erreur('horsligne');
      const jeton = await obtenirJeton(forcer);
      await chargerSDK();
      const p = decoder(jeton) || {};
      moi = {cle:p.cle || p.sub, pseudo:p.pseudo || ''};
      if(canal && client){ try{ client.removeChannel(canal); }catch(e){} }
      client = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
        global:{headers:{Authorization:'Bearer '+jeton}},
        auth:{persistSession:false, autoRefreshToken:false, detectSessionInUrl:false}
      });
      client.realtime.setAuth(jeton);
      await chargerNonLus();
      abonner();
      return client;
    })();
    pret.catch(()=>{ pret = null; });
    return pret;
  }

  /* Ce qui est arrivé depuis le dernier passage (pour la pastille). */
  async function chargerNonLus(){
    const vu = (lire('chat_vu', {}) || {})[SALON];
    if(typeof vu !== 'number'){
      const {data, error} = await client.from('chat_messages').select('id').eq('salon', SALON).order('cree', {ascending:false}).limit(1);
      if(!error) majVu(data && data[0] ? data[0].id : 0);
      return;
    }
    const {data, error} = await client.from('chat_messages').select('id,salon,cle,pseudo,texte,cree')
      .eq('salon', SALON).gt('id', vu).order('cree', {ascending:false}).limit(50);
    if(error) return;
    nonlus = (data || []).filter(m=>!estMoi(m)).reverse();
    signaler();
  }

  function abonner(){
    canal = client.channel('chat')
      .on('postgres_changes', {event:'INSERT', schema:'public', table:'chat_messages'}, p=>recu(p.new))
      .on('postgres_changes', {event:'DELETE', schema:'public', table:'chat_messages'}, p=>retirer(p.old && p.old.id))
      .subscribe(etat=>{
        if(etat === 'SUBSCRIBED' && ouvert && filCharge) chargerFil(true);   // reconnexion : on rattrape
      });
  }

  /* ---------- 4. LES MESSAGES ---------- */
  function majVu(id){
    const v = lire('chat_vu', {}) || {};
    if(typeof v[SALON] !== 'number' || id > v[SALON]){ v[SALON] = id; ecrire('chat_vu', v); }
  }
  function toutVu(){
    let max = 0; messages.forEach((m, id)=>{ if(id > max) max = id; });
    nonlus.forEach(m=>{ if(m.id > max) max = m.id; });
    if(max) majVu(max);
    if(nonlus.length){ nonlus = []; signaler(); }
  }
  function recu(m){
    if(!m || m.salon !== SALON || !m.id) return;
    const neuf = !messages.has(m.id) && !nonlus.some(x=>x.id === m.id);
    if(filCharge){ messages.set(m.id, m); dessinerFil(); }
    if(!neuf) return;
    if(visible()){ majVu(m.id); return; }
    if(estMoi(m)) return;
    nonlus.push(m); signaler();
    notifierSysteme(m);
  }
  function retirer(id){
    if(!id) return;
    if(messages.delete(id)) dessinerFil();
    const n = nonlus.length; nonlus = nonlus.filter(m=>m.id !== id);
    if(n !== nonlus.length) signaler();
  }
  async function chargerFil(silencieux){
    if(!silencieux) etat('chargement');
    const {data, error} = await client.from('chat_messages').select('id,salon,cle,pseudo,texte,cree')
      .eq('salon', SALON).order('cree', {ascending:false}).limit(60);
    if(error) throw erreur(/JWT|401/i.test(error.message||'') ? 'jeton' : 'serveur');
    messages = new Map((data || []).reverse().map(m=>[m.id, m]));
    filCharge = true;
    etat(null);
    dessinerFil(true);
    if(visible()) toutVu();
  }

  /* ---------- 5. PRÉVENIR : pastille, cloche, notification système ---------- */
  function signaler(){
    window.dispatchEvent(new CustomEvent('m1chat', {detail:{n:nonlus.length}}));
  }
  /* Entrée de la cloche : « Léa a envoyé un message », « Léa et 2 autres… » */
  function alertes(){
    if(!nonlus.length) return [];
    const noms = [];
    for(let i = nonlus.length - 1; i >= 0; i--){ const p = nonlus[i].pseudo; if(!noms.includes(p)) noms.push(p); }
    const n = nonlus.length, dernier = nonlus[n-1];
    const titre = noms.length === 1
      ? noms[0]+(n === 1 ? ' a envoyé un message' : ' a envoyé '+n+' messages')
      : noms[0]+' et '+(noms.length-1)+' autre'+(noms.length > 2 ? 's' : '')+' ont envoyé des messages';
    const extrait = dernier.texte.length > 90 ? dernier.texte.slice(0, 88)+'…' : dernier.texte;
    return [{id:'chat-'+dernier.id, ico:'💬', titre, texte:'Messagerie · « '+extrait.replace(/\s+/g,' ')+' »', url:'index.html?chat=1', chat:true}];
  }
  function notifierSysteme(m){
    if(visible() || estMoi(m)) return;
    if(!('Notification' in window) || Notification.permission !== 'granted' || !('serviceWorker' in navigator)) return;
    /* plusieurs onglets ouverts : un seul prévient */
    if((lire('chat_notif', 0) || 0) >= m.id) return;
    ecrire('chat_notif', m.id);
    navigator.serviceWorker.ready.then(r=>r.showNotification('💬 Messagerie M1', {
      body:m.pseudo+' a envoyé un message', tag:'chat', renotify:true,
      icon:'icons/icon-192.png', badge:'icons/icon-192.png', data:{url:'/?chat=1'}
    })).catch(()=>{});
  }

  /* ---------- 6. LE PANNEAU ---------- */
  const IC_ENVOI = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/></svg>';
  function construirePanneau(){
    let p = $('chat'); if(p) return p;
    p = document.createElement('aside');
    p.id = 'chat'; p.className = 'chat'; p.hidden = true;
    p.setAttribute('role', 'dialog'); p.setAttribute('aria-labelledby', 'chat-titre');
    p.innerHTML =
      '<div class="chat-tete">'+
        '<span class="chat-ico" aria-hidden="true">💬</span>'+
        '<div class="chat-tt"><b id="chat-titre">Messagerie</b><small>Général · la promo M1 MBAF</small></div>'+
        '<button type="button" class="chat-x" id="chat-x" aria-label="Fermer la messagerie">✕</button>'+
      '</div>'+
      '<div class="chat-bandeau" id="chat-bandeau" hidden></div>'+
      '<div class="chat-fil" id="chat-fil" role="log" aria-live="polite" aria-label="Messages" tabindex="0"></div>'+
      '<form class="chat-saisie" id="chat-form" autocomplete="off">'+
        '<textarea id="chat-txt" rows="1" maxlength="'+MAX+'" placeholder="Écrire un message…" aria-label="Ton message" aria-describedby="chat-aide"></textarea>'+
        '<button type="submit" class="chat-envoi" id="chat-envoi" aria-label="Envoyer">'+IC_ENVOI+'</button>'+
      '</form>'+
      '<div class="chat-aide" id="chat-aide"><span>Entrée pour envoyer · Maj + Entrée pour un retour à la ligne</span><span id="chat-compte"></span></div>';
    document.body.appendChild(p);
    $('chat-x').onclick = fermer;
    $('chat-form').onsubmit = e=>{ e.preventDefault(); envoyer(); };
    const t = $('chat-txt');
    t.addEventListener('keydown', e=>{
      if(e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); envoyer(); }
    });
    t.addEventListener('input', ()=>{ ajuster(); compter(); });
    $('chat-fil').addEventListener('click', e=>{
      const b = e.target.closest('[data-suppr]'); if(b) supprimer(+b.dataset.suppr, b);
    });
    return p;
  }
  function ajuster(){
    const t = $('chat-txt'); if(!t) return;
    t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140)+'px';
  }
  function compter(){
    const t = $('chat-txt'), c = $('chat-compte'); if(!t || !c) return;
    const n = Array.from(t.value).length;
    c.textContent = n > MAX - 150 ? n+' / '+MAX : '';
  }
  const ETATS = {
    chargement:'Connexion à la messagerie…',
    pseudo:'Choisis d\'abord un pseudo sur <a href="index.html">l\'accueil</a> pour rejoindre la messagerie.',
    cle:'Le chat est réservé aux appareils avec une clé d\'accès.',
    horsligne:'Le chat demande une connexion.',
    config:'La messagerie n\'est pas encore activée sur le serveur. Reviens un peu plus tard.',
    serveur:'La messagerie ne répond pas pour l\'instant.',
    jeton:'La messagerie ne répond pas pour l\'instant.'
  };
  /* null = tout va bien ; sinon un message à la place du fil */
  function etat(code){
    const f = $('chat-fil'); if(!f) return;
    const bloque = !!code;
    $('chat-txt').disabled = bloque && code !== 'chargement';
    $('chat-envoi').disabled = bloque;
    if(!code) return;
    filCharge = false;
    const reessayer = ['serveur','jeton','horsligne'].includes(code) ? '<button type="button" class="chat-b" id="chat-re">Réessayer</button>' : '';
    f.innerHTML = '<div class="chat-etat'+(code === 'chargement' ? '' : ' fort')+'">'+(ETATS[code] || ETATS.serveur)+reessayer+'</div>';
    const r = $('chat-re'); if(r) r.onclick = ()=>demarrer(true);
  }
  function bandeau(txt){
    const b = $('chat-bandeau'); if(!b) return;
    b.hidden = !txt; b.textContent = txt || '';
  }
  function enBas(f){ return f.scrollHeight - f.scrollTop - f.clientHeight < 60; }
  function dessinerFil(versLeBas){
    const f = $('chat-fil'); if(!f || !filCharge) return;
    const bas = versLeBas || enBas(f);
    const admin = (()=>{ try{ return !!sessionStorage.getItem('m1_admin'); }catch(e){ return false; } })();
    const liste = [...messages.values()].sort((a, b)=>a.id - b.id);
    if(!liste.length){
      f.innerHTML = '<div class="chat-etat">Aucun message pour l\'instant.<br>Lance la conversation !</div>';
      return;
    }
    let prec = null;
    f.innerHTML = liste.map(m=>{
      const suite = prec && prec.pseudo === m.pseudo && (new Date(m.cree) - new Date(prec.cree)) < 5 * 60000;
      prec = m;
      const mien = estMoi(m);
      return '<div class="chat-m'+(mien ? ' moi' : '')+(suite ? ' suite' : '')+'" data-id="'+m.id+'">'+
        '<div class="chat-meta"><b>'+echap(m.pseudo)+'</b><time datetime="'+echap(m.cree)+'">'+heure(m.cree)+'</time>'+
          (admin ? '<button type="button" class="chat-suppr" data-suppr="'+m.id+'" aria-label="Supprimer le message de '+echap(m.pseudo)+'">Supprimer</button>' : '')+
        '</div>'+
        '<div class="chat-bulle">'+rendreTexte(m.texte)+'</div>'+
      '</div>';
    }).join('');
    if(bas) f.scrollTop = f.scrollHeight;
  }

  /* ---------- 7. ENVOYER ---------- */
  async function envoyer(essai){
    if(envoiEnCours && !essai) return;
    const t = $('chat-txt'), b = $('chat-envoi');
    const texte = t.value.trim();
    if(!texte) return;
    if(Array.from(texte).length > MAX){ bandeau('Ton message dépasse '+MAX+' caractères.'); return; }
    if(!navigator.onLine){ bandeau('Le chat demande une connexion.'); return; }
    envoiEnCours = true; b.disabled = true; bandeau('');
    try{
      await connecter();
      const {data, error} = await client.from('chat_messages')
        .insert({salon:SALON, cle:moi.cle, pseudo:moi.pseudo, texte}).select();
      if(error){
        const msg = String(error.message || '');
        if(!essai && (/JWT|expired/i.test(msg) || error.code === 'PGRST301')){
          await connecter(true); envoiEnCours = false; return envoyer(true);
        }
        if(error.code === '42501' || /row-level security/i.test(msg)) throw new Error('Envoi refusé : la clé d\'accès de cet appareil n\'est plus valide.');
        if(error.code === 'P0001') throw new Error('Doucement : trop de messages d\'affilée. Patiente quelques secondes.');
        throw new Error('Le message n\'est pas parti. Réessaie dans un instant.');
      }
      t.value = ''; ajuster(); compter();
      if(data && data[0]){ recu(data[0]); majVu(data[0].id); }
      const f = $('chat-fil'); if(f) f.scrollTop = f.scrollHeight;
    }catch(e){
      bandeau(e.code ? (ETATS[e.code] || ETATS.serveur).replace(/<[^>]+>/g, '') : e.message);
    }finally{
      envoiEnCours = false; b.disabled = false;
      if(ouvert) t.focus();
    }
  }

  /* ---------- 8. MODÉRATION (Corentin, après passage par /admin) ---------- */
  async function supprimer(id, bouton){
    let mdp = null; try{ mdp = sessionStorage.getItem('m1_admin'); }catch(e){}
    if(!mdp || !id || !confirm('Supprimer ce message pour tout le monde ?')) return;
    bouton.disabled = true;
    try{
      const r = await fetch('/.netlify/functions/acces-admin', {method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({mdp, action:'chat_supprimer', id})});
      if(r.status === 401){ try{ sessionStorage.removeItem('m1_admin'); }catch(e){} throw new Error('Mot de passe d\'administration refusé : repasse par /admin.'); }
      if(!r.ok) throw new Error('Suppression impossible pour l\'instant.');
      retirer(id);
    }catch(e){ bouton.disabled = false; bandeau(e.message); }
  }

  /* ---------- 9. OUVRIR / FERMER ---------- */
  async function demarrer(forcer){
    try{
      if(!navigator.onLine) throw erreur('horsligne');
      if(!filCharge || forcer) etat('chargement');
      await connecter(forcer);
      await chargerFil(filCharge && !forcer);
    }catch(e){
      if(e.code === 'jeton' && !forcer) return demarrer(true);
      etat(e.code || 'serveur');
    }
  }
  function ouvrir(){
    const p = construirePanneau();
    if(!ouvert) dernierBouton = document.activeElement;
    ouvert = true; p.hidden = false;
    document.documentElement.classList.add('chat-ouvert');
    const b = document.getElementById('ds-chat'); if(b) b.setAttribute('aria-expanded', 'true');
    bandeau('');
    setTimeout(()=>{ const t = $('chat-txt'); if(t && !t.disabled) t.focus(); else p.querySelector('.chat-x').focus(); }, 30);
    demarrer();
    if(filCharge) toutVu();
  }
  function fermer(){
    const p = $('chat'); if(!p || !ouvert) return;
    ouvert = false; p.hidden = true;
    document.documentElement.classList.remove('chat-ouvert');
    const b = document.getElementById('ds-chat'); if(b) b.setAttribute('aria-expanded', 'false');
    const retour = (dernierBouton && document.contains(dernierBouton) && dernierBouton !== document.body) ? dernierBouton : b;
    if(retour && retour.focus) retour.focus();
  }
  function basculer(){ ouvert ? fermer() : ouvrir(); }

  document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && ouvert){ e.preventDefault(); fermer(); } });
  document.addEventListener('visibilitychange', ()=>{ if(visible() && filCharge) toutVu(); });
  addEventListener('offline', ()=>{ if(ouvert) bandeau('Le chat demande une connexion.'); });
  addEventListener('online', ()=>{ bandeau(''); if(ouvert) demarrer(); else if(pret === null && lire('chat_jeton', null)) connecter().catch(()=>{}); });
  /* le pseudo a changé dans un autre onglet : nouveau jeton au prochain passage */
  addEventListener('storage', e=>{ if(e.key === 'lb_name'){ pret = null; } });

  window.M1Chat = {
    ouvrir, fermer, basculer, alertes,
    connecter: ()=>connecter().catch(()=>{}),
    nonLus: ()=>nonlus.length
  };
})();
