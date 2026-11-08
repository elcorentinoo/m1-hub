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
   · 7.2.0 : réactions (un appui sur un message), réponses citées,
     « Léa écrit… » et nombre de connectés (Realtime : broadcast et
     presence, rien n'est stocké), @mentions surlignées et proposées à
     la saisie, chiffre des non-lus sur l'icône de l'app. Tables et
     règles : supabase/chat-plus.sql.
   ════════════════════════════════════════════════════════════ */
(function(){
  if(window.M1Chat) return;

  const SUPA_URL = 'https://vrlvtcydgdyrcljfgasg.supabase.co';
  const SUPA_KEY = 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK';
  const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
  const SALON = 'general';
  const MAX = 1000;
  const TROIS_JOURS = 3 * 86400;
  const REACTIONS = ['👍','❤️','😂','😮','😢','🔥'];   // mêmes valeurs que supabase/chat-plus.sql

  let client = null, canal = null, moi = null;
  let pret = null;                 // promesse de connexion (une seule à la fois)
  let messages = new Map();        // id → message affiché
  let filCharge = false;
  let nonlus = [];                 // messages des autres, arrivés après le dernier vu
  let ouvert = false;
  let envoiEnCours = false;
  let dernierBouton = null;
  let reactionsOk = false;         // la table chat_reactions existe (supabase/chat-plus.sql lancé)
  let reactions = new Map();       // id du message → [{pseudo_cle, pseudo, emoji}]
  let parents = new Map();         // messages cités mais hors du fil chargé
  let reponse = null;              // message auquel on répond
  let actionsPour = null;          // message dont la barre de réactions est ouverte
  let presents = [];               // pseudos connectés en ce moment
  const ecrivent = new Map();      // pseudo → minuterie « écrit… »
  let dernierEcrit = 0;

  /* ---------- petits outils ---------- */
  const $ = id => document.getElementById(id);
  const lire = (k, d) => { try{ const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); }catch(e){ return d; } };
  const ecrire = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} };
  const maintenant = () => Math.floor(Date.now()/1000);
  function echap(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  /* Texte échappé, liens http(s) rendus cliquables, @mentions en gras. */
  let reMention = null, cleMention = '';
  function rendreTexte(t){
    const html = echap(t).replace(/\bhttps?:\/\/[^\s<]+/g, url=>{
      const fin = (url.match(/(?:[.,;:!?)\]»]|&#39;|&quot;)+$/) || [''])[0];
      const lien = fin ? url.slice(0, -fin.length) : url;
      return '<a href="'+lien+'" target="_blank" rel="noopener noreferrer">'+lien+'</a>'+fin;
    });
    const noms = pseudosConnus();
    if(!noms.length || html.indexOf('@') < 0) return html;
    const k = noms.join('\n');
    if(k !== cleMention){
      cleMention = k;
      reMention = new RegExp('@('+noms.slice().sort((a, b)=>b.length - a.length)
        .map(p=>echap(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')+')(?![\\p{L}\\p{N}])', 'giu');
    }
    const lui = moi ? String(moi.pseudo).toLowerCase() : '';
    return html.split(/(<a [^>]*>[^<]*<\/a>)/).map((bout, i)=> i % 2 ? bout :
      bout.replace(reMention, (m, p)=>'<b class="chat-at'+(echap(lui) === p.toLowerCase() ? ' moi' : '')+'">'+m+'</b>')).join('');
  }
  /* Pseudos vus dans le fil ou connectés, sans doublon (casse ignorée). */
  function pseudosConnus(){
    const vus = new Map();
    const ajouter = p=>{ p = String(p || '').trim(); if(p.length >= 2 && !vus.has(p.toLowerCase())) vus.set(p.toLowerCase(), p); };
    if(moi) ajouter(moi.pseudo);
    presents.forEach(ajouter);
    messages.forEach(m=>ajouter(m.pseudo));
    return [...vus.values()].sort((a, b)=>a.localeCompare(b, 'fr'));
  }
  const sansAccent = s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const extrait = (t, n)=>{ t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1)+'…' : t; };
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
      /* réactions : seulement si la table existe déjà (sinon le canal entier échouerait) */
      const t = await client.from('chat_reactions').select('message_id').limit(1);
      reactionsOk = !t.error;
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
    const ch = client.channel('chat', {config:{presence:{key:String(moi.pseudo || moi.cle).toLowerCase()}, broadcast:{self:false}}});
    ch.on('postgres_changes', {event:'INSERT', schema:'public', table:'chat_messages'}, p=>recu(p.new))
      .on('postgres_changes', {event:'DELETE', schema:'public', table:'chat_messages'}, p=>retirer(p.old && p.old.id));
    if(reactionsOk) ch.on('postgres_changes', {event:'*', schema:'public', table:'chat_reactions'}, reaction);
    ch.on('presence', {event:'sync'}, ()=>{
        presents = Object.values(ch.presenceState()).map(l=>l && l[0] && l[0].pseudo).filter(Boolean);
        majTete();
      })
      .on('broadcast', {event:'ecrit'}, m=>ecrit(m.payload && m.payload.pseudo))
      .subscribe(etat=>{
        if(etat !== 'SUBSCRIBED') return;
        ch.track({pseudo:moi.pseudo}).catch(()=>{});
        if(ouvert && filCharge) chargerFil(true).catch(()=>{});   // reconnexion : on rattrape
      });
    canal = ch;
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
    if(filCharge){
      messages.set(m.id, m); dessinerFil();
      if(m.reponse_a && !messages.has(m.reponse_a) && !parents.has(m.reponse_a)) chargerParents().then(dessinerFil);
    }
    if(ecrivent.has(m.pseudo)){ clearTimeout(ecrivent.get(m.pseudo)); ecrivent.delete(m.pseudo); majEcrit(); }
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
    const {data, error} = await client.from('chat_messages').select('*')
      .eq('salon', SALON).order('cree', {ascending:false}).limit(60);
    if(error) throw erreur(/JWT|401/i.test(error.message||'') ? 'jeton' : 'serveur');
    messages = new Map((data || []).reverse().map(m=>[m.id, m]));
    await Promise.all([chargerReactions([...messages.keys()]), chargerParents()]);
    filCharge = true;
    etat(null);
    dessinerFil(true);
    if(visible()) toutVu();
  }

  /* ---------- 4 bis. RÉACTIONS, RÉPONSES, « ÉCRIT… » (7.2.0) ---------- */
  function ajouterReac(r){
    if(!r || !r.message_id) return;
    const l = reactions.get(r.message_id) || [];
    if(!l.some(x=>x.pseudo_cle === r.pseudo_cle && x.emoji === r.emoji)) l.push({pseudo_cle:r.pseudo_cle, pseudo:r.pseudo || r.pseudo_cle, emoji:r.emoji});
    reactions.set(r.message_id, l);
  }
  function retirerReac(r){
    if(!r || !r.message_id) return;
    reactions.set(r.message_id, (reactions.get(r.message_id) || []).filter(x=>!(x.pseudo_cle === r.pseudo_cle && x.emoji === r.emoji)));
  }
  function reaction(p){
    if(p.eventType === 'INSERT') ajouterReac(p.new);
    else if(p.eventType === 'DELETE') retirerReac(p.old);
    if(filCharge) dessinerFil();
  }
  async function chargerReactions(ids){
    if(!reactionsOk || !ids.length) return;
    const {data, error} = await client.from('chat_reactions').select('message_id,pseudo_cle,pseudo,emoji').in('message_id', ids);
    if(error) return;
    reactions = new Map(); (data || []).forEach(ajouterReac);
  }
  /* Les messages cités qui ne sont pas dans les 60 derniers. */
  async function chargerParents(){
    const manquants = [...new Set([...messages.values()].map(m=>m.reponse_a)
      .filter(id=>id && !messages.has(id) && !parents.has(id)))];
    if(!manquants.length) return;
    const {data} = await client.from('chat_messages').select('id,pseudo,texte').in('id', manquants);
    (data || []).forEach(m=>parents.set(m.id, m));
    manquants.forEach(id=>{ if(!parents.has(id)) parents.set(id, null); });
  }
  async function reagir(mid, e){
    actionsPour = null;
    if(!reactionsOk || !moi || !client){ dessinerFil(); bandeau('Les réactions ne sont pas encore activées.'); return; }
    const r = {message_id:mid, pseudo_cle:String(moi.pseudo).toLowerCase(), pseudo:moi.pseudo, emoji:e};
    const deja = (reactions.get(mid) || []).some(x=>x.pseudo_cle === r.pseudo_cle && x.emoji === e);
    if(deja){
      retirerReac(r); dessinerFil();
      const {error} = await client.from('chat_reactions').delete().match({message_id:mid, pseudo_cle:r.pseudo_cle, emoji:e});
      if(error){ ajouterReac(r); dessinerFil(); bandeau('La réaction n\'a pas été retirée. Réessaie.'); }
    }else{
      ajouterReac(r); dessinerFil();
      const {error} = await client.from('chat_reactions').insert(Object.assign({cle:moi.cle}, r));
      if(error && error.code !== '23505'){ retirerReac(r); dessinerFil(); bandeau('La réaction n\'est pas passée. Réessaie.'); }
    }
  }
  function basculerActions(id){
    actionsPour = actionsPour === id ? null : id;
    dessinerFil();
    if(actionsPour){ const b = document.querySelector('#chat-fil .chat-actions button'); if(b) b.focus({preventScroll:true}); }
  }
  function repondre(id){
    const m = messages.get(id); if(!m) return;
    reponse = m; actionsPour = null;
    dessinerFil(); majRep();
    const t = $('chat-txt'); if(t && !t.disabled) t.focus();
  }
  function majRep(){
    const r = $('chat-rep'); if(!r) return;
    r.hidden = !reponse;
    if(reponse) $('chat-rep-txt').innerHTML = 'Réponse à <b>'+echap(reponse.pseudo)+'</b> · '+echap(extrait(reponse.texte, 70));
  }
  function allerA(id){
    const el = document.querySelector('#chat-fil .chat-m[data-id="'+id+'"]');
    if(!el){ bandeau('Ce message est trop ancien pour être affiché.'); return; }
    el.scrollIntoView({block:'center', behavior:'smooth'});
    el.classList.add('flash'); setTimeout(()=>el.classList.remove('flash'), 1600);
  }
  /* « Léa écrit… » : un signal toutes les 2,5 s au plus pendant la frappe. */
  function signalerEcriture(){
    const t = $('chat-txt');
    if(!canal || !moi || !t || !t.value.trim()) return;
    const n = Date.now(); if(n - dernierEcrit < 2500) return;
    dernierEcrit = n;
    canal.send({type:'broadcast', event:'ecrit', payload:{pseudo:moi.pseudo}}).catch(()=>{});
  }
  function ecrit(p){
    if(!p || (moi && String(p).toLowerCase() === String(moi.pseudo).toLowerCase())) return;
    clearTimeout(ecrivent.get(p));
    ecrivent.set(p, setTimeout(()=>{ ecrivent.delete(p); majEcrit(); }, 4000));
    majEcrit();
  }
  function majEcrit(){
    const el = $('chat-ecrit'); if(!el) return;
    const n = [...ecrivent.keys()];
    el.textContent = !n.length ? '' : n.length === 1 ? n[0]+' écrit…' : n.length === 2 ? n[0]+' et '+n[1]+' écrivent…' : 'Plusieurs personnes écrivent…';
  }
  function majTete(){
    const el = $('chat-sous'); if(!el) return;
    const n = new Set(presents.map(p=>String(p).toLowerCase())).size;
    el.textContent = 'Général · '+(n > 1 ? n+' connectés' : n === 1 ? '1 connecté' : 'la promo M1 MBAF');
    el.title = presents.length ? 'En ligne : '+[...new Set(presents)].join(', ') : '';
  }
  /* @… à la saisie : propose les pseudos connus. */
  function suggerer(){
    const t = $('chat-txt'), box = $('chat-sugg'); if(!t || !box) return;
    const m = t.value.slice(0, t.selectionStart).match(/(^|\s)@([^\s@]{0,20})$/);
    const q = m ? sansAccent(m[2]) : null;
    const liste = q === null ? [] : pseudosConnus()
      .filter(p=>!moi || p.toLowerCase() !== String(moi.pseudo).toLowerCase())
      .filter(p=>sansAccent(p).startsWith(q)).slice(0, 5);
    box.hidden = !liste.length;
    box.innerHTML = liste.map(p=>'<button type="button" data-at="'+echap(p)+'">@'+echap(p)+'</button>').join('');
  }
  function mentionner(p){
    const t = $('chat-txt'), fin = t.selectionStart;
    const avant = t.value.slice(0, fin).replace(/@([^\s@]{0,20})$/, '@'+p+' ');
    t.value = avant + t.value.slice(fin);
    t.setSelectionRange(avant.length, avant.length);
    $('chat-sugg').hidden = true;
    t.focus(); ajuster(); compter();
  }

  /* ---------- 5. PRÉVENIR : pastille, cloche, notification système ---------- */
  function signaler(){
    window.dispatchEvent(new CustomEvent('m1chat', {detail:{n:nonlus.length}}));
    /* chiffre sur l'icône de l'app installée (iPhone, Android, ordinateur) */
    try{
      if('setAppBadge' in navigator){
        (nonlus.length ? navigator.setAppBadge(nonlus.length) : navigator.clearAppBadge()).catch(()=>{});
      }
    }catch(e){}
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
    navigator.serviceWorker.ready.then(async r=>{
      /* abonné aux notifications (et chat non coupé) : c'est le serveur
         (fonction Supabase chat-notif) qui prévient, même appli fermée ;
         on ne double pas l'alerte. */
      const sub = await r.pushManager.getSubscription().catch(()=>null);
      if(sub) return;                      // le serveur prévient, ou l'utilisateur a coupé
      return r.showNotification('💬 Messagerie M1', {
        body:m.pseudo+' a envoyé un message', tag:'chat', renotify:true,
        icon:'icons/icon-192.png', badge:'icons/icon-192.png', data:{url:'/?chat=1'}
      });
    }).catch(()=>{});
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
        '<div class="chat-tt"><b id="chat-titre">Messagerie</b><small id="chat-sous">Général · la promo M1 MBAF</small></div>'+
        '<button type="button" class="chat-x" id="chat-x" aria-label="Fermer la messagerie">✕</button>'+
      '</div>'+
      '<div class="chat-bandeau" id="chat-bandeau" hidden></div>'+
      '<div class="chat-fil" id="chat-fil" role="log" aria-live="polite" aria-label="Messages" tabindex="0"></div>'+
      '<div class="chat-ecrit" id="chat-ecrit"></div>'+
      '<div class="chat-sugg" id="chat-sugg" hidden></div>'+
      '<div class="chat-rep" id="chat-rep" hidden><span id="chat-rep-txt"></span><button type="button" id="chat-rep-x" aria-label="Annuler la réponse">✕</button></div>'+
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
    t.addEventListener('input', ()=>{ ajuster(); compter(); suggerer(); signalerEcriture(); });
    t.addEventListener('click', suggerer);
    $('chat-sugg').addEventListener('click', e=>{ const b = e.target.closest('[data-at]'); if(b) mentionner(b.dataset.at); });
    $('chat-rep-x').onclick = ()=>{ reponse = null; majRep(); t.focus(); };
    const fil = $('chat-fil');
    fil.addEventListener('click', e=>{
      const s = e.target.closest('[data-suppr]'); if(s) return supprimer(+s.dataset.suppr, s);
      const r = e.target.closest('[data-reac]'); if(r) return reagir(+r.dataset.mid, r.dataset.reac);
      const rp = e.target.closest('[data-repondre]'); if(rp) return repondre(+rp.dataset.repondre);
      const c = e.target.closest('[data-aller]'); if(c) return allerA(+c.dataset.aller);
      if(e.target.closest('a')) return;
      const b = e.target.closest('.chat-bulle');
      if(b){
        if(window.getSelection && String(getSelection()).length) return;   // on sélectionnait du texte
        return basculerActions(+b.closest('.chat-m').dataset.id);
      }
      if(actionsPour){ actionsPour = null; dessinerFil(); }
    });
    fil.addEventListener('keydown', e=>{
      if((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('chat-bulle')){
        e.preventDefault(); basculerActions(+e.target.closest('.chat-m').dataset.id);
      }
    });
    majTete();
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
    pseudo:'Choisis d\'abord un pseudo sur <a href="/">l\'accueil</a> pour rejoindre la messagerie.',
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
      const parent = m.reponse_a ? (messages.get(m.reponse_a) || parents.get(m.reponse_a)) : null;
      const cite = !m.reponse_a ? '' : parent
        ? '<button type="button" class="chat-cite" data-aller="'+parent.id+'"><b>'+echap(parent.pseudo)+'</b> '+echap(extrait(parent.texte, 80))+'</button>'
        : '<div class="chat-cite vide">Réponse à un message plus disponible</div>';
      const lui = moi ? String(moi.pseudo).toLowerCase() : '';
      const rs = reactions.get(m.id) || [];
      const groupes = REACTIONS.map(e=>({e, l:rs.filter(r=>r.emoji === e)})).filter(g=>g.l.length);
      const reacs = !groupes.length ? '' : '<div class="chat-reacs">'+groupes.map(g=>{
        const mienne = g.l.some(r=>r.pseudo_cle === lui), noms = echap(g.l.map(r=>r.pseudo).join(', '));
        return '<button type="button" class="chat-r'+(mienne ? ' on' : '')+'" data-reac="'+g.e+'" data-mid="'+m.id+'" aria-pressed="'+mienne+'" title="'+noms+'" aria-label="'+g.e+' '+g.l.length+' : '+noms+'">'+g.e+'<span>'+g.l.length+'</span></button>';
      }).join('')+'</div>';
      const actions = actionsPour !== m.id ? '' : '<div class="chat-actions" role="toolbar" aria-label="Réagir ou répondre">'+
        REACTIONS.map(e=>'<button type="button" class="chat-a" data-reac="'+e+'" data-mid="'+m.id+'" aria-label="Réagir '+e+'">'+e+'</button>').join('')+
        '<button type="button" class="chat-a rep" data-repondre="'+m.id+'">↩ Répondre</button></div>';
      return '<div class="chat-m'+(mien ? ' moi' : '')+(suite ? ' suite' : '')+'" data-id="'+m.id+'">'+
        '<div class="chat-meta"><b>'+echap(m.pseudo)+'</b><time datetime="'+echap(m.cree)+'">'+heure(m.cree)+'</time>'+
          (admin ? '<button type="button" class="chat-suppr" data-suppr="'+m.id+'" aria-label="Supprimer le message de '+echap(m.pseudo)+'">Supprimer</button>' : '')+
        '</div>'+
        cite+
        '<div class="chat-bulle" tabindex="0" title="Réagir ou répondre">'+rendreTexte(m.texte)+'</div>'+
        reacs+actions+
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
      const ligne = {salon:SALON, cle:moi.cle, pseudo:moi.pseudo, texte};
      if(reponse) ligne.reponse_a = reponse.id;
      let {data, error} = await client.from('chat_messages').insert(ligne).select();
      if(error && ligne.reponse_a && /reponse_a/.test(error.message || '')){     // base pas encore à jour
        delete ligne.reponse_a;
        ({data, error} = await client.from('chat_messages').insert(ligne).select());
      }
      if(error){
        const msg = String(error.message || '');
        if(!essai && (/JWT|expired/i.test(msg) || error.code === 'PGRST301')){
          await connecter(true); envoiEnCours = false; return envoyer(true);
        }
        if(error.code === '42501' || /row-level security/i.test(msg)) throw new Error('Envoi refusé : la clé d\'accès de cet appareil n\'est plus valide.');
        if(error.code === 'P0001') throw new Error('Doucement : trop de messages d\'affilée. Patiente quelques secondes.');
        throw new Error('Le message n\'est pas parti. Réessaie dans un instant.');
      }
      t.value = ''; ajuster(); compter(); dernierEcrit = 0;
      reponse = null; majRep(); $('chat-sugg').hidden = true;
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

  /* Échap ferme d'abord ce qui est ouvert dans le panneau, puis le panneau. */
  document.addEventListener('keydown', e=>{
    if(e.key !== 'Escape' || !ouvert) return;
    e.preventDefault();
    const s = $('chat-sugg');
    if(s && !s.hidden){ s.hidden = true; return; }
    if(actionsPour){ actionsPour = null; dessinerFil(); return; }
    if(reponse){ reponse = null; majRep(); return; }
    fermer();
  });
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
