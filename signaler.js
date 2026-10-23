/* ════════════════════════════════════════════════════════════
   signaler.js — « Signaler une erreur » (A3)
   Un lien discret sous chaque question : mini-quiz, test final,
   applications corrigées, révision, générateurs, et la correction
   de BeQuick (jamais pendant une partie). Il ouvre une petite
   fenêtre de message ; la page, la matière, la leçon, la question
   et le pseudo sont joints automatiquement. L'envoi passe par la
   fonction Netlify « signaler », qui écrit à Corentin par e-mail.
   Chargé par ui.js sur toutes les pages.
   ════════════════════════════════════════════════════════════ */
(function(){
  if(window.M1Signaler) return;

  /* Où accrocher le lien : le bloc de la question, et dans ce bloc,
     l'élément qui porte l'énoncé. */
  const CIBLES = [
    {sel:'.quiz[data-q]',        q:'.q',      quoi:'.qhead'},
    {sel:'.test-q',              q:'.tq-q',   quoi:'.tq-num'},
    {sel:'.example',             q:'p',       quoi:'.ex-head', filtre:b=>/^\s*Application/i.test((b.querySelector('.ex-head')||{}).textContent||'')},
    {sel:'.qcard',               q:'.qtxt',   quoi:'.src'},                 /* révision du jour */
    {sel:'#qs > .q',             q:'.qp',     quoi:'.qn', num:'Question ', ctx:'.ctx'},      /* générateurs */
    {sel:'.gen-card',            q:'#genAsk', avant:'#genEnonce'},          /* générateur intégré au cours */
    {sel:'.cq',                  q:'p',       quoi:'.h span'}               /* correction BeQuick */
  ];
  const MAX = 1500;

  const txt = el => el ? (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  /* étiquette (« Mini-quiz 1/2 ») telle qu'écrite, sans ses boutons ni la casse d'affichage */
  function etiquette(el){ if(!el) return ''; const c = el.cloneNode(true); c.querySelectorAll('button').forEach(x=>x.remove()); return (c.textContent || '').replace(/\s+/g, ' ').trim(); }
  function lireLocal(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  function style(){
    if(document.getElementById('sig-style')) return;
    const s = document.createElement('style'); s.id = 'sig-style';
    s.textContent = `
.sig-ligne{ display:flex; justify-content:flex-end; margin-top:10px; }
.sig-lien{ appearance:none; background:none; border:0; padding:4px 2px; margin:0; cursor:pointer;
  font:inherit; font-size:12.5px; font-weight:400; color:var(--txt3); text-decoration:underline; text-decoration-color:var(--stroke2);
  text-underline-offset:3px; border-radius:6px; }
.sig-lien:hover{ color:var(--txt); text-decoration-color:currentColor; }
.sig-lien:focus-visible{ outline:2px solid var(--m); outline-offset:2px; }
.sig-fond{ position:fixed; inset:0; z-index:1000; background:var(--nuit-ombre); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  display:flex; align-items:center; justify-content:center; padding:16px; }
.sig-boite{ width:min(520px,100%); max-height:calc(100dvh - 32px); overflow:auto; background:var(--blanc); color:var(--txt);
  border-radius:26px; padding:22px 22px 18px; box-shadow:var(--shadow-lg); box-sizing:border-box; }
.sig-boite h2{ margin:0 0 4px; font-size:1.35rem; font-weight:300; color:var(--txt); }
.sig-ctx{ margin:0 0 14px; font-size:13px; color:var(--txt3); overflow-wrap:anywhere; }
.sig-boite label{ display:block; font-size:14px; font-weight:500; margin-bottom:6px; color:var(--txt); }
.sig-boite textarea{ display:block; width:100%; box-sizing:border-box; min-height:120px; resize:vertical; font:inherit; font-size:15px;
  color:var(--txt); background:var(--surface2); border:1px solid var(--stroke2); border-radius:16px; padding:12px 14px; }
.sig-boite textarea::placeholder{ color:var(--txt3); opacity:1; }
.sig-boite textarea:focus{ outline:2px solid var(--m); outline-offset:1px; }
.sig-piege{ position:absolute !important; left:-9999px; width:1px; height:1px; overflow:hidden; }
.sig-pied{ display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top:6px; font-size:12.5px; color:var(--txt3); }
.sig-actions{ display:flex; justify-content:flex-end; gap:10px; margin-top:14px; flex-wrap:wrap; }
.sig-actions button{ font:inherit; font-size:15px; font-weight:500; border-radius:999px; padding:10px 18px; cursor:pointer; border:1px solid var(--stroke2);
  background:var(--blanc); color:var(--txt); }
.sig-actions .sig-envoyer{ background:var(--nuit); border-color:var(--nuit); color:var(--blanc); }
.sig-actions button:disabled{ opacity:.6; cursor:default; }
.sig-actions button:focus-visible{ outline:2px solid var(--m); outline-offset:2px; }
.sig-etat{ margin:12px 0 0; font-size:14px; min-height:1em; }
.sig-etat.ok{ color:var(--ok); } .sig-etat.ko{ color:var(--bad); }
body.sig-ouvert{ overflow:hidden; }`;
    document.head.appendChild(s);
  }

  /* ---------- le lien sous chaque question ---------- */
  function accrocher(){
    CIBLES.forEach(c=>{
      document.querySelectorAll(c.sel).forEach(b=>{
        if(b.querySelector(':scope > .sig-ligne')) return;
        if(c.filtre && !c.filtre(b)) return;
        if(b.closest('#jeuCorps')) return;                 /* jamais pendant une partie BeQuick */
        const l = document.createElement('div'); l.className = 'sig-ligne';
        l.innerHTML = '<button type="button" class="sig-lien">Signaler une erreur</button>';
        l.firstChild.addEventListener('click', ()=>ouvrir(b, c));
        b.appendChild(l);
      });
    });
  }
  let attente = 0;
  function surveiller(){
    style();
    accrocher();
    new MutationObserver(()=>{
      if(attente) return;
      attente = requestAnimationFrame(()=>{ attente = 0; accrocher(); });
    }).observe(document.body, {childList:true, subtree:true});
  }

  /* ---------- le contexte joint au message ---------- */
  function contexte(b, c){
    const vue = b.closest('.view');
    let lecon = '';
    if(vue){
      const tag = txt(vue.querySelector('.tag')), titre = txt(vue.querySelector('.lesson-title, h1, h2'));
      lecon = [tag, titre].filter(Boolean).join(' — ') + (vue.dataset.view ? ' (#'+vue.dataset.view+')' : '');
    }
    const quoi = c.quoi ? (c.num || '') + etiquette(b.querySelector(c.quoi)) : '';
    let question = txt(b.querySelector(c.q));
    if(c.avant) question = [txt(b.querySelector(c.avant)), question].filter(Boolean).join(' — ');
    if(c.ctx){ const x = b.closest('.ex-body'); const cx = x ? txt(x.querySelector(c.ctx)) : ''; if(cx) question = 'Contexte : '+cx+'\n'+question; }
    /* ce que l'étudiant voit (innerText ignore ce qui est caché), sans le lien */
    const lien = b.querySelector(':scope > .sig-ligne'); if(lien) lien.style.display = 'none';
    const bloc = (b.innerText || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
    if(lien) lien.style.display = '';
    /* titre « Leçon — Matière » sur les cours (ui.js), « Page · A+ » ailleurs */
    const titre = (document.title || '').replace(/\s*[—·]\s*(A\+|M1 MBAF).*$/, '').split(' — ');
    const matiere = (document.querySelector('section.view') ? titre[titre.length-1] : titre.join(' — ')).trim();
    return {
      page: location.pathname + (location.hash || ''),
      matiere: quoi && (c.sel === '.qcard' || c.sel === '.cq') ? matiere + ' · ' + quoi : matiere,
      lecon: lecon || quoi,
      question: question.slice(0, 600),
      bloc: bloc.slice(0, 2000),
      resume: [lecon ? lecon.replace(/ \(#.*\)$/, '') : matiere, quoi].filter(Boolean).join(' · ')
    };
  }

  /* ---------- la fenêtre ---------- */
  let retour = null, ouvertA = 0, ctx = null;
  function ouvrir(b, c){
    fermer();
    style();
    ctx = contexte(b, c);
    retour = document.activeElement;
    ouvertA = Date.now();
    const f = document.createElement('div'); f.className = 'sig-fond'; f.id = 'sig-fond';
    f.innerHTML = '<form class="sig-boite" role="dialog" aria-modal="true" aria-labelledby="sig-titre" novalidate>'+
      '<h2 id="sig-titre">Signaler une erreur</h2>'+
      '<p class="sig-ctx"></p>'+
      '<label for="sig-msg">Qu\'est-ce qui ne va pas ?</label>'+
      '<textarea id="sig-msg" maxlength="'+MAX+'" placeholder="Par exemple : la bonne réponse devrait être… parce que…" required></textarea>'+
      '<div class="sig-piege" aria-hidden="true"><label for="sig-site">Site web</label><input id="sig-site" name="site" type="text" tabindex="-1" autocomplete="off"></div>'+
      '<div class="sig-pied"><span>Ton pseudo, la page et la question sont joints automatiquement.</span><span class="sig-compte">0/'+MAX+'</span></div>'+
      '<p class="sig-etat" role="status" aria-live="polite"></p>'+
      '<div class="sig-actions"><button type="button" class="sig-annuler">Annuler</button><button type="submit" class="sig-envoyer">Envoyer</button></div>'+
      '</form>';
    f.querySelector('.sig-ctx').textContent = ctx.resume;
    const ta = f.querySelector('textarea'), compte = f.querySelector('.sig-compte');
    ta.addEventListener('input', ()=>{ compte.textContent = ta.value.length+'/'+MAX; });
    f.addEventListener('click', e=>{ if(e.target === f) fermer(); });
    f.querySelector('.sig-annuler').addEventListener('click', fermer);
    f.querySelector('form').addEventListener('submit', e=>{ e.preventDefault(); envoyer(f); });
    f.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){ e.stopPropagation(); fermer(); }
      if(e.key === 'Tab'){                                  /* le focus reste dans la fenêtre */
        const els = [...f.querySelectorAll('textarea, .sig-actions button:not(:disabled)')];
        const i = els.indexOf(document.activeElement);
        if(e.shiftKey && i <= 0){ e.preventDefault(); els[els.length-1].focus(); }
        else if(!e.shiftKey && i === els.length-1){ e.preventDefault(); els[0].focus(); }
      }
    });
    document.body.appendChild(f);
    document.body.classList.add('sig-ouvert');
    ta.focus();
  }
  function fermer(){
    const f = document.getElementById('sig-fond'); if(!f) return;
    f.remove();
    document.body.classList.remove('sig-ouvert');
    if(retour && retour.focus) retour.focus({preventScroll:true});
    retour = null;
  }
  async function envoyer(f){
    const ta = f.querySelector('textarea'), etat = f.querySelector('.sig-etat'), bt = f.querySelector('.sig-envoyer');
    const message = ta.value.trim();
    const dire = (t, ok)=>{ etat.textContent = t; etat.className = 'sig-etat ' + (ok ? 'ok' : 'ko'); };
    if(message.length < 5){ dire('Décris l\'erreur en quelques mots.', false); ta.focus(); return; }
    if(!navigator.onLine){ dire('Pas de connexion : réessaie quand tu seras en ligne.', false); return; }
    bt.disabled = true; dire('Envoi…', true);
    const corps = Object.assign({}, ctx, {message, pseudo: lireLocal('lb_name') || '', site: f.querySelector('#sig-site').value, t: Date.now() - ouvertA});
    delete corps.resume;
    let r = null;
    try{
      r = await fetch('/.netlify/functions/signaler', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(corps)});
    }catch(e){}
    if(r && r.ok){
      dire('Merci ! Ton message est bien parti.', true);
      ta.disabled = true;
      f.querySelector('.sig-annuler').textContent = 'Fermer';
      setTimeout(()=>{ if(document.getElementById('sig-fond') === f) fermer(); }, 2200);
      return;
    }
    bt.disabled = false;
    const s = r ? r.status : 0;
    dire(s === 429 ? 'Tu as déjà envoyé plusieurs signalements : réessaie dans une heure.'
       : s === 401 ? 'Cet appareil n\'est pas reconnu : recharge la page, puis réessaie.'
       : s === 400 ? 'Décris l\'erreur en quelques mots.'
       : 'L\'envoi n\'a pas marché. Réessaie un peu plus tard.', false);
  }

  window.M1Signaler = {ouvrir, fermer, accrocher};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', surveiller);
  else surveiller();
})();
