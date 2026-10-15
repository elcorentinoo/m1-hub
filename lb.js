/* ════════════════════════════════════════════════════════════════════
   lb.js — Identité (pseudo) + classements partagés via Supabase
   HUB M1 MBAF — Conseiller Patrimoine Agence
   ════════════════════════════════════════════════════════════════════
   ⚠️  Les identifiants ci-dessous sont ceux de ton projet Supabase
       existant (celui du hub LP Banque). Tu peux :
         • soit les garder → les tables `scores` et `moyennes` sont
           réutilisées, mais les scores M1 sont CLOISONNÉS grâce au
           préfixe PROGRAM ci-dessous (le classement M1 n'affiche
           que les lignes M1, et inversement côté LP).
         • soit créer un nouveau projet Supabase dédié au Master et
           remplacer url + key.
*/
const SUPA = {
  url: 'https://vrlvtcydgdyrcljfgasg.supabase.co',  // ← URL du projet (Master1)
  key: 'sb_publishable__rK_zB-3ePNEqekPNo3N4Q_7dMOUFIK'  // ← clé publishable
};

/* Préfixe de programme : cloisonne les scores M1 des scores LP dans la
   même table `scores`. Ne le change pas en cours d'année, sinon les
   anciens résultats disparaissent du classement. */
const PROGRAM = 'M1';
/* ════════════════════════════════════════════════════════════════════ */

