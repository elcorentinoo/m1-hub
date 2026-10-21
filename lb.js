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

/* Les cours qui comptent dans le classement « qui complète le plus » :
   identifiant de matière → nombre de leçons. Une nouvelle matière =
   une ligne ici. */
const COURS_M1 = {
  'marche-particuliers':11, 'produits-derives':15, 'marketing-numerique':11,
  'es-banque':14, 'fiscalite-particulier':11, 'droits-particuliers':10,
  'etudes-marche':12, 'systeme-bancaire':12
};
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
    const send=p=>{ doPost({pseudo:p, subject:tagSubject(data.subject), mode:data.mode||'?',
      correct:data.correct|0, total:data.total|0, xp:data.xp|0});
      setTimeout(syncProgression, 800); };
    ensureIdentity(send);
  }

  /* ---------- progression partagée (classement « qui complète le plus ») ----------
     Pour chaque cours, on envoie le pourcentage de complétion calculé par
     progress.js (leçons 50 % · mini-quiz 25 % · test 25 %) sous forme d'une
     ligne mode « Progression » : correct = pourcentage, total = 100,
     xp = leçons validées. On n'envoie que ce qui a changé depuis le dernier
     envoi réussi, et jamais sans pseudo (pas de fenêtre surgissante). */
  const MODE_PROG = 'Progression', K_PROG = 'lb_prog';
  let _syncEnCours = null;
  function syncProgression(){
    if(_syncEnCours) return _syncEnCours;
    if(!configured() || !pseudo() || !window.P || !P.completion || !window.BANQUE) return Promise.resolve(0);
    let deja = {};
    try{ deja = JSON.parse(localStorage.getItem(K_PROG)||'{}') || {}; }catch(e){}
    const p = pseudo();
    if(deja.__p !== p) deja = {__p:p};          // nouveau pseudo : on renvoie tout
    const envois = [];
    Object.keys(COURS_M1).forEach(sid=>{
      const c = P.completion(sid, COURS_M1[sid]);
      const cle = c.pct+'/'+c.lecons.n;
      if(deja[sid] === cle || (c.pct === 0 && !deja[sid])) return;
      envois.push(doPost({pseudo:p, subject:tagSubject(sid), mode:MODE_PROG, correct:c.pct, total:100, xp:c.lecons.n})
        .then(ok=>{ if(ok) deja[sid] = cle; return ok; }));
    });
    if(!envois.length) return Promise.resolve(0);
    _syncEnCours = Promise.all(envois).then(r=>{
      try{ localStorage.setItem(K_PROG, JSON.stringify(deja)); }catch(e){}
      _syncEnCours = null;
      return r.filter(Boolean).length;
    });
    return _syncEnCours;
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
  /* Deux classements :
     · complétion : moyenne, sur tous les cours du M1, du dernier
       pourcentage envoyé pour chaque cours (un cours jamais ouvert compte 0) ;
     · réussite : bonnes réponses ÷ questions, sur les tests et séries
       enregistrés (20 questions minimum pour apparaître). */
  const MIN_QUESTIONS = 20;
  function cleP(s){ return String(s||'').trim().toLowerCase(); }
  function rankings(rows){
    const u={}, nbCours=Object.keys(COURS_M1).length;
    rows.forEach(r=>{
      const nom=String(r.pseudo||'').trim(); if(!nom) return;
      const key=cleP(nom);
      if(!u[key]) u[key]={pseudo:nom,sessions:0,questions:0,correct:0,prog:{},subjects:{}};
      const o=u[key], sub=cleanSubject(r.subject);
      if(r.mode===MODE_PROG){
        const t=r.created_at? Date.parse(r.created_at) : 0, d=o.prog[sub];
        if(COURS_M1[sub] && (!d || t>=d.t)) o.prog[sub]={t, pct:Math.min(100,Math.max(0,r.correct|0)), lecons:r.xp|0};
        return;
      }
      o.sessions++; o.questions+=r.total|0; o.correct+=r.correct|0;
      if(sub) o.subjects[sub]=1;
    });
    const arr=Object.values(u).map(x=>{
      const progs=Object.values(x.prog);
      x.aProg = progs.length>0;
      x.completion = progs.reduce((a,p)=>a+p.pct,0)/nbCours;
      x.lecons = progs.reduce((a,p)=>a+p.lecons,0);
      x.coursCommences = progs.filter(p=>p.pct>0).length;
      x.pct = x.questions? x.correct/x.questions*100 : 0;
      return x;
    });
    const parNom=(a,b)=>a.pseudo.localeCompare(b.pseudo,'fr',{sensitivity:'base'});
    const completion=arr.filter(x=>x.aProg).sort((a,b)=> b.completion-a.completion || b.lecons-a.lecons || b.questions-a.questions || parNom(a,b));
    const reussite=arr.filter(x=>x.questions>=MIN_QUESTIONS).sort((a,b)=> b.pct-a.pct || b.questions-a.questions || parNom(a,b));
    const enAttente=arr.filter(x=>!x.aProg).sort(parNom);
    return {completion, reussite, enAttente, total:rows.length, users:arr.length, nbCours, totalLecons:Object.values(COURS_M1).reduce((a,n)=>a+n,0)};
  }

  function esc(s){ return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
  /* le rendu du classement est dans classement.html */

  return {pseudo,displayName,shortId,uid,setIdentity,identityModal,ensureIdentity,idButton,refreshIdButtons,record,fetchAll,rankings,configured,PROGRAM,lastError,diagnose,syncProgression,COURS:COURS_M1,MIN_QUESTIONS};
})();
window.LB = LB;
