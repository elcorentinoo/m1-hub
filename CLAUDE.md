# AAA — instructions du projet

**AAA** (prononcé « Triple A »), slogan « Révise. Vise le AAA. » : site de
révisions devenu hub multi-promos — Licence (LP ABF), M1 Monnaie Banque
Assurance Finance parcours Conseiller Patrimoine Agence (BNP Paribas Rennes),
M2. Propriétaire : Corentin. Le double sens (AAA, meilleure note des agences
de notation, et la note qu'on vise à l'examen) reste discret : une seule
mention, dans le pied de page. Logo : rond `--nuit` (teinte du niveau) avec
« AAA » en Outfit, le dernier A plus gras (`.mk.ap` dans `theme.css`,
constante `LOGO` dans `ui.js`).

Seul le **nom du site** a changé (8.0.0) : « M1 » désigne toujours le niveau.
Les noms de fichiers, d'URL, de clés localStorage et de cookies (`m1_acces`,
`m1_essai`, `m1_progress_v1`…) gardent leur préfixe `m1` — ne jamais les
renommer, sinon tout le monde perd sa clé et sa progression.

## Nature du projet

Site **statique** (nom affiché : AAA) : HTML, CSS et JavaScript écrits à la main, aucune étape de
construction, aucune dépendance npm. Déployé sur Netlify, qui publie la racine
du dépôt telle quelle (voir `netlify.toml`), avec quelques fonctions Netlify
(dossier `netlify/`) et une base Supabase pour les données partagées.

## Règle de version — impérative

À **chaque** modification, Claude incrémente lui-même la version, l'annonce, et
respecte ces deux contraintes :

1. `VERSION` en haut de `sw.js` doit **toujours** être identique à
   `VERSION_APP` en haut de `ui.js`. Sans cela les navigateurs servent
   l'ancienne version depuis le cache du service worker.
2. Versionnage sémantique : MAJEURE = refonte ou fonctionnalité structurante ·
   MINEURE = nouvelle matière ou nouvelle page · CORRECTIF = correction.
   Chaque version MAJEURE porte un nom de monnaie — déjà utilisés : Obole, Sou,
   Écu, Denier, Livre, Louis, Franc, Sesterce, Florin, Ducat, Thaler, Guinée.
   Disponibles : Réal, Kreuzer, Piastre…

L'historique complet est dans `lisez-moi.txt`, à compléter à chaque version.

## Direction artistique — « Verre » (5.0.0 « Florin »)

Toute la charte tient dans `theme.css`, chargé après le `<style>` de chaque
page et après `ui.css` : il reprend la main sur les styles locaux. **Ne jamais
coder une couleur en dur dans une page** — tout passe par les variables de
`theme.css`.

Registre : une grande photo par matière dans un cadre très arrondi (36 px),
des cartes blanches (26 px) et du verre dépoli (`.verre`) posés dessus, des
pilules et des boutons ronds, fond bleu-gris `#ECEEF6`, texte bleu nuit
`#1E2147`. Police Outfit partout : fine (200–300) pour les grands titres,
moyenne pour le reste, chiffres en grand. Les encadrés de règle (`.rulebox`)
sont le seul aplat bleu nuit dans les leçons.

**Chaque matière a son identité**, déclarée une seule fois en haut de
`theme.css` (`:root[subject-id="…"], [data-sid="…"]`) : `--m` (couleur),
`--m-soft`, `--m-clair`, `--emb` (emblème : un caractère, ou une petite image
SVG blanche en `url(data:…)` quand aucun caractère ne rend proprement),
`--photo` (photo Unsplash, puis copie locale `img/sujet-<matière>.webp` en
secours) et, si la photo est claire, `--ph-lum` (assombrissement). Les photos
passent en noir et blanc puis prennent la couleur de la matière (`.ph`).

`ui.js` construit l'en-tête en pilules de verre, la barre basse sur
téléphone, et sur les pages de cours le cadre photo (titre de la leçon,
progression emboîtée dans le coin) et la barre « leçon précédente /
suivante ». Les transitions entre pages passent par `@view-transition`.

**Accessibilité : tous les textes doivent rester à 4,5:1 minimum**, fond
composité pris en compte — y compris les textes posés sur une photo, à
mesurer au pixel (le pixel le plus clair derrière chaque texte). À vérifier
après toute modification de couleur ou de photo.

## Architecture

- `index.html` — le hub : tableau de bord, **Mes cours** et **Entraînement**
  séparés, fil du semestre, panneau de reprise. Les tableaux `MATIERES` et
  `ENTRAINEMENTS` en tête du script sont les endroits à modifier pour ajouter
  un contenu (`yt` et `duree` = vidéo de présentation, pastille ▶ de la carte).
