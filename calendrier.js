/* calendrier.js — les dates de partiels du M1 MBAF */
/* ════════════════════════════════════════════════════════════════
   ÉCHÉANCES — une ligne par partiel. Mois en base 0 (janvier = 0).
   Fichier partagé (5.1 → 6.0) : le hub l'affiche, BeQuick s'en sert
   pour choisir les matières du jour (une matière dont le partiel est
   passé n'est plus tirée), et la cloche annonce les partiels proches.
   C'est le SEUL endroit où modifier une date de partiel.
   Heure de Paris en hiver = UTC+1 → 9h Paris = 8h00 UTC.
   ════════════════════════════════════════════════════════════════ */
var DEBUT_SEMESTRE = Date.UTC(2026,8,1,8,0,0);     /* 1er septembre 2026 */
var ECHEANCES = [
  {end:Date.UTC(2026,10,18,8,0,0), label:"18 novembre 2026", court:"18 nov.",
   matiere:"produits_derives.html", entrainement:"entrainement_changes.html",
   sid:"produits-derives", nb:15,
   titre:"Produits Dérivés I", bref:"Produits Dérivés I", format:"QCM · calcul à l'oral · écrit",
   desc:"Le cours va jusqu'au marché à terme. L'entraînement couvre les treize notions de calcul, dont le forward."},
  {end:Date.UTC(2027,0,15,8,0,0), label:"15 janvier 2027", court:"15 janv.",
   matiere:"marche_des_particuliers.html", provisoire:true,
   sid:"marche-particuliers", nb:11,
   titre:"Le Marché des Particuliers", bref:"Marché Particuliers", format:"QCM + mini-cas · 1 h",
   desc:"Date encore indicative, en attente de confirmation."},
  {end:Date.UTC(2027,0,15,8,0,0), label:"15 janvier 2027", court:"15 janv.",
   matiere:"fiscalite_particulier.html", entrainement:"entrainement_fiscal.html", provisoire:true,
   sid:"fiscalite-particulier", nb:11,
   titre:"Fiscalité du Particulier", bref:"Fiscalité", format:"à préciser",
   desc:"Même session que le Marché des Particuliers, en attente de confirmation. Le cours couvre pour l'instant le module 1 sur 5."},
  {end:Date.UTC(2027,0,15,8,0,0), label:"janvier 2027", court:"janv.",
   matiere:"etudes_de_marche.html", provisoire:true,
   sid:"etudes-marche", nb:12,
   titre:"Études de marché", bref:"Études de marché", format:"questions rédigées · 1 h 30",
   desc:"Partiel de janvier, date exacte à confirmer."},
];
