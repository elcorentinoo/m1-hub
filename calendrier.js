/* calendrier.js — les dates de partiels du M1 MBAF */
/* ════════════════════════════════════════════════════════════════
   ÉCHÉANCES — une ligne par partiel. Mois en base 0 (janvier = 0).
   Fichier partagé (5.1 → 6.0) : le hub l'affiche, BeQuick s'en sert
   pour choisir les matières du jour (une matière dont le partiel est
   passé n'est plus tirée), et la cloche annonce les partiels proches.
   C'est le SEUL endroit où modifier une date de partiel.
   Heure de Paris en hiver = UTC+1 → 9h Paris = 8h00 UTC ;
   en été = UTC+2 → 9h Paris = 7h00 UTC.
   8.4.0 : les deux échéances du 18 novembre 2026 (Produits Dérivés I
   et II) sont retirées, le partiel est passé et les deux matières sont
   archivées (archives.js). Pour les réactiver l'an prochain : les
   rendre visibles dans /admin (carte Archives) et ajouter ici leurs
   nouvelles dates (sid "produits-derives" et "produits-derives-2").
   ════════════════════════════════════════════════════════════════ */
var DEBUT_SEMESTRE = Date.UTC(2026,8,1,8,0,0);     /* 1er septembre 2026 */
var ECHEANCES = [
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
   matiere:"entreprise_banque.html", sid:"entreprise-banque", nb:4,
   titre:"L'entreprise banque", bref:"Entreprise banque", format:"9 h",
   desc:"Mardi 19 janvier, 9 h. Le cours couvre l'introduction et les parties I et II (la banque est une entreprise, ses spécificités)."},
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
  {end:Date.UTC(2027,5,10,7,0,0), label:"10 juin 2027 (à confirmer)", court:"10 juin",
   matiere:"organismes_tutelle.html", provisoire:true,
   sid:"organismes-tutelle", nb:12,
   titre:"Les organismes de tutelle", bref:"Organismes de tutelle", format:"à préciser",
   desc:"Date provisoire, à confirmer."},
];
