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
   matiere:"fiscalite_particulier.html", entrainement:"entrainement_fiscal.html", provisoire:true,
   sid:"fiscalite-particulier", nb:11,
   titre:"Fiscalité du Particulier", bref:"Fiscalité", format:"à préciser",
   desc:"Date encore indicative, en attente de confirmation. Le cours couvre pour l'instant le module 1 sur 5."},
  {end:Date.UTC(2027,0,15,8,0,0), label:"janvier 2027", court:"janv.",
   matiere:"etudes_de_marche.html", provisoire:true,
   sid:"etudes-marche", nb:12,
   titre:"Études de marché", bref:"Études de marché", format:"questions rédigées · 1 h 30",
   desc:"Partiel de janvier, date exacte à confirmer."},
  {end:Date.UTC(2027,0,19,8,0,0), label:"mardi 19 janvier 2027 · 9 h", court:"19 janv.",
   matiere:null, sid:"entreprise-banque", nb:0,
   titre:"L'entreprise banque", bref:"Entreprise banque", format:"9 h",
   desc:"Le cours n'a pas encore commencé."},
  {end:Date.UTC(2027,0,19,9,30,0), label:"mardi 19 janvier 2027 · 10 h 30", court:"19 janv.",
   matiere:"marche_des_particuliers.html",
   sid:"marche-particuliers", nb:11,
   titre:"Le Marché des Particuliers", bref:"Marché Particuliers", format:"QCM + mini-cas · 10 h 30",
   desc:"Mardi 19 janvier, 10 h 30."},
  {end:Date.UTC(2027,0,19,12,30,0), label:"mardi 19 janvier 2027 · 13 h 30", court:"19 janv.",
   matiere:"systeme_bancaire.html",
   sid:"systeme-bancaire", nb:12,
   titre:"Le système bancaire français", bref:"Système bancaire", format:"13 h 30",
   desc:"Mardi 19 janvier, 13 h 30."},
  {end:Date.UTC(2027,0,19,14,0,0), label:"mardi 19 janvier 2027 · 15 h", court:"19 janv.",
   matiere:"marketing_numerique.html",
   sid:"marketing-numerique", nb:11,
   titre:"Marketing Numérique", bref:"Marketing", format:"15 h",
   desc:"Mardi 19 janvier, 15 h."},
];
