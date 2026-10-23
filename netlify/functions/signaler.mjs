/* signaler — « Signaler une erreur » sous les questions (A3)
   POST {message, page, matiere, lecon, question, bloc, pseudo, site, t}
   Réservé aux appareils autorisés : le cookie signé m1_acces est vérifié
   ici (les fonctions Netlify ne passent pas par la porte acces.js).
   Anti-abus : texte limité, champ piège « site », envoi trop rapide
   ignoré, 5 signalements par heure et 20 par jour et par clé
   (supabase/signaler.sql, ou mémoire de la fonction en secours).
   Le message part par e-mail à Corentin (netlify/courriel.mjs). */
import {rpc, lireCookie, lireCorps, json, appareil, nettoyerPseudo} from '../acces.mjs';
import {envoyerCourriel, courrielConfigure} from '../courriel.mjs';

const MAX = {message:1500, page:120, matiere:80, lecon:160, question:600, bloc:2000};
const HEURE = 3600e3, JOUR = 86400e3;

/* Secours si la table Supabase n'existe pas encore : compteur en mémoire,
   approximatif (une instance de fonction peut redémarrer). */
const memoire = new Map();
function limiteMemoire(id){
  const now = Date.now();
  const l = (memoire.get(id) || []).filter(t => now - t < JOUR);
  if(l.filter(t => now - t < HEURE).length >= 5 || l.length >= 20) return false;
  l.push(now); memoire.set(id, l);
  return true;
}

/* Texte sur une ligne ou plusieurs, sans caractères de contrôle, tronqué. */
function propre(v, n, lignes){
  let t = String(v == null ? '' : v).replace(/\r\n?/g, '\n');
  t = t.replace(lignes ? /[\p{Cc}\p{Cf}]/gu : /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, c => (lignes && c === '\n') ? c : ' ');
  t = lignes ? t.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n') : t.replace(/\s+/g, ' ');
  return Array.from(t.trim()).slice(0, n).join('');
}
const echap = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

export default async (req) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET;
  const id = secret && lireCookie(secret, req.headers.get('cookie'));
  if(!id) return json({ok:false, raison:'cle'}, 401);

  const c = await lireCorps(req);
  /* champ piège rempli ou formulaire envoyé en moins de 2 s : un robot.
     On répond « ok » sans rien envoyer, pour ne rien lui apprendre. */
  if(c.site || (+c.t || 0) < 2000) return json({ok:true});

  const d = {
    message:  propre(c.message, MAX.message, true),
    page:     propre(c.page, MAX.page),
    matiere:  propre(c.matiere, MAX.matiere),
    lecon:    propre(c.lecon, MAX.lecon),
    question: propre(c.question, MAX.question, true),
    bloc:     propre(c.bloc, MAX.bloc, true)
  };
  if(Array.from(d.message).length < 5) return json({ok:false, raison:'court'}, 400);

  /* enregistrement + limite par clé ; la base renvoie le pseudo rattaché à la clé */
  let base = null;
  try{ base = await rpc('signaler_enregistrer', {p_id:id, p_donnees:d}); }
  catch(e){ console.log('[signaler] Supabase', e.message); }
  if(base && base.ok === false) return json({ok:false, raison:base.raison}, base.raison === 'limite' ? 429 : 401);
  if(!base && !courrielConfigure()) return json({ok:false, raison:'indisponible'}, 503);
  if(!base && !limiteMemoire(id)) return json({ok:false, raison:'limite'}, 429);

  const pseudoSite = nettoyerPseudo(c.pseudo);
  const pseudoCle = base && base.pseudo ? nettoyerPseudo(base.pseudo) : '';
  const pseudo = pseudoCle || pseudoSite || '(sans pseudo)';
  const quand = new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris', dateStyle:'full', timeStyle:'short'});
  const lignes = [
    ['Pseudo', pseudo + (pseudoSite && pseudoCle && pseudoSite !== pseudoCle ? ' (pseudo du site : '+pseudoSite+')' : '')],
    ['Date', quand],
    ['Page', d.page],
    ['Matière', d.matiere],
    ['Leçon', d.lecon],
    ['Appareil', appareil(req.headers.get('user-agent')) + ' · clé ' + id.slice(0, 8)]
  ].filter(l => l[1]);

  const sujet = 'AAA · erreur signalée' + (d.matiere ? ' — ' + d.matiere : '') + ' (' + pseudo + ')';
  const texte = d.message + '\n\n'
    + (d.question ? '— Question —\n' + d.question + '\n\n' : '')
    + lignes.map(l => l[0] + ' : ' + l[1]).join('\n')
    + (d.bloc ? '\n\n— Ce qui était affiché —\n' + d.bloc : '');
  const html = '<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1E2147">'
    + '<p style="white-space:pre-wrap;font-size:16px">' + echap(d.message) + '</p>'
    + (d.question ? '<p style="white-space:pre-wrap;background:#F4F5FA;padding:10px 12px;border-radius:10px"><b>Question</b><br>' + echap(d.question) + '</p>' : '')
    + '<table style="border-collapse:collapse;font-size:14px">' + lignes.map(l => '<tr><td style="padding:2px 12px 2px 0;color:#4A4F6A">' + l[0] + '</td><td>' + echap(l[1]) + '</td></tr>').join('') + '</table>'
    + (d.bloc ? '<p style="white-space:pre-wrap;font-size:13px;color:#4A4F6A;border-top:1px solid #E1E3EE;margin-top:14px;padding-top:10px"><b>Ce qui était affiché</b><br>' + echap(d.bloc) + '</p>' : '')
    + '</div>';

  const envoye = await envoyerCourriel({sujet, texte, html});
  /* gardé dans Supabase même si l'e-mail échoue : l'étudiant n'a rien à refaire */
  if(envoye || base) return json({ok:true});
  return json({ok:false, raison: courrielConfigure() ? 'envoi' : 'indisponible'}, 503);
};

export const config = { path: '/.netlify/functions/signaler' };