const LB = (function(){
  const K_NAME='lb_name', K_UID='lb_uid', K_CODE='lb_code';
  const configured = ()=> !SUPA.url.includes('TON-PROJET') && !SUPA.key.includes('TA_CLE');
  const headers = ()=>({'apikey':SUPA.key,'Authorization':'Bearer '+SUPA.key});

  /* ---------- cloisonnement par programme ---------- */
  const TAG = PROGRAM + ' · ';
  function tagSubject(s){ const v=String(s||'?'); return v.startsWith(TAG)? v : TAG+v; }
  function isMine(row){ return String(row.subject||'').startsWith(TAG); }
  function cleanSubject(s){ return String(s||'').startsWith(TAG)? String(s).slice(TAG.length) : String(s||''); }

  function genUid(){
    try{ const a=new Uint8Array(3); (self.crypto||window.crypto).getRandomValues(a); return Array.from(a).map(b=>b.toString(16).padStart(2,'0')).join(''); }
    catch(e){ return Math.random().toString(16).slice(2,8); }
  }
  function rawName(){ try{return localStorage.getItem(K_NAME)||null;}catch(e){return null;} }
  function uid(){ try{return localStorage.getItem(K_UID)||null;}catch(e){return null;} }
  function pseudo(){ return rawName(); }
  function displayName(p){ return (p!=null?p:pseudo())||''; }
  function shortId(){ return ''; }
  function setIdentity(name,c){
    try{ localStorage.setItem(K_NAME, name); if(c) localStorage.setItem(K_CODE, c); }catch(e){}
  }

  // ---------- styles ----------
  function injectCSS(){
    if(document.getElementById('lb-css')) return;
    const s=document.createElement('style'); s.id='lb-css';
    s.textContent=`
    .lb-overlay{position:fixed;inset:0;background:rgba(34,32,27,.55);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;animation:lbfade .2s ease}
    @keyframes lbfade{from{opacity:0}to{opacity:1}}
    .lb-modal{background:var(--paper,#faf6ef);border:1px solid var(--line2,#d4c7b0);border-radius:18px;max-width:420px;width:100%;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,.25);font-family:'DM Sans',system-ui,sans-serif}
    .lb-modal h3{font-family:'Fraunces',serif;font-size:1.4rem;color:var(--ink,#22201b);margin:0 0 6px;font-weight:700}
    .lb-modal p{color:var(--ink2,#4a4640);font-size:14px;margin:0 0 18px;line-height:1.5}
    .lb-field{margin-bottom:14px}
    .lb-field label{display:block;font-size:12px;font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:1px;color:var(--muted,#8a8378);margin-bottom:6px}
    .lb-field input{width:100%;box-sizing:border-box;padding:12px 14px;border:1.5px solid var(--line2,#d4c7b0);border-radius:10px;font-size:15px;font-family:'DM Sans',sans-serif;background:#fff;color:var(--ink,#22201b)}
    .lb-field input:focus{outline:none;border-color:var(--teal,#1b6b5e)}
    .lb-btn{width:100%;padding:13px;border:none;border-radius:10px;background:var(--teal,#1b6b5e);color:#fff;font-size:15px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:background .15s}
    .lb-btn:hover{background:var(--teal-d,#0f4a40)}
    .lb-err{color:var(--rust,#a8432a);font-size:13px;margin-top:8px;min-height:16px}
    .lb-id-btn{font-family:'DM Mono',monospace;font-size:12px;color:var(--muted,#8a8378);background:none;border:1px solid var(--line,#e3d9c8);border-radius:8px;padding:5px 10px;cursor:pointer;white-space:nowrap}
    .lb-id-btn:hover{color:var(--teal-d,#0f4a40);border-color:var(--line2,#d4c7b0);background:#fff}
    .lb-tabs{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
    .lb-tab{padding:9px 18px;border-radius:999px;border:1.5px solid var(--line2,#d4c7b0);background:#fff;color:var(--ink2,#4a4640);font-weight:600;font-size:14px;cursor:pointer;font-family:'DM Sans',sans-serif}
    .lb-tab.active{background:var(--teal,#1b6b5e);color:#fff;border-color:var(--teal,#1b6b5e)}
    .lb-table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line,#e3d9c8);border-radius:14px;overflow:hidden}
    .lb-table th{text-align:left;font-family:'DM Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted,#8a8378);padding:12px 14px;border-bottom:1px solid var(--line,#e3d9c8);font-weight:500}
    .lb-table td{padding:12px 14px;border-bottom:1px solid var(--paper2,#f3ece0);font-size:14.5px;color:var(--ink,#22201b)}
    .lb-table tr:last-child td{border-bottom:none}
    .lb-rank{font-family:'DM Mono',monospace;font-weight:600;color:var(--muted,#8a8378);width:42px}
    .lb-name{font-weight:600}
    .lb-main{font-family:'DM Mono',monospace;font-weight:600;color:var(--teal-d,#0f4a40)}
    .lb-sub{font-family:'DM Mono',monospace;font-size:12.5px;color:var(--muted,#8a8378)}
    .lb-me{background:var(--teal-l,#e4f0ed)!important}
    .lb-me td{font-weight:700}
    .lb-empty{text-align:center;color:var(--muted,#8a8378);padding:40px 16px;font-size:14.5px}
    .lb-note{font-size:13px;color:var(--muted,#8a8378);margin-top:14px;font-family:'DM Sans',sans-serif}
    .lb-uid{font-family:'DM Mono',monospace;font-size:11px;color:var(--muted,#8a8378);margin-left:6px}
    .lb-diag{background:#fff;border:1px solid #e7c4b8;border-left:5px solid var(--rust,#a8432a);border-radius:14px;padding:20px 22px;font-family:'DM Sans',sans-serif}
    .lb-diag-head{font-family:'Fraunces',serif;font-weight:700;color:var(--rust,#a8432a);font-size:1.05rem;margin-bottom:10px}
    .lb-diag-body{font-size:14.5px;color:var(--ink,#22201b);line-height:1.6}
    .lb-diag-body code{background:#f3ece0;padding:2px 6px;border-radius:5px;font-family:'DM Mono',monospace;font-size:12.5px}
    .lb-diag-foot{margin-top:14px;padding-top:12px;border-top:1px solid #f0e4dd;font-size:12px;color:var(--muted,#8a8378)}
    .lb-diag-foot code{font-family:'DM Mono',monospace}`;
    document.head.appendChild(s);
  }

  // ---------- modal d'identité ----------
  function identityModal(onDone){
    injectCSS();
    const ov=document.createElement('div'); ov.className='lb-overlay';
    const cur=rawName();
    ov.innerHTML=`<div class="lb-modal">
      <h3>${cur?'Changer de pseudo':'Choisis ton pseudo'}</h3>
      <p>Ton pseudo est ton identité sur <b>tous les classements</b>. Choisis-le bien : deux personnes avec le même pseudo partagent le même profil.</p>
      <div class="lb-field"><label>Pseudo</label><input id="lb-in-p" maxlength="24" placeholder="ex : Corentin, Coco…" value="${cur?cur.replace(/"/g,'&quot;'):''}"></div>
      <button class="lb-btn" id="lb-go">${cur?'Enregistrer':'Valider'}</button>
      <div class="lb-err" id="lb-err"></div>
    </div>`;
    document.body.appendChild(ov);
    const inp=ov.querySelector('#lb-in-p'); setTimeout(()=>inp.focus(),50);
    function submit(){
      const p=inp.value.trim();
      if(p.length<2){ ov.querySelector('#lb-err').textContent='Choisis un pseudo (2 caractères minimum).'; return; }
      setIdentity(p); ov.remove(); refreshIdButtons(); if(onDone) onDone(pseudo());
    }
    ov.querySelector('#lb-go').onclick=submit;
    inp.onkeydown=e=>{ if(e.key==='Enter') submit(); };
    ov.onclick=e=>{ if(e.target===ov && cur) ov.remove(); };
  }

  function ensureIdentity(onReady){ if(pseudo()) onReady(pseudo()); else identityModal(onReady); }

  // ---------- bouton identité ----------
  function idButton(){
    injectCSS();
    const b=document.createElement('button'); b.className='lb-id-btn';
    b.onclick=()=>identityModal();
    b.dataset.lbId='1';
    refreshOne(b);
    return b;
  }
  function refreshOne(b){ const p=pseudo(); b.textContent = p?('👤 '+displayName(p)):'👤 Se nommer'; }
  function refreshIdButtons(){ document.querySelectorAll('[data-lb-id]').forEach(refreshOne); }

  // ---------- enregistrement d'un résultat ----------
  async function doPost(row){
    try{
      const r=await fetch(SUPA.url+'/rest/v1/scores',{method:'POST',
        headers:Object.assign(headers(),{'Content-Type':'application/json','Prefer':'return=minimal'}),
        body:JSON.stringify(row)});
      return r.ok;
    }catch(e){ return false; }
  }
  function record(data){
    if(!configured()) return;
    const send=p=>doPost({pseudo:p, subject:tagSubject(data.subject), mode:data.mode||'?',
      correct:data.correct|0, total:data.total|0, xp:data.xp|0});
    ensureIdentity(send);
  }

  // ---------- récupération + agrégation (filtrée sur le programme) ----------
  let _lastError = null;
  async function fetchAll(){
    if(!configured()) return null;
    _lastError = null;
    try{
      const r=await fetch(SUPA.url+'/rest/v1/scores?select=pseudo,subject,mode,correct,total,xp,created_at&limit=20000',{headers:headers()});
      if(!r.ok){
        let body='';
        try{ body = await r.text(); }catch(e){}
        _lastError = {kind:'http', status:r.status, body:body.slice(0,400)};
        return null;
      }
      const rows=await r.json();
      return rows.filter(isMine);   // ← seuls les résultats du programme M1
    }catch(e){
      _lastError = {kind:'network', message:String(e && e.message || e)};
      return null;
    }
  }
  function lastError(){ return _lastError; }

  function diagnose(){
    const e = _lastError;
    const local = location.protocol === 'file:';
    if(!e) return "Cause inconnue.";
    if(e.kind === 'network'){
      if(local) return "<b>Tu ouvres le fichier en local (file://).</b> Le navigateur bloque la requête. Publie le site sur Netlify, ou lance un serveur local : <code>python3 -m http.server</code> puis ouvre <code>http://localhost:8000</code>.";
      return "<b>La requête n'est jamais arrivée au serveur.</b> Les causes les plus fréquentes : le projet Supabase est <b>en pause</b> (les projets gratuits sont suspendus après une période d'inactivité — il faut le réactiver depuis le dashboard), le projet a été supprimé, ou tu es hors connexion.<br><span style='font-family:DM Mono,monospace;font-size:12px'>Détail : "+e.message+"</span>";
    }
    const map = {
      400: "<b>Requête refusée (400).</b> Une colonne demandée n'existe pas dans la table <code>scores</code>. Colonnes attendues : pseudo, subject, mode, correct, total, xp, created_at.",
      401: "<b>Clé refusée (401).</b> La clé publishable n'est plus valide — elle a probablement été régénérée. Récupère la nouvelle dans Supabase → Project Settings → API, et remplace <code>key</code> en haut de lb.js.",
      403: "<b>Lecture interdite (403).</b> La RLS (Row Level Security) bloque la lecture. Il faut une policy SELECT autorisant le rôle anonyme sur la table <code>scores</code>.",
      404: "<b>Table introuvable (404).</b> La table <code>scores</code> n'existe pas dans ce projet, ou l'URL du projet est erronée.",
      503: "<b>Projet indisponible (503).</b> Le projet Supabase est probablement en pause : réactive-le depuis le dashboard.",
      544: "<b>Projet en pause (544).</b> Réactive-le depuis le dashboard Supabase."
    };
    return (map[e.status] || ("<b>Erreur HTTP "+e.status+".</b>")) +
      (e.body ? "<br><span style='font-family:DM Mono,monospace;font-size:12px'>Réponse du serveur : "+esc(e.body)+"</span>" : "");
  }
  function rankings(rows){
    const u={};
    rows.forEach(r=>{
      const key=r.pseudo||'?'; if(!u[key]) u[key]={pseudo:key,sessions:0,questions:0,correct:0,xp:0,subjects:{},last:''};
      const o=u[key];
      o.sessions++; o.questions+=r.total|0; o.correct+=r.correct|0; o.xp+=r.xp|0;
      if(r.subject) o.subjects[cleanSubject(r.subject)]=1;
    });
    const arr=Object.values(u).map(x=>{ x.pct = x.questions? x.correct/x.questions*100 : 0; x.nbSub=Object.keys(x.subjects).length; return x; });
    const assiduite=arr.slice().sort((a,b)=> b.questions-a.questions || b.sessions-a.sessions || b.xp-a.xp || a.pseudo.localeCompare(b.pseudo));
    const notes=arr.filter(x=>x.questions>=10).slice().sort((a,b)=> b.pct-a.pct || b.questions-a.questions || a.pseudo.localeCompare(b.pseudo));
    return {assiduite, notes, total:rows.length, users:arr.length};
  }

  // ---------- rendu de la page classement ----------
  let _data=null, _tab='assiduite';
  function medal(i){ return i===0?'🥇':i===1?'🥈':i===2?'🥉':('#'+(i+1)); }
  function renderTable(){
    const me=pseudo();
    const list = _tab==='assiduite'? _data.assiduite : _data.notes;
    if(!list.length){
      return `<div class="lb-empty">Personne n'a encore ${_tab==='notes'?'assez joué pour apparaître ici (10 questions minimum)':'enregistré de session'}.<br>Lance un test depuis une matière, ton pseudo apparaîtra ici !</div>`;
    }
    let head, rows;
    if(_tab==='assiduite'){
      head=`<tr><th>#</th><th>Pseudo</th><th>Questions</th><th>Séries</th><th>Matières</th></tr>`;
      rows=list.map((x,i)=>`<tr class="${x.pseudo===me?'lb-me':''}"><td class="lb-rank">${medal(i)}</td><td class="lb-name">${nm(x.pseudo)}</td><td class="lb-main">${x.questions}</td><td class="lb-sub">${x.sessions}</td><td class="lb-sub">${x.nbSub}</td></tr>`).join('');
    }else{
      head=`<tr><th>#</th><th>Pseudo</th><th>Réussite</th><th>Questions</th><th>Séries</th></tr>`;
      rows=list.map((x,i)=>`<tr class="${x.pseudo===me?'lb-me':''}"><td class="lb-rank">${medal(i)}</td><td class="lb-name">${nm(x.pseudo)}</td><td class="lb-main">${x.pct.toFixed(1)} %</td><td class="lb-sub">${x.questions}</td><td class="lb-sub">${x.sessions}</td></tr>`).join('');
    }
    const note = _tab==='assiduite'
      ? "Classé sur le nombre de questions travaillées (toutes matières du M1 confondues). Égalité départagée par le nombre de séries."
      : "Moyenne de réussite sur toutes les séries du M1 (minimum 10 questions pour apparaître).";
    return `<table class="lb-table">${head}${rows}</table><div class="lb-note">${note}</div>`;
  }
  function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  function nm(p){ return esc(p); }

  async function renderLeaderboards(elId){
    injectCSS();
    const host=document.getElementById(elId); if(!host) return;
    if(!configured()){
      host.innerHTML=`<div class="lb-empty">⚙️ Le classement n'est pas encore configuré.<br>Renseigne ton projet Supabase en haut du fichier <code>lb.js</code>.</div>`; return;
    }
    host.innerHTML=`<div class="lb-empty">Chargement du classement…</div>`;
    const rows=await fetchAll();
    if(rows===null){
      host.innerHTML=`<div class="lb-diag">
        <div class="lb-diag-head">⚠️ Le classement n'a pas pu être chargé</div>
        <div class="lb-diag-body">${diagnose()}</div>
        <div class="lb-diag-foot">Projet interrogé : <code>${esc(SUPA.url)}</code></div>
      </div>`;
      return;
    }
    _data=rankings(rows);
    const draw=()=>{
      host.innerHTML=`
        <div class="lb-tabs">
          <button class="lb-tab ${_tab==='assiduite'?'active':''}" id="lbt-a">🔥 Les plus studieux</button>
          <button class="lb-tab ${_tab==='notes'?'active':''}" id="lbt-n">🎯 Meilleures notes</button>
        </div>
        ${renderTable()}`;
      host.querySelector('#lbt-a').onclick=()=>{_tab='assiduite';draw();};
      host.querySelector('#lbt-n').onclick=()=>{_tab='notes';draw();};
    };
    draw();
  }

  return {pseudo,displayName,shortId,uid,setIdentity,identityModal,ensureIdentity,idButton,refreshIdButtons,record,fetchAll,rankings,renderLeaderboards,configured,PROGRAM,lastError,diagnose};
})();
window.LB = LB;
