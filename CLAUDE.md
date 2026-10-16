# Hub M1 MBAF — instructions du projet

Site de révisions du M1 Monnaie Banque Assurance Finance, parcours Conseiller
Patrimoine Agence (IAE Vannes / BNP Paribas Rennes). Propriétaire : Corentin.

## Nature du projet

Site **statique** : HTML, CSS et JavaScript écrits à la main, aucune étape de
construction, aucune dépendance npm. Déployé sur Netlify, qui publie la racine
du dépôt telle quelle (voir `netlify.toml`).

## Règle de version — impérative

À **chaque** modification, Claude incrémente lui-même la version, l'annonce, et
respecte ces deux contraintes :

1. `VERSION` en haut de `sw.js` doit **toujours** être identique à
   `VERSION_APP` en haut de `ui.js`. Sans cela les navigateurs servent
   l'ancienne version depuis le cache du service worker.
2. Versionnage sémantique : MAJEURE = refonte ou fonctionnalité structurante ·
   MINEURE = nouvelle matière ou nouvelle page · CORRECTIF = correction.
   Chaque version MAJEURE porte un nom de monnaie — déjà utilisés : Obole, Sou,
   Écu, Denier, Livre, Louis, Franc, Sesterce. Disponibles : Florin, Ducat…

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
`--m-soft`, `--m-clair`, `--emb` (emblème) et `--photo` (photo Unsplash, puis
copie locale `img/sujet-<matière>.webp` en secours). Une nouvelle matière =
un nouveau bloc à cet endroit, une copie locale de sa photo, et le
photographe ajouté à `CREDITS` dans `ui.js`. Les photos passent en noir et
blanc puis prennent la couleur de la matière (`.ph`).

`ui.js` construit l'en-tête en pilules de verre, la barre basse sur
téléphone, et sur les pages de cours le cadre photo (titre de la leçon,
progression emboîtée dans le coin) et la barre « leçon précédente /
suivante ». Les transitions entre pages passent par `@view-transition`.

**Accessibilité : tous les textes doivent rester à 4,5:1 minimum**, fond
composité pris en compte — y compris les textes posés sur une photo, à
mesurer au pixel. À vérifier après toute modification de couleur.

## Architecture

- `index.html` — le hub : tableau de bord, **Mes cours** et **Entraînement**
  séparés, fil du semestre, panneau de reprise. Les tableaux `MATIERES`,
  `ENTRAINEMENTS` et `ECHEANCES` en tête du script sont les seuls endroits à
  modifier pour ajouter un contenu.
- Pages de cours (`marche_des_particuliers`, `produits_derives`,
  `marketing_numerique`, `es_banque`, `fiscalite_particulier`,
  `droits_particuliers`) — même squelette :
  `topbar`, `sidebar` à chapitres, sections `.view` par leçon, mini-quiz,
  applications corrigées, test final adaptatif. L'attribut `subject-id` sur
  `<html>` identifie la matière pour `progress.js`.
- Générateurs (`entrainement_changes`, `entrainement_fiscal`) — exercices tirés
  au hasard à l'infini, trois modes : par notion, série, cas complet.
- `ui.js` — en-tête, pied de page et recherche communs à toutes les pages.
- `theme.css` — la charte. `ui.css` — la coquille.
- `progress.js` — progression locale. `lb.js` — identité et classement Supabase.
- `banque.js` — banque de révision espacée, **généré** : ne pas éditer à la
  main, régénérer depuis les pages de cours.
- `sw.js` — hors ligne. Toute nouvelle page doit être ajoutée à `FICHIERS`.

## Vérifications attendues avant livraison

Rendre les pages dans un navigateur sans serveur de production : aucune erreur
JavaScript, aucun débordement horizontal (bureau et 390 px), contrastes mesurés.
Tout calcul affiché à l'étudiant doit être vérifié numériquement — c'est un
site de révision, une erreur de corrigé coûte des points en examen.

## Déploiement

Un `git push` sur `main` déclenche un déploiement Netlify automatique, qui
consomme **15 crédits** sur les 300 mensuels du plan gratuit. Regrouper les
commits plutôt que pousser dix fois d'affilée. Ne jamais déposer de zip
manuellement sur Netlify : le dépôt est la référence.

## Façon de travailler avec Corentin

Il n'est pas développeur — c'est un étudiant en banque. Expliquer en français,
sans jargon, et décrire les manipulations écran par écran.

**Proposer avant de coder, et attendre son feu vert.**
