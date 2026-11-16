# Mes courses

Appli de liste de courses installable (PWA), en ligne sur
https://adrien-grossi.github.io/teste_gitcommand/courses/

Trois onglets, un par moment :

- **Courses** : ce qu'il reste à acheter, par rayon. Un appui l'envoie dans « Ranger ».
- **Ranger** : ce qui est acheté sans date. On dicte la date de chaque article, on valide.
- **Chez moi** : le stock, du plus urgent au moins urgent. « Fini » ou « Jeté » le remet dans les courses.

**Appui long sur un article** (dans les trois onglets) : modifier son nom, sa quantité, sa note ou son rayon. « Remettre comme à l'origine » annule la modification ; un article ajouté à la main peut aussi être supprimé. Sur ordinateur : clic droit.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure de la page (aucune logique) |
| `app.css` | Styles : Carnet (clair/sombre), Verre, Argile |
| `app.js` | Logique : catalogue, données, affichage, dates, voix, rappels, transfert, atelier du verre |
| `effects.js` | Effets facultatifs (`window.CoursesFX`) : animations, fond et verre du style Verre (WebGL), fond 3D d'Argile ; l'appli marche sans eux |
| `sw.js` | Hors ligne et notifications de péremption |
| `vendor/` | GSAP, canvas-confetti, Three.js r128 pour le fond 3D d'Argile (voir `vendor/README.md`) |
| `manifest.webmanifest`, `icon-*.png` | Installation sur l'écran d'accueil |

Les données restent sur le téléphone (`localStorage`, clé `courses-v1`).
Le format est décrit en tête de la section 2 de `app.js` ; `normalize()` reprend les anciennes versions.

## Mettre à jour

1. Modifier les fichiers de `courses/`.
2. Si la liste des fichiers mis en cache change, changer `CACHE` dans `sw.js`.
3. Pousser sur `master` : GitHub Pages republie en une à deux minutes.

La page Claude se fabrique depuis la même source :
`python3 tools/build_artifact.py <dossier>`, puis publier ce dossier avec `app.css`, `app.js`, `effects.js` et `vendor/`.
