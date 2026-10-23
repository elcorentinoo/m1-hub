/* acces-demande — « je souhaite une clé » : e-mail à Corentin (hub multi-promos)
   POST {nom, niveau, contact, message, site, t}
   Anti-abus : « site » est un champ piège invisible (un robot le remplit),
   « t » le temps passé sur le formulaire (moins de 3 s : robot) ; dans les
   deux cas on répond « envoyé » sans rien envoyer. Puis au plus 3 demandes
   par jour et par adresse IP, et 30 par jour en tout. */
import {lireCorps, json, empreinteIP, sousLaLimite, NIVEAUX, appareil} from '../acces.mjs';
import {envoyerCourriel, courrielConfigure} from '../courriel.mjs';

const NOMS = {licence:'Licence (LP ABF)', m1:'M1 MBAF', m2:'M2'};
const propre = (v, n) => String(v||'').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, n);

export default async (req, context) => {
  if(req.method !== 'POST') return json({ok:false}, 405);
  const secret = process.env.ACCES_SECRET, JETON = process.env.ACCES_JETON;
  if(!secret || !JETON) return json({ok:false, erreur:'config'}, 500);
  const d = await lireCorps(req);
  if(propre(d.site, 200) || !(Number(d.t) >= 3000)) return json({ok:true});
  const nom = propre(d.nom, 60).replace(/\s+/g, ' '), contact = propre(d.contact, 120).replace(/\s+/g, ' ');
  const message = propre(d.message, 1000), niveau = NIVEAUX.includes(d.niveau) ? d.niveau : '';
  if(nom.length < 2 || contact.length < 3) return json({ok:false, erreur:'champs'}, 400);
  if(!(await sousLaLimite(JETON, 'demande:'+empreinteIP(secret, req, context), 3)) ||
     !(await sousLaLimite(JETON, 'demande:tout', 30))) return json({ok:false, erreur:'limite'}, 429);
  const quand = new Date().toLocaleString('fr-FR', {timeZone:'Europe/Paris', dateStyle:'full', timeStyle:'short'});
  if(!courrielConfigure()) return json({ok:false, erreur:'config'}, 502);
  try{
    const parti = await envoyerCourriel({
      sujet: 'Demande de clé — '+nom+(niveau ? ' ('+NOMS[niveau]+')' : ''),
      texte: nom+' souhaite une clé d\'accès.\n\n'+
             'Niveau : '+(niveau ? NOMS[niveau] : 'non précisé')+'\n'+
             'Contact : '+contact+'\n'+
             'Message : '+(message || '—')+'\n\n'+
             'Envoyé le '+quand+' depuis '+appareil(req.headers.get('user-agent'))+'.\n'+
             'Pour lui donner une clé : /admin → Clés → Générer (choisir le niveau et l\'année).',
      repondreA: contact});
    if(!parti) return json({ok:false, erreur:'serveur'}, 502);
    return json({ok:true});
  }catch(e){
    console.log('[acces-demande]', e.message);
    return json({ok:false, erreur: e.code === 'config' ? 'config' : 'serveur'}, 502);
  }
};

export const config = { path: '/.netlify/functions/acces-demande' };
