# Feuille de route — grande mise à jour qualité, puis hub multi-promos

Document de passation entre sessions Claude. À lire en entier avant toute
action, avec `CLAUDE.md`. Décisions prises avec Corentin le 23 octobre 2026.

## Règles de travail (décidées par Corentin)

- **Rien sans son accord.** Chaque demande d'avis ou d'approbation se fait
  sous forme de **liste numérotée** ; il répond oui / non / modification.
- **Une seule publication** sur `main` à la fin de la mise à jour qualité,
  après un **bilan récapitulatif** qu'il valide. Pas de push sur `main` avant
  (15 crédits Netlify par publication). Le travail en cours vit sur la
  branche `maj-qualite`.
- **Session « cheffe »** : Corentin ne parle qu'à une session cheffe, qui
  confie chaque chantier à une session de travail séparée (outil
  `create_session`), vérifie son travail, puis rend compte. Une session par
  chantier, pour économiser ses crédits.
- Travailler doucement, un point à la fois.

## État de la branche `maj-qualite`

Déjà fait, non publié :

- Retrait de toute mention de l'IAE Vannes (Études de marché : titre,
  modèle d'introduction de questionnaire, corrigé de la question rédigée).
- Projet de hub noté dans `lisez-moi.txt` (rubrique « Projets à venir »).
- Les fichiers portent la version 7.6.3. **Le numéro final se choisit au
  moment de la publication**, selon l'ampleur du lot (probablement 7.7.0).
  Une seule entrée d'historique dans `lisez-moi.txt` pour tout le lot.

## A. Mise à jour qualité — à faire

| N° | Chantier | Décision et précisions de Corentin |
|----|----------|------------------------------------|
| A1 | Sources en bas de chaque cours | Oui. Discret, comme les crédits photo Unsplash en bas de page. Sources officielles seulement (service-public.fr, Légifrance, Banque de France…), **jamais de nom de professeur**. |
| A3 | Signaler une erreur | Oui. Lien **discret** (par ex. « Contact ») sous les questions ; le message arrive **par e-mail à Corentin**. Choisir un envoi d'e-mail gratuit (à proposer : son adresse dans une variable Netlify, jamais dans le dépôt). |
| A4 | Progression partagée entre appareils | **Maintenant**, liée au pseudo (lui-même lié à la clé). Aujourd'hui la progression et le planning de révision restent sur l'appareil (`progress.js`). |
| A6 | Sauvegarde automatique | Oui. Copie hebdomadaire des tables Supabase (classement, BeQuick, chat, clés), sans consommer de crédits de publication. |

Refusés : A2 (revérification complète des chiffres — on continue de vérifier
tout chiffre qu'on touche), A5 (page « Tes données »).

## Nom du site

Aucune proposition retenue (Le Coffre, Capital, Dividende, Plus-value, Actif,
Cap Partiels refusés). **L'idée du « + » plaît.** Brainstorming à faire avec
lui. Pas de nom de domaine payant : solution gratuite = renommer le projet
Netlify (adresse `<nom>.netlify.app`).

## B. Hub multi-promos — chantier suivant (après publication de la MAJ qualité)

Version MAJEURE (prochain nom de monnaie libre : Guinée).

| N° | Décision |
|----|----------|
| B1 | À l'arrivée, choix du niveau : Licence (LP ABF), M1, M2. **Une couleur par niveau** : Licence vert sapin, M1 bleu nuit (actuel), M2 bordeaux. Design « Verre » commun. |
| B2 | **Seule la clé de Corentin est administratrice** (plus de mot de passe seul). |
| B3 | Une clé = un niveau + une année universitaire. |
| B4 | Les clés M1 actuelles restent valables jusqu'à fin 2026-2027, rattachées automatiquement au M1. Personne n'a rien à refaire. |
| B5 | **Pas de comptes.** La clé fait office de compte (principe actuel). |
| B6 | **Sans clé : essai de 24 h** (à l'horloge, pas au chrono), limité à **une matière par niveau**. À la fin, la page propose de **demander une clé** via un formulaire de contact qui envoie un e-mail à Corentin (« tel utilisateur souhaite une clé »). |
| B7 | Licence : reprendre le site `partielslpabf11.netlify.app` (pas sur GitHub) dans une DA proche, sans mot de passe, tout par clé. **Pas de vidéos de présentation, mais un BeQuick.** |
| B8 | Espace M2 préparé, affiché « Prochainement ». |
| — | `/admin` : vue générale ou par promo. |

## Questions encore ouvertes

1. Envoi d'e-mails gratuit (A3 et B6) : service à choisir avec Corentin.
2. Récupération du contenu du site de Licence (pas de dépôt GitHub).
3. Nom du site (brainstorming).
