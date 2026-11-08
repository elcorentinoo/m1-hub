# Notes — hub multi-promos : niveaux et BeQuick par niveau (8.0.0)

Chantier B-NIVEAUX (points 7 et 12 de la feuille de route). Document de
passation pour les sessions qui rempliront les espaces Licence et M2.

## Ce qui existe

| Fichier | Rôle |
|---|---|
| `niveaux.html` | Choix du niveau : Licence, M1, M2 « Prochainement ». Retient le choix sur l'appareil. |
| `index.html` | **Reste le hub M1**, à la même adresse (favoris, écran d'accueil, manifeste inchangés). Ajouts : `data-niveau="m1"`, pilule « Changer de niveau », 1 script de redirection. |
| `licence.html` | Espace Licence vide, prêt : tableaux `MATIERES_LICENCE` et `ENTRAINEMENTS_LICENCE`. |
| `m2.html` | Espace M2 « Prochainement ». |
| `niveau.js` | `window.NIVEAU` : `courant()`, `cle()`, `choisi()`, `essai()`, `info()`, `choisir(n)`, `espace(n)`. |
| `theme.css` (fin) | Teintes : `:root[data-niveau="licence"\|"m1"\|"m2"]` redéfinit `--nuit`, `--sur-nuit`, `--nuit-ombre`, `--niv*` ; `[data-niv]` pour les cartes de la page de choix. |
| `bequick.js`, `bequick.html` | BeQuick par niveau (voir plus bas). |
| `supabase/bequick-niveaux.sql` | Colonne `niveau` (défaut `'m1'`) sur les tables BeQuick et les abonnements. |
| `netlify/functions/bequick-notif.mjs` | Alerte de 18 h 30 par niveau (`NIVEAUX_ACTIFS`). |

## Quel niveau, pour qui

Ordre de lecture (`niveau.js`) :

1. cookie lisible `acces_info` posé par la porte (branche hub-acces) :
   `statut=cle&niveau=m1&annee=2026-2027` ou `statut=essai&fin=…&m1=…` ;
2. choix fait sur `niveaux.html` (`localStorage['niveau-choisi']`, jamais M2) ;
3. **M1 par défaut**.

Arrivée sur `index.html` :

- clé M1 → reste sur le hub M1, **jamais redirigée** (même si un autre choix est retenu) ;
- essai de 24 h sans niveau choisi → `niveaux.html` ;
- niveau Licence (clé ou choix) → `licence.html` ;
- aucun cookie, aucun choix (cas de toutes les clés M1 actuelles) → hub M1, comme aujourd'hui.

## Brancher une matière de Licence

1. Suivre la check-list « Nouvelle matière » de `CLAUDE.md` (page de cours,
   bloc `data-sid` dans `theme.css`, `banque.js`, `sw.js`…), avec
   `data-niveau="licence"` sur le `<html>` de la page de cours.
2. Ajouter un objet dans `MATIERES_LICENCE` (`licence.html`) :
   `{file, sid, nb, badge, title, court, desc, stats}` (pas de `yt` : pas de
   vidéo en Licence). Charger `progress.js` dans `licence.html` pour afficher
   la complétion.
3. Ajouter son `sid` dans `MATIERES_NIVEAU.licence` (`bequick.js`) : ses
   questions sortent alors du BeQuick M1 et entrent dans celui de Licence.
4. Ajouter son nom dans `NOMS` de `bequick.html`.
5. Quand le BeQuick Licence ouvre : ajouter `'licence'` à `NIVEAUX_ACTIFS`
   dans `bequick-notif.mjs`.

## BeQuick par niveau — fonctionnement

- Le niveau joué : `?niveau=` dans l'adresse, sinon `data-niveau` de la page,
  sinon `NIVEAU.courant()`, sinon `m1`. Lien Licence : `bequick.html?niveau=licence`.
- **Le M1 garde exactement son tirage** : graine `BeQuick`+jour inchangée, et
  il pioche dans toutes les matières de la banque qui ne sont listées dans
  aucun autre niveau. Les autres niveaux : graine `BeQuick`+niveau+jour, et
  seulement leurs matières.
- Toutes les requêtes Supabase portent `niveau=eq.<niveau>` ; séries,
  parties, classements du soir et général ne se mélangent jamais.
- Mémoire locale : le M1 garde ses clés `bq_<jour>`, les autres `bq_<niveau>_<jour>`.
- Un niveau sans questions affiche « Le BeQuick de ta promo ouvrira avec ses
  premiers cours ».
- Si `bequick-niveaux.sql` n'a pas encore été passé, le M1 se replie tout
  seul sans la colonne `niveau` (les autres niveaux, non).

### Vérifications faites

- Non-régression : séries M1 de 260 jours (17/10/2026 → 03/07/2027)
  **identiques** entre l'ancien et le nouveau code, sur `bequick.html` et
  `index.html`, avec ou sans cookie de clé M1, avec ou sans choix Licence
  retenu sur l'appareil.
- Requêtes simulées : filtre `niveau` présent ; repli sans colonne correct ;
  une matière déclarée Licence sort bien de la série M1.
- SQL testé deux fois de suite sur un PostgreSQL 16 local : relançable, lignes
  M1 identiques à l'octet, insertions de l'ancien site → `m1`, niveau d'une
  partie non modifiable, unicité par (jour, niveau, pseudo).

## La Licence (chantier B7, branche hub-licence)

Reprise des 9 matières et 8 entraînements du site de la LP ABF.

| Fichier | Rôle |
|---|---|
| `licence/*.html` | Les 17 pages, **squelette d'origine conservé** (menu de gauche, leçons, test, annales, générateurs). Converties une fois : `data-niveau="licence"`, `subject-id` en `l-…`, couleurs en variables de `theme.css`, chemins `../`, ancienne barre du haut remplacée par l'en-tête commun. |
| `licence.css` | Raccords de ces pages (calage sous l'en-tête, cadre photo, tableaux sur téléphone, quelques contrastes). Aucune couleur. |
| `theme.css` (fin) | Identité des 9 matières (`l-maths-fi`, `l-politique-monetaire`, `l-droit-bancaire`, `l-risques-bancaires`, `l-finance-internationale`, `l-crises-financieres`, `l-fiscalite`, `l-marche-capitaux`, `l-banque-patrimoine`). Photos : copies locales de `img/`. |
| `ui.js` | « Niveau » : `R` (racine vue de la page), en-tête, tiroir, barre basse et recherche de la Licence ; cadre photo des pages Licence (`construireCadreLicence`) ; verrou BeQuick du soir pour les matières de Licence. Le M1 garde exactement ses liens. |
| `banque-licence.js` | Questions du BeQuick Licence (`window.BANQUE_LICENCE`), **générées** depuis les tests finaux et les QCM des entraînements. Jamais dans `banque.js`. |
| `bequick.js` | `MATIERES_NIVEAU.licence` rempli ; hors M1, une matière à petite banque est complétée par une autre (15 questions). |
| `netlify/edge-functions/acces.js` | Matière d'essai Licence : `licence/droit-bancaire`. |

Non branché pour la Licence (pages d'origine sans mémoire de progression) :
progression des leçons (`progress.js`), classement (`lb.js`), révision espacée,
statistiques, glossaire. Les cartes de `licence.html` affichent le contenu de
chaque matière au lieu d'un compteur.

## Reste à faire plus tard (hors de ce chantier)

- `ui.js` : fait pour la Licence (voir plus haut) ; à faire pour le M2.
- `revision.html`, `stats.html`, `classement.html`, `glossaire.html` : M1
  seulement pour l'instant.
- `supabase/admin.sql` (tableau de bord) compte toutes les parties BeQuick
  sans distinguer le niveau : ajouter un filtre si une vue par promo est voulue.
