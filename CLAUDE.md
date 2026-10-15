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

## Direction artistique — « Prisme » (4.0.0)

Toute la charte tient dans `theme.css`, chargé après le `<style>` de chaque
page et après `ui.css` : il reprend la main sur les styles locaux. **Ne jamais
coder une couleur en dur dans une page** — tout passe par les variables de
`theme.css`.

Registre : instrument de précision. Blanc pur sur canevas froid (`#F7F8FA`),
filets d'un pixel, rayons de 10 px, et un seul dégradé spectral
(violet → bleu → cyan) réservé aux marqueurs : onglet actif, jauges, fil du
semestre, arête des panneaux. Typographie Inter Tight resserrée, IBM Plex Mono
pour les chiffres et les étiquettes. Les encadrés de règle (`.rulebox`) sont le
seul aplat sombre du système.

**Accessibilité : tous les textes doivent rester à 4,5:1 minimum**, fond
composité pris en compte. À vérifier après toute modification de couleur.

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
