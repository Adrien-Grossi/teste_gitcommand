#!/usr/bin/env python3
"""Fabrique la page Claude (artifact) de « Mes courses » à partir de courses/index.html.

Une page Claude reçoit son propre squelette (doctype, <head>, <body>) à la publication :
on garde donc seulement le titre, les styles, le script du style choisi et le contenu du <body>,
sans ce qui ne sert qu'à l'appli installée (manifest, icônes, couleur de barre).
Les fichiers app.css, app.js, effects.js et vendor/ sont publiés tels quels à côté.

Usage : python3 tools/build_artifact.py <dossier de sortie>
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "courses"
APP_ONLY = re.compile(r'\s*<(link rel="(manifest|icon|apple-touch-icon)"|meta name="theme-color")[^>]*>')


def build(out_dir: pathlib.Path) -> pathlib.Path:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    head = re.search(r"<head>(.*?)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*?)</body>", html, re.S).group(1)
    head = re.sub(r'\s*<meta (charset|name="viewport")[^>]*>', "", head)
    head = APP_ONLY.sub("", head)
    out_dir.mkdir(parents=True, exist_ok=True)
    page = out_dir / "index.html"
    page.write_text(head.strip() + "\n" + body.strip() + "\n", encoding="utf-8")
    return page


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    print(build(pathlib.Path(sys.argv[1])))
