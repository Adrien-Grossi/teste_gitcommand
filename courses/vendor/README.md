# Bibliothèques intégrées

Copiées telles quelles depuis npm, pour que l'appli marche hors ligne et sans site externe.
Elles ne sont chargées que par `effects.js`, et seulement quand le style choisi en a besoin.

| Fichier          | Paquet npm               | Licence |
|------------------|--------------------------|---------|
| `three.min.js`   | three@0.128.0            | MIT     |
| `gsap.min.js`    | gsap@3.12.5              | Licence standard GSAP (usage gratuit) |
| `confetti.js`    | canvas-confetti@1.9.3    | ISC     |

Three.js reste en r128 : c'est la dernière version publiée avec un fichier unique
chargeable par une balise `<script>` (les suivantes sont des modules ES).