- `calendrier.js` — `DEBUT_SEMESTRE` et `ECHEANCES` (dates de partiels) : le
  **seul** endroit où modifier une date. Utilisé par le hub, la cloche et
  BeQuick. Une échéance sans cours a `matiere:null`.
- Pages de cours (`marche_des_particuliers`, `produits_derives`,
  `marketing_numerique`, `es_banque`, `fiscalite_particulier`,
  `droits_particuliers`, `etudes_de_marche`, `systeme_bancaire`,
  `produits_derives_2`) — même
  squelette : `topbar`, `sidebar` à chapitres, sections `.view` par leçon,
  mini-quiz, applications corrigées, test final adaptatif (`const TEST`).
  L'attribut `subject-id` sur `<html>` identifie la matière pour `progress.js`.
- **Nouvelle matière** : la page, son bloc dans `theme.css` (+ photo locale et
  photographe dans `CREDITS` de `ui.js`), puis sa déclaration dans `ui.js`
  (`PAGES`, `NOMS`, `LABM`, `fichierDe`, `PRESENTATIONS`), `progress.js`,
  `lb.js` (`COURS_M1`), `revision.html`, `stats.html`, `bequick.html` (`NOMS`),
  `index.html` (`MATIERES`), `calendrier.js` si la date est connue, `sw.js`
  (`FICHIERS`), et ses questions dans `banque.js`.
- **Vidéos de présentation** (6.3.0) : une par matière, générée dans
  NotebookLM à partir d'un document source (Drive « M1 – Sources vidéo »),
  hébergée en **non répertorié** sur la chaîne YouTube « M1 HUB ». `ui.js`
  (`PRESENTATIONS`) ajoute la page « Présentation du cours » avant la leçon 1.
- Générateurs (`entrainement_changes`, `entrainement_fiscal`) — exercices tirés
  au hasard à l'infini, trois modes : par notion, série, cas complet.
- `bequick.html` / `bequick.js` — le défi du soir : du lundi au vendredi,
  18 h 30 – 22 h, 15 questions en 10 minutes, une seule partie, même série
  pour toute la promo. Bonne réponse et explication affichées après chaque
  question. Tables Supabase dans `supabase/bequick.sql`. Notification de
  18 h 30 : `netlify/functions/bequick-notif.mjs` (Web Push, clé `VAPID_PRIVATE`).
- `ui.js` — en-tête, pied de page, recherche, cloche, vidéos, présentation.
- `theme.css` — la charte. `ui.css` — la coquille.
- `progress.js` — progression locale. `lb.js` — identité (pseudo) et
  classement Supabase.
- `synchro.js` — progression partagée entre les appareils d'un même pseudo
  (chargé par `ui.js`) : fusion élément par élément avec `supabase/progression.sql`,
  identité par la clé (jeton `acces-jeton`), lien clé → pseudo figé à la 1re synchro.
- `banque.js` — banque de révision espacée et de BeQuick, **générée** depuis
  les pages de cours (tableau `TEST` et mini-quiz) : ne pas éditer à la main.
- `supabase/chat-plus.sql` — réponses et réactions du chat (7.2.0).
- Verrou BeQuick (`ui.js`, `verrouBeQuick`) — de 18 h 30 à la fin de sa
  série, cours des matières du soir et révision fermés, contrôle par pseudo.
- Tableau de bord `/admin` (7.3.0) — `acces-admin.html`, données par la
  fonction `acces-admin` (action `tableau`) ; suivi envoyé par `ui.js`
  (`envoyerSuivi`) ; tables et fonctions dans `supabase/admin.sql`.
- `formules.js` (7.5.0) — fiches de formules Forward et Futures, en MathML,
  ouvertes par le bouton « i » (révision et pages Produits Dérivés I et II,
  jamais dans BeQuick) + bouton Aide (7.6.0) qui met la bonne formule en vert.
