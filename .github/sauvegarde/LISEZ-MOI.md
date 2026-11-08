# Sauvegarde et restauration des données Supabase

## Ce qui est sauvegardé

Chaque dimanche vers 4 h du matin, GitHub copie **toutes les tables** de la
base Supabase : clés d'accès (empreintes seulement), classement (`scores`,
`moyennes`), BeQuick, chat et réactions, abonnements aux notifications,
suivi du tableau de bord `/admin`… La liste exacte et le nombre de lignes
figurent dans `manifeste.json`, à l'intérieur de chaque sauvegarde.

Sauvegardés : les **données**. Pas sauvegardés : la structure des tables et
les fonctions (elles sont déjà dans le dossier `supabase/` du dépôt), ni les
secrets rangés dans Supabase (Vault).

Chaque sauvegarde est **chiffrée** avec ta phrase de passe : sans elle,
personne ne peut l'ouvrir, pas même pour voir le nom des fichiers. Elle est
gardée **90 jours** (environ 13 sauvegardes), puis effacée automatiquement.
**Garde la phrase de passe en lieu sûr** (gestionnaire de mots de passe) :
perdue, les sauvegardes sont illisibles.

## Récupérer une sauvegarde

1. Sur GitHub, ouvre le dépôt `m1-hub`, onglet **Actions**.
2. À gauche, clique **Sauvegarde Supabase**.
3. Clique sur la sauvegarde voulue (la date est dans la liste).
4. En bas de la page, rubrique **Artifacts**, clique
   `sauvegarde-AAAA-MM-JJ` : un fichier `.zip` se télécharge.
5. Ouvre le `.zip` : il contient `sauvegarde-AAAA-MM-JJ.7z`.
6. Ouvre ce `.7z` avec **Keka** (Mac, gratuit) ou **7-Zip** (Windows,
   gratuit) et tape la phrase de passe.

Dedans :

| Fichier | Contenu |
|---|---|
| `restaurer.sql` | remet **toutes** les tables d'un coup |
| `restaurer/<table>.sql` | remet **une seule** table |
| `tables/<table>.json` | les lignes, lisibles (pour vérifier) |
| `manifeste.json` | date et nombre de lignes par table |

## Remettre les données dans Supabase

1. Ouvre `supabase.com` → ton projet → **SQL Editor** → **New query**.
2. Ouvre `restaurer.sql` (ou le fichier d'une seule table) avec TextEdit
   ou le Bloc-notes, sélectionne tout, copie, colle dans Supabase.
3. Clique **Run**. « Success » = c'est fait.

Ce que fait la restauration :

- elle **ajoute les lignes disparues** et ne modifie **aucune** ligne
  encore présente (une clé révoquée depuis reste révoquée) ;
- elle coupe un instant les contrôles automatiques (horaires de BeQuick,
  notifications du chat, anti-rafale), sinon d'anciennes parties seraient
  refusées et chaque ancien message renverrait une notification ;
- c'est **tout ou rien** : en cas d'erreur, rien n'est changé ;
- on peut la relancer sans risque : rien n'est ajouté en double.

**Remplacer** une table entière (revenir exactement à l'état du jour de la
sauvegarde, en effaçant ce qui a été ajouté depuis) : dans le fichier, en
tête du bloc de la table, retire les deux tirets devant la ligne
`-- delete from …`. Attention : vider `chat_messages` vide aussi
`chat_reactions` (utilise alors `restaurer.sql`, qui remet les deux).

Si Supabase refuse un fichier trop gros, colle les fichiers de
`restaurer/` un par un, en commençant par `chat_messages` avant
`chat_reactions`.

## Lancer une sauvegarde tout de suite

Onglet **Actions** → **Sauvegarde Supabase** → bouton **Run workflow** →
**Run workflow**. Une à deux minutes plus tard, la sauvegarde apparaît.
Aucun crédit Netlify n'est consommé : rien n'est publié.
