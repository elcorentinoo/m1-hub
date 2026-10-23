# Feuille de route — grande mise à jour qualité, puis hub multi-promos

Document de passation entre sessions Claude. À lire en entier avant toute
action, avec `CLAUDE.md`. Décisions prises avec Corentin le 23 octobre 2026.

## Ordre de travail (demandé par Corentin, 23 octobre 2026)

**Mise à jour qualité** (publication unique à la fin)

1. Nom du site : brainstorming avec lui (l'idée du « + » plaît ; Le Coffre,
   Capital, Dividende, Plus-value, Actif, Cap Partiels refusés), puis adresse
   gratuite en renommant le projet Netlify (`<nom>.netlify.app`) et nom
   affiché dans le site (logo, titre, manifeste). **En premier.**
2. A1 — Sources en bas de chaque cours.
3. A3 — Lien discret « Contact / signaler une erreur » → e-mail à Corentin.
4. A4 — Progression partagée entre appareils via le pseudo.
5. A6 — Sauvegarde hebdomadaire de la base Supabase.
6. Bilan récapitulatif (liste oui / non), puis publication unique sur `main`.

**Hub multi-promos** (après la publication)

7. Choix du niveau à l'arrivée + une couleur par niveau.
8. Clés liées à un niveau et à une année ; clés M1 actuelles rattachées au M1.
9. Seule la clé de Corentin est administratrice ; `/admin` général ou par promo.
10. Sans clé : essai de 24 h, une matière par niveau, puis demande de clé.
11. Licence : reprise de `partielslpabf11.netlify.app`.
12. Espace M2 « Prochainement ».

Suivi : à la demande de Corentin, A1, A3, A4 et A6 sont menés en parallèle
par quatre sessions de travail (branches `qualite-a1`, `qualite-a3`,
`qualite-a4`, `qualite-a6`), fusionnées dans `maj-qualite` par la cheffe.

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

## Décisions du 23 octobre (suite)

- Nom : **AAA** (« Triple A », la meilleure note des agences de notation ; remplace « A+ »), slogan « Révise. Vise le AAA. » ; tout (A1–A6 + hub B1–B8) dans
  une seule publication **8.0.0 « Guinée »**.
- E-mail : Resend (A3 et demandes de clé). A4 : rattachement automatique par
  pseudo, remise à zéro sur tous les appareils.
- A1 : accès réseau aux sites officiels ouvert par Corentin ; corriger les
  écarts de Produits Dérivés I ; retirer le nom d'enseignant de PD II.
- A6 : artefact chiffré 90 jours, clé secrète Supabase en secret GitHub.
  Dépôt **reste public** (choix de Corentin).
- **Corentin délègue désormais toutes les décisions à la session cheffe**
  (bilan oui/non avant publication maintenu).
- **Adresse du site inchangée** (`partielsmastercpa.netlify.app`) : la
  renommer ferait perdre à tous la clé (cookie lié à l'adresse), la
  progression locale et les favoris. Changement éventuel à la rentrée 2027,
  avec les nouvelles clés. `CONTACT` de `netlify/push.mjs` et de
  `supabase/functions/chat-notif` à mettre à jour à ce moment-là.

## État au 23 octobre, 14 h 20 (pause : limite d'utilisation)

Fusionné dans `maj-qualite`, vérifié (Chromium, 0 erreur, 0 débordement) :
A1 sources + 17 corrections de cours, A3 signaler une erreur, A4
progression partagée, A6 sauvegarde, hub-niveaux, hub-acces, nom AAA,
hub central. Reste : session Licence (`hub-licence`, session
`session_01UiEoP59Ychqo41ZjX5qvg6`) à terminer puis fusionner ; version
8.0.0 « Guinée » + entrée `lisez-moi.txt` (retirer « TD de S. Sabkha »
l. ~379) ; bilan oui/non ; publication ; manipulations de Corentin :
Resend + `RESEND_CLE`/`SIGNALER_DEST` (Netlify), SQL Supabase
(`acces-niveaux`, `progression`, `bequick-niveaux`, `signaler`, + SQL
Licence éventuel), 3 secrets GitHub (sauvegarde), clé admin via `/admin`.