- `sw.js` — hors ligne. Toute nouvelle page doit être ajoutée à `FICHIERS`
  (sauf les pages d'accès, jamais mises en cache).

## Accès réservé par clé (7.0.0 « Thaler »)

Tout le site est derrière une porte : `netlify/edge-functions/acces.js`
vérifie avant chaque fichier un cookie signé posé à l'activation d'une clé.
Sans lui, on arrive sur `acces.html`, qui demande la clé **et** le pseudo.

- Une clé (`XXX-XXX-XXX`) = un appareil : consommée à la première
  utilisation, l'appareil reste autorisé un an, revérifié chaque jour.
  Un même pseudo peut avoir plusieurs clés (téléphone, ordinateur).
- Gestion réservée à Corentin : `/admin` (ou « /admin » + Entrée dans la
  recherche, jamais proposé). Génération illimitée, liste avec pseudo et
  appareil, révocation (effet sous 24 h). Mot de passe : variable Netlify.
- Fonctions : `acces-activer`, `acces-admin`, `acces-pseudo` ; outils communs
  dans `netlify/acces.mjs`. Base : `supabase/acces.sql` (table `acces_cles`,
  empreintes SHA-256 seulement, jamais les clés en clair).
- Variables d'environnement Netlify : `ACCES_SECRET`, `ACCES_JETON`,
  `ADMIN_MDP`, `VAPID_PRIVATE`. **Ne jamais les écrire dans le dépôt.**
- Restent ouverts sans clé : `acces.html`, `/admin`, `/.netlify/*`, `sw.js`,
  le manifeste et les icônes.
- **Niveaux et années** (8.0.0, `supabase/acces-niveaux.sql`) : chaque clé a
  un niveau (`licence`, `m1`, `m2`) et une année universitaire (valable
  jusqu'au 31 août de la 2e année). Cookie `m1_acces` : `id.chk.sig` (ancien
  format, lu comme M1 2026-2027) + `.niveau.annee.admin.sig2`. La porte
  cloisonne par niveau (`PAGES` en tête de `acces.js` ; page absente =
  commune). Cookie lisible `acces_info` (affichage seulement) :
  `statut=cle&niveau=m1&annee=…&niveaux=m1,licence[&admin=1]` ou
  `statut=essai&fin=…` ; lu par `niveau.js`.
- **Plusieurs niveaux par appareil** (8.2.0) : une clé d'un autre niveau
  activée (ou une demande acceptée) sur un appareil qui a déjà une clé valide
  s'AJOUTE dans un 2e cookie signé `m1_acces_plus` (au plus 4 clés) ;
  `m1_acces` reste la clé principale (pseudo, progression, chat). Chaque clé
  est revérifiée chaque jour ; révoquer l'une ne retire que son niveau (si la
  principale tombe, une clé ajoutée prend sa place). Outils : `poserCle`,
  `lirePlus` dans `netlify/acces.mjs`. Lien « J'ai une clé … » / « Ajouter une
  clé d'un autre niveau » → `acces.html?motif=ajouter`.
- **Clé administratrice** : colonne `admin` ; `/admin` s'ouvre sans mot de
  passe sur l'appareil admin ; `ADMIN_MDP` ne sert que tant qu'aucune clé
  admin n'existe. Une clé admin voit tous les niveaux.
- **Essai de 24 h** sans clé (`acces-essai`, cookie `m1_essai`, matière
  d'essai par niveau : `ESSAI` en tête de `acces.js`).
- **Demandes d'accès** (8.1.0, `supabase/acces-demandes.sql`) :
  `acces-demande` (pseudo, niveau, cookie `m1_demande`), notification Web Push
  aux appareils admin (table `acces_admin_push`, bouton dans /admin),
  onglet « Demandes » de /admin : Accepter crée une clé déjà activée pour
  l'appareil demandeur.

## Vérifications attendues avant livraison

Rendre les pages dans un navigateur sans serveur de production : aucune erreur
JavaScript, aucun débordement horizontal (bureau et 390 px), contrastes mesurés.
Tout calcul affiché à l'étudiant doit être vérifié numériquement — c'est un
site de révision, une erreur de corrigé coûte des points en examen. Les
chiffres d'un cours (taux, plafonds, lois) se vérifient sur des sources
officielles (service-public.fr, economie.gouv.fr, Légifrance, Banque de
France, ACPR, EUR-Lex) ; en cas d'écart, on corrige et on le signale dans le
mémo du cours.

## Déploiement

Un `git push` sur `main` déclenche un déploiement Netlify automatique, qui
consomme **15 crédits** sur les **1 000** mensuels du plan. Regrouper les
commits plutôt que pousser dix fois d'affilée. Ne jamais déposer de zip
manuellement sur Netlify : le dépôt est la référence. Après chaque push,
vérifier que le déploiement est publié (et non « Skipped », signe de crédits
épuisés).

## Façon de travailler avec Corentin

Il n'est pas développeur — c'est un étudiant en banque. Expliquer en français,
sans jargon, et décrire les manipulations écran par écran.

**Proposer avant de coder, et attendre son feu vert.**

Ses crédits Claude sont limités : aller à l'essentiel, déléguer les gros
travaux de lecture à des sous-agents, et lui conseiller d'ouvrir une nouvelle
session quand la conversation devient longue.
