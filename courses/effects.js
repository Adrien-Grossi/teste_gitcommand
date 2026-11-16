/* =========================================================================
   Mes courses · effets visuels (facultatifs)
   L'appli appelle window.CoursesFX ; si une bibliothèque ne charge pas (hors ligne,
   mouvements réduits…), chaque effet s'efface sans rien casser.

   Bibliothèques, intégrées dans vendor/ et chargées seulement quand le style en a besoin :
     GSAP            animations de l'interface (surligneur, écrasement, apparitions)
     canvas-confetti confettis quand un rayon ou la liste est terminé
     Three.js        scène 3D en fond du style Argile (pâte à modeler)
   Sans bibliothèque : la réfraction du style Verre (filtres SVG calculés ici).

   API : setSkin(skin) · setGlass(réglages) · leave(li, action) → Promise · celebrate(kind, rect) · enter(view)
   ========================================================================= */
(function () {
  "use strict";

  const LIBS = {
    gsap: "vendor/gsap.min.js",
    confetti: "vendor/confetti.js",
    three: "vendor/three.min.js"
  };
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loading = {};
  function load(name) {
    if (!loading[name]) {
      loading[name] = new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = LIBS[name]; s.async = true;
        s.onload = resolve;
        s.onerror = () => { delete loading[name]; reject(new Error(name)); };
        document.head.appendChild(s);
      });
    }
    return loading[name];
  }
  const ready = (name) => (name === "gsap" ? window.gsap : name === "confetti" ? window.confetti : window.THREE);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  let skin = "carnet";
  let scene = null;          // scène 3D active (Argile)

  // Réglages du style Verre (atelier du verre, dans app.js) ; valeurs par défaut = réglages d'origine.
  const glass = {
    colors: ["#293dd9", "#8040f2", "#ff5c8c", "#ff8f4d", "#1ac7cc"],
    complexity: 3, size: 1, fusion: 0.24, lace: 0.4, speed: 1,
    zoom: 1.12, bezel: 1, diffraction: 0.5, frost: 0, light: 1, round: 1, thick: 1.6, reflect: 0.8, counter: 1, cwidth: 1, crough: 0.2,
    // Sources lumineuses posées dans le fond (1 à 3) : x, y sur l'écran (0 à 1), taille et
    // profondeur derrière le verre (0 à 1), intensité (0 à 2), couleur.
    lights: [
      { x: 0.12, y: 0.12, color: "#ffcf9a", power: 0.9, size: 0.45, depth: 0.5 },
      { x: 0.85, y: 0.64, color: "#9fd8ff", power: 0.6, size: 0.35, depth: 0.6 }
    ]
  };
  function setGlass(p) {
    Object.assign(glass, p);
    document.documentElement.style.setProperty("--frost-tint", "rgba(255,255,255," + (glass.frost * 0.16).toFixed(3) + ")");
    liquid.rebuild();
  }

  /* ---------- Style ---------------------------------------------------- */
  function setSkin(next) {
    skin = next;
    if (reduced) return;
    load("gsap").catch(() => {});
    load("confetti").catch(() => {});
    if (next === "verre") { liquid.start(); fluid.start(); } else { liquid.stop(); fluid.stop(); }
    if (scene && next !== "argile") { scene.dispose(); scene = null; }
    if (next === "argile" && !scene) {
      load("three").then(() => {
        if (skin !== "argile" || scene) return;
        try { scene = clayScene(); } catch (e) { scene = null; }
      }).catch(() => {});
    }
  }

  /* ---------- Article qui quitte la liste ------------------------------ */
  function collapse(tl, li) {
    tl.set(li, { overflow: "hidden" }).to(li, { height: 0, minHeight: 0, duration: 0.22, ease: "power2.inOut" });
  }
  function leave(li, action) {
    const gsap = ready("gsap");
    if (reduced || !gsap) return undefined;
    const tl = gsap.timeline();
    const name = li.querySelector(".name"), box = li.querySelector(".box"), check = box && box.querySelector("svg");

    if (skin === "carnet" && action === "got" && name) {
      // Coup de surligneur jaune sur le nom, coche qui se dessine, puis la ligne file à droite.
      const mark = document.createElement("span");
      mark.setAttribute("aria-hidden", "true");
      Object.assign(mark.style, {
        position: "absolute", left: "-4px", top: name.offsetTop + "px", height: name.offsetHeight + "px",
        width: name.offsetWidth + 8 + "px", background: css("--hl"), borderRadius: "4px 10px 6px 12px",
        transform: "scaleX(0) skewX(-8deg)", transformOrigin: "left center", zIndex: 0, opacity: 0.95
      });
      name.style.position = "relative"; name.style.zIndex = 1;
      name.parentNode.insertBefore(mark, name);
      tl.to(mark, { scaleX: 1, duration: 0.26, ease: "power2.out" })
        .to(name, { color: css("--hl-ink"), duration: 0.12 }, "<0.08")
        .to(box, { backgroundColor: css("--ok"), borderColor: css("--ok"), duration: 0.15 }, "<")
        .fromTo(check, { opacity: 0, scale: 0.3, rotate: -25 }, { opacity: 1, scale: 1, rotate: 0, color: "#fff", duration: 0.3, ease: "back.out(3)" }, "<")
        .to(li, { x: 40, opacity: 0, duration: 0.24, ease: "power2.in" }, "+=0.12");
    } else if (skin === "verre") {
      tl.to(li, { y: -14, scale: 0.96, opacity: 0, filter: "blur(8px)", duration: 0.34, ease: "power2.in" });
      if (scene) scene.kick();
    } else if (skin === "argile") {
      // Écrasé comme de la pâte, rebond, puis il disparaît.
      tl.to(li, { scaleY: 0.8, scaleX: 1.05, duration: 0.09, ease: "power2.out" })
        .to(li, { scaleY: 1.08, scaleX: 0.95, duration: 0.12, ease: "power2.out" })
        .to(li, { scale: 0, opacity: 0, duration: 0.22, ease: "back.in(2.2)" });
      if (scene) scene.kick();
    } else {
      tl.to(li, { x: action === "got" ? 30 : -30, opacity: 0, duration: 0.25, ease: "power2.in" });
    }
    collapse(tl, li);
    return tl.then();
  }

  /* ---------- Fêtes : date enregistrée, rayon fini, liste finie -------- */
  const PALETTES = {
    carnet: { colors: ["#ffd92e", "#ffe98a", "#ffffff", "#f2f1ec"], shapes: ["square"], scalar: 0.9 },
    verre: { colors: ["#7cf3e3", "#9d8bff", "#ff8fc8", "#ffffff"], shapes: ["circle"], scalar: 1.1 },
    argile: { colors: ["#ffb38a", "#b9a6ff", "#8fe3c3", "#ffd1e3", "#ffe08a"], shapes: ["circle"], scalar: 1.7 }
  };
  function burst(opts) {
    const confetti = ready("confetti");
    if (!confetti || reduced) return;
    const p = PALETTES[skin] || PALETTES.carnet;
    confetti(Object.assign({ colors: p.colors, shapes: p.shapes, scalar: p.scalar, disableForReducedMotion: true, zIndex: 50 }, opts));
  }
  function celebrate(kind, rect) {
    const gsap = ready("gsap");
    if (kind === "saved") {
      if (gsap && !reduced) gsap.fromTo("#lbDate", { scale: 1.12 }, { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      if (scene) scene.kick(0.6);
      return;
    }
    if (kind === "aisle" && rect) {
      burst({ particleCount: 45, spread: 70, startVelocity: 28, ticks: 140,
        origin: { x: (rect.left + rect.width / 2) / innerWidth, y: Math.max(0.1, rect.top / innerHeight) } });
      if (scene) scene.kick(1.2);
    }
    if (kind === "list") {
      burst({ particleCount: 120, angle: 60, spread: 70, origin: { x: 0, y: 0.85 } });
      burst({ particleCount: 120, angle: 120, spread: 70, origin: { x: 1, y: 0.85 } });
      if (scene) scene.kick(2);
    }
  }

  /* ---------- Changement d'onglet : les blocs arrivent en cascade ------ */
  function enter(view) {
    const gsap = ready("gsap");
    if (reduced || !gsap || !view) return;
    const blocks = Array.from(view.querySelectorAll(".block, .bigcta, .empty, .notice")).slice(0, 8);
    gsap.fromTo(blocks, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: "power2.out", clearProps: "transform,opacity" });
  }

  /* ---------- Petits gestes ------------------------------------------- */
  // Le compteur en haut rebondit quand il change.
  const count = document.getElementById("count");
  if (count) new MutationObserver(() => {
    const gsap = ready("gsap"), b = count.querySelector("b");
    if (gsap && b && !reduced) gsap.fromTo(b, { scale: 1.3 }, { scale: 1, duration: 0.45, ease: "back.out(3)" });
  }).observe(count, { childList: true, characterData: true, subtree: true });

  // Argile : les boutons s'écrasent sous le doigt et rebondissent.
  const PRESSABLE = ".tap, .btn, .pill, .pad button, .bigcta, .tabs button, .mic, .side, .iconbtn, .skin";
  document.addEventListener("pointerdown", (e) => {
    const gsap = ready("gsap"), el = e.target.closest(PRESSABLE);
    if (skin !== "argile" || !gsap || !el || reduced) return;
    gsap.to(el, { scaleX: 1.04, scaleY: 0.9, duration: 0.08, ease: "power2.out" });
    const release = () => {
      gsap.to(el, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1.2, 0.35)", clearProps: "transform" });
      window.removeEventListener("pointerup", release); window.removeEventListener("pointercancel", release);
    };
    window.addEventListener("pointerup", release); window.addEventListener("pointercancel", release);
  }, { passive: true });

  // Verre : le reflet de chaque plaque suit le doigt (variables --mx / --my lues par app.css).
  const GLASS = ".rows, .card, .pill, .iconbtn, .skin, .pad button, .datebox, .mic, .btn.ghost, .bigcta";
  const shine = (e) => {
    if (skin !== "verre" || !e.target.closest) return;
    const el = e.target.closest(GLASS); if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", e.clientX - r.left + "px");
    el.style.setProperty("--my", e.clientY - r.top + "px");
  };
  document.addEventListener("pointermove", shine, { passive: true });
  document.addEventListener("pointerdown", shine, { passive: true });

  /* =====================  Verre liquide (réfraction)  ===================== *
   * Comme le Liquid Glass d'Apple : derrière chaque plaque, l'image est courbée sur les bords
   * (une lentille épaisse), et le rouge, le vert et le bleu sont courbés un peu différemment,
   * ce qui crée une frange irisée (diffraction). Pour chaque taille de plaque, on calcule une
   * carte de déformation (canvas) et un filtre SVG, appliqué en backdrop-filter.
   * Chrome seulement ; ailleurs, le verre dépoli défini dans app.css reste en place.          */
  const LIQUID = ".rows, .card, .pill, .iconbtn, .skin, .pad button, .datebox, .mic, .btn.ghost, .bigcta, header, .tabs, .toast";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const liquid = {
    supported: (() => { try { return CSS.supports("backdrop-filter", "url(#x)") && /Chrome\//.test(navigator.userAgent); } catch (e) { return false; } })(),
    filters: new Map(), defs: null, observer: null, frame: 0, on: false, version: 0, rebuildTimer: 0,

    // Carte de déformation : rouge = décalage horizontal, vert = décalage vertical (128 = aucun).
    // Deux effets s'additionnent, comme dans une bille de verre soufflé aplatie :
    //  - le bord bombé (bezel) : profil en quart de cercle ; l'image est très courbée tout au bord,
    //    puis la courbure s'adoucit vers l'intérieur (pente du profil), sans arête ;
    //  - le grossissement (zoom > 1) : tout l'intérieur montre une zone plus petite, donc agrandie.
    // range = décalage maximal en pixels, qui devient l'échelle du filtre.
    // Renvoie aussi le masque de lumière : où la carte s'éclaire de la couleur du fond
    // (le long du bord, surtout en haut). Aucune couleur n'y est séparée : la dispersion vient
    // uniquement de la déviation (voir filter), donc nulle au centre et forte près des bords.
    maps(w, h, r, bezel, zoom, range) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"), img = g.createImageData(w, h), px = img.data;
      const lc = document.createElement("canvas"); lc.width = w; lc.height = h;
      const lg = lc.getContext("2d"), limg = lg.createImageData(w, h), lpx = limg.data;
      const rim = bezel * 1.4;
      const shrink = 1 - 1 / zoom;
      const soft = Math.max(2, bezel * 0.4);   // douceur du passage d'un côté à l'autre
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ox = x + 0.5 - w / 2, oy = y + 0.5 - h / 2;
          // Distance au bord « adoucie » : un minimum lissé des distances aux quatre côtés.
          // Sa direction (vers le bord) tourne en douceur d'un côté à l'autre : pas d'arête en diagonale.
          const el = Math.exp(-(x + 0.5) / soft), er = Math.exp(-(w - x - 0.5) / soft);
          const et = Math.exp(-(y + 0.5) / soft), eb = Math.exp(-(h - y - 0.5) / soft);
          const sum = el + er + et + eb;
          const depth = -soft * Math.log(sum);
          let nx = (er - el) / sum, ny = (eb - et) / sum;
          const len = Math.hypot(nx, ny) || 1; nx /= len; ny /= len;
          // pente d'un bord en quart de cercle : (1 - t) / √(1 - (1 - t)²), bornée tout au bord
          const t = Math.max(0.06, Math.min(1, depth / bezel)), u = 1 - t;
          const edge = depth < bezel ? (u / Math.sqrt(1 - u * u)) / 3 * bezel : 0;
          const dx = -ox * shrink - nx * edge, dy = -oy * shrink - ny * edge;
          const i = (y * w + x) * 4;
          px[i] = 128 + Math.max(-1, Math.min(1, dx / range)) * 127;
          px[i + 1] = 128 + Math.max(-1, Math.min(1, dy / range)) * 127;
          px[i + 2] = 128; px[i + 3] = 255;
          // plus de lumière sur le haut (côté éclairé), moins sur le bas, peu sur les côtés
          const facing = (oy < 0 ? 1 : 0.6) * (0.45 + 0.55 * Math.abs(ny)) * glass.light;
          const glow = depth < rim ? Math.min(1, Math.pow(1 - Math.max(depth, 0) / rim, 1.4) * facing) : 0;
          lpx[i] = lpx[i + 1] = lpx[i + 2] = 255; lpx[i + 3] = glow * 255;
        }
      }
      g.putImageData(img, 0, 0); lg.putImageData(limg, 0, 0);
      return { map: c.toDataURL(), light: lc.toDataURL() };
    },
    // Un filtre par taille :
    //  1. trois déformations (rouge, vert, bleu) de forces différentes, recombinées : franges irisées ;
    //  2. la lumière des bords : le fond derrière la carte, adouci, saturé et éclairci, posé sur le masque
    //     de lumière. Le halo prend donc la couleur de ce qui passe derrière (rouge derrière = halo rouge).
    filter(w, h, r, lens) {
      const id = "lg" + this.version + "-" + w + "-" + h + "-" + r + (lens ? "-l" : "");
      if (this.filters.has(id)) return id;
      if (!this.defs) {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
        this.defs = document.createElementNS(SVG_NS, "defs");
        svg.appendChild(this.defs);
        document.body.appendChild(svg);
      }
      // Bombé proportionné : fort sur les cartes, discret sur les éléments étroits (pavé, pastilles), sinon l'image se déchire.
      const small = w < 200 || h < 44;
      // le bombé ne dépasse jamais la moitié de la carte (sinon les deux bords se chevauchent)
      const bezel = Math.min(Math.min(w, h) * 0.48, Math.max(4, Math.min(lens && !small ? 32 : 14, Math.min(w, h) * (small ? 0.22 : 0.45)) * glass.bezel));
      const zoom = lens && !small ? glass.zoom : 1;
      const range = bezel + (Math.max(w, h) / 2) * (1 - 1 / zoom);
      const scale = range * 2;
      const channel = (n, s) => '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + s.toFixed(1) + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/>' +
        '<feColorMatrix in="d' + n + '" type="matrix" values="' + ["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0"][n] + ' 0 0 0 1 0" result="c' + n + '"/>';
      const f = document.createElementNS(SVG_NS, "filter");
      f.setAttribute("id", id);
      for (const [k, v] of Object.entries({ x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" })) f.setAttribute(k, v);
      const m = this.maps(w, h, r, bezel, zoom, range);
      const img = (href, result) => '<feImage href="' + href + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="' + result + '"/>';
      // éclaircit la couleur du fond sans la blanchir (pas de décalage vers le blanc)
      const lift = '<feFuncR type="gamma" amplitude="1.45" exponent="0.9"/><feFuncG type="gamma" amplitude="1.45" exponent="0.9"/><feFuncB type="gamma" amplitude="1.45" exponent="0.9"/>';
      f.innerHTML = img(m.map, "map") +
        // Dispersion : chaque couleur est déviée avec une force différente (au maximum, le bleu presque plus).
        // L'écart est proportionnel à la déviation : nul au centre, de plus en plus fort vers les bords.
        channel(0, scale) + channel(1, scale * (1 - 0.45 * glass.diffraction)) + channel(2, scale * (1 - 0.9 * glass.diffraction)) +
        '<feBlend in="c0" in2="c1" mode="screen" result="rg"/><feBlend in="rg" in2="c2" mode="screen" result="rgb"/>' +
        '<feGaussianBlur in="rgb" stdDeviation="0.5" result="clear"/>' +
        img(m.light, "lightmask") +
        '<feGaussianBlur in="SourceGraphic" stdDeviation="7" result="soft"/>' +
        '<feColorMatrix in="soft" type="saturate" values="1.9" result="sat"/>' +
        '<feComponentTransfer in="sat" result="bright">' + lift + '</feComponentTransfer>' +
        '<feComposite in="bright" in2="lightmask" operator="in" result="glow"/>' +
        '<feBlend in="glow" in2="clear" mode="screen"/>';
      this.defs.appendChild(f);
      this.filters.set(id, f);
      return id;
    },
    apply() {
      this.frame = 0;
      if (!this.on) return;
      // Quand le verre des cartes est dessiné en WebGL, le filtre SVG ne sert plus qu'aux barres
      // (en-tête, onglets, message), qui réfractent la liste qui défile sous elles.
      const targets = document.documentElement.classList.contains("gl-glass") ? "header, .tabs, .toast" : LIQUID;
      document.querySelectorAll(targets).forEach((el) => {
        const box = el.getBoundingClientRect();
        if (!box.width || !box.height) return;
        const w = Math.round(box.width), h = Math.round(box.height);
        const r = Math.round(Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, w / 2, h / 2));
        // Les barres (en-tête, onglets) : bord seulement, sans loupe, et un peu de flou
        // pour que le texte qui passe dessous ne gêne pas la lecture. Le reste : loupe nette.
        const bar = el.matches("header, .tabs, .toast");
        const id = this.filter(w, h, r, !bar);
        if (el.dataset.lg === id) return;
        el.dataset.lg = id;
        const blur = (bar ? 5 : 0) + glass.frost * 14;   // « verre fumé » de l'atelier : du flou en plus
        el.style.backdropFilter = el.style.webkitBackdropFilter = "url(#" + id + ")" + (blur ? " blur(" + blur.toFixed(1) + "px)" : "") + " saturate(1.35)";
      });
    },
    schedule() { if (!this.frame) this.frame = requestAnimationFrame(() => this.apply()); },
    // Les réglages ont changé : on jette les filtres et on les recalcule (regroupé pendant qu'on glisse un curseur).
    rebuild() {
      clearTimeout(this.rebuildTimer);
      this.rebuildTimer = setTimeout(() => {
        this.version++;
        this.filters.clear();
        if (this.defs) this.defs.textContent = "";
        document.querySelectorAll("[data-lg]").forEach((el) => { el.style.backdropFilter = el.style.webkitBackdropFilter = ""; delete el.dataset.lg; });
        this.schedule();
      }, 90);
    },
    start() {
      if (!this.supported || this.on) return;
      this.on = true;
      document.documentElement.classList.add("liquid");
      this.observer = new MutationObserver(() => this.schedule());
      this.observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "open"] });
      this.onResize = () => this.schedule();
      addEventListener("resize", this.onResize);
      this.schedule();
    },
    stop() {
      if (!this.on) return;
      this.on = false;
      document.documentElement.classList.remove("liquid");
      this.observer.disconnect();
      removeEventListener("resize", this.onResize);
      document.querySelectorAll("[data-lg]").forEach((el) => { el.style.backdropFilter = el.style.webkitBackdropFilter = ""; delete el.dataset.lg; });
    }
  };

  /* =====================  Fond fluide + verre des cartes (WebGL)  ========== *
   * Le fond (peinture versée qui bouge lentement) et le verre des cartes sont calculés ensemble,
   * pixel par pixel, par la carte graphique. Méthode reprise des rendus « Liquid Glass » de référence
   * (LiquidGlass de ybouane, liquidGL, article kube.io) :
   *  - la forme du verre est un champ de hauteur : bord en demi-cercle h = √(d·(2R − d)),
   *    d = distance au bord, R = largeur du bombé ; la normale de la surface vient de sa pente ;
   *  - réfraction rayon par rayon : le rayon venu de l'œil entre dans le verre selon la loi de Snell
   *    (indice 1,5), traverse l'épaisseur du verre et touche le fond plus loin : presque rien au
   *    centre (plat), forte déviation sur la courbe du bord (épais et penché) ; plus la loupe ;
   *  - dispersion : chaque couleur a son propre indice, donc le rouge, le vert et le bleu se
   *    séparent là où le verre dévie la lumière ;
   *  - aucune lumière venue de l'avant : toute la lumière vient du fond. Seul ajout, la lumière du
   *    fond qui voyage dans le verre et ressort tout au bord, en un liseré fin de sa couleur.
   * Les éléments en verre de la page deviennent transparents (classe .gl-glass) : leur texte reste
   * net par-dessus. Si WebGL manque, les disques et le verre en CSS de app.css restent en place.   */
  const GL_GLASS = ".rows, .card, .pill:not(.accent), .iconbtn, .skin, .pad button, .datebox, .mic:not(.on), .btn.ghost";
  const MAX_CARDS = 32;
  const fluid = {
    canvas: null, gl: null, on: false, raf: 0, last: 0, time: 0, prevBoxes: "", radius: new WeakMap(),
    FRAG: [
      "precision highp float;",
      "uniform vec2 res; uniform float t, scroll, oct, warp, size, fusion, lace, ncol, px;",
      "uniform vec3 cols[8];",
      "uniform vec4 cards[" + MAX_CARDS + "]; uniform float crad[" + MAX_CARDS + "]; uniform float ncard;",
      "uniform float gZoom, gBezel, gDisp, gFrost, gLight, gRound, gThick, gReflect, gCounter, gCw, gRough;",
      "uniform vec4 lPos[3], lCol[3]; uniform float nlight;",   // sources du fond : (x, y, profondeur, rayon) en pixels CSS ; (couleur, intensité)
      "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
      "float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
      "  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }",
      // oct niveaux de détail : peu = grandes formes douces, beaucoup = volutes
      "float fbm(vec2 p){ float v = 0.0, a = 0.55; for (int i = 0; i < 8; i++){ float w = clamp(oct - float(i), 0.0, 1.0); if (w <= 0.0) break; v += a * n(p) * w; p = p*1.9 + 1.7; a *= 0.45; } return v; }",
      "vec3 pal(float i){ float k = mod(i, ncol); vec3 c = cols[0];",
      "  for (int j = 0; j < 8; j++) if (abs(float(j) - k) < 0.5) c = cols[j];",
      "  return c; }",
      // Couleur du fond en un point (pixels CSS, origine en haut à gauche).
      "vec3 bgAt(vec2 css){",
      "  vec2 fc = vec2(css.x * px, res.y - css.y * px);",
      "  vec2 p = (fc - 0.5*res) / res.y * 0.9 / size + vec2(0.0, scroll * 0.25);",
      "  float s = t * 0.025;",
      "  vec2 q = vec2(fbm(p + vec2(0.0, s)), fbm(p + vec2(5.2, 1.3) - s));",
      "  vec2 r = vec2(fbm(p + warp*q + vec2(1.7, 9.2) + s*1.4), fbm(p + warp*q + vec2(8.3, 2.8) - s));",
      "  float v = fbm(p + warp*1.07*r) * 2.6 + r.x;",
      "  float k = v * 1.8 + p.x * 1.6 - p.y * 2.0;",
      "  float i = floor(k), fr = fract(k);",
      "  vec3 c = mix(pal(i), pal(i + 1.0), smoothstep(0.5 - fusion*0.5, 0.5 + fusion*0.5, fr));",
      "  c = mix(c, vec3(1.0, 0.96, 0.92), smoothstep(0.03, 0.0, abs(fr - 0.5)) * lace);",
      "  c *= 0.94 + 0.08 * fbm(p * 1.5 + r);",
      // les sources lumineuses font partie du fond : un cœur lumineux et un halo large
      "  for (int j = 0; j < 3; j++){",
      "    if (float(j) >= nlight) break;",
      "    float d = length(css - lPos[j].xy) / lPos[j].w;",
      "    vec3 glow = lCol[j].rgb * lCol[j].a * (exp(-d * d) * 0.6 + exp(-d * 1.2) * 0.22);",
      "    c = 1.0 - (1.0 - c) * (1.0 - clamp(glow, 0.0, 1.0));",   // mode écran : éclaircit sans brûler en blanc
      "  }",
      "  return c;",
      "}",
      // Distance signée à un rectangle arrondi, et hauteur du bord en demi-cercle.
      "float rr(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r; }",
      // Profil du bord : courbe de Lamé h = z·(1 − uᵖ)^(1/p), u = 1 − d/z (d = distance au bord).
      // p = 2 : cercle (dôme parfait). p plus grand : sommet plus plat et bord plus raide, mais toujours
      // une courbe continue, sans jonction entre un plateau et un bord (une jonction fait un pli visible).
      "float bevel(float d, float z, float p){ float u = 1.0 - clamp(d / z, 0.0, 1.0); return z * pow(max(1.0 - pow(u, p), 0.0), 1.0 / p); }",
      "void main(){",
      "  vec2 pc = vec2(gl_FragCoord.x, res.y - gl_FragCoord.y) / px;",
      "  vec3 base = bgAt(pc);",
      // la carte sous ce pixel, s'il y en a une
      "  vec4 b = vec4(0.0); float rad = 0.0; bool hit = false;",
      "  for (int j = 0; j < " + MAX_CARDS + "; j++){",
      "    if (float(j) >= ncard) break;",
      // Arrondi réglable, jusqu'au galet ; plafonné à 34 px pour qu'une plaque haute (un rayon entier)
      // garde des coins de carte et ne devienne pas un galet géant.
      "    vec2 hs = cards[j].zw * 0.5; float rj = min(min(mix(min(6.0, min(hs.x, hs.y)), min(hs.x, hs.y), gRound), 34.0), crad[j]);",
      "    if (rr(pc - cards[j].xy - hs, hs, rj) < 1.0){ b = cards[j]; rad = rj; hit = true; }",
      "  }",
      "  if (!hit){ gl_FragColor = vec4(base, 1.0); return; }",
      "  vec2 hs = b.zw * 0.5, lp = pc - b.xy - hs;",
      "  float sd = rr(lp, hs, rad), inside = -sd;",
      // Le profil couvre toujours toute la demi-hauteur (zR). Le réglage « bombé » ne change que la
      // forme de la courbe : 100 % et plus = dôme parfait ; en dessous, la courbe se plate au centre et se
      // raidit au bord, progressivement (exposant pp de 2 à 16). Aucun palier, donc aucun pli.
      // Largeur du bord courbe : toute la demi-hauteur d'un petit élément, mais jamais plus de 34 px.
      // Sur une plaque haute, le centre reste donc plat et seul le bord courbe réfracte. Le raccord entre
      // le centre plat et le bord doit rester sans pli : l'exposant monte à 3 minimum dès que la plaque
      // dépasse 34 px de demi-hauteur (progressivement entre 34 et 51 px).
      "  float zR = clamp(min(hs.x, hs.y), 1.5, 34.0);",
      "  float plateau = smoothstep(34.0, 51.0, min(hs.x, hs.y));",
      "  float pp = mix(2.0 / clamp(gBezel, 0.125, 1.0), max(2.0 / clamp(gBezel, 0.125, 1.0), 3.0), plateau);",
      // Pente de la surface (différences finies sur le champ de hauteur) → normale.
      // Galet : arrondi = demi-hauteur, donc la distance exacte n'a pas de pli dans le bombé.
      "  float e = 1.0;",
      "  float hL = bevel(-rr(lp - vec2(e, 0.0), hs, rad), zR, pp), hR = bevel(-rr(lp + vec2(e, 0.0), hs, rad), zR, pp);",
      "  float hU = bevel(-rr(lp - vec2(0.0, e), hs, rad), zR, pp), hD = bevel(-rr(lp + vec2(0.0, e), hs, rad), zR, pp);",
      "  vec2 g = vec2(hR - hL, hD - hU) / (2.0 * e);",
      "  vec3 N = normalize(vec3(-g, 1.0));",
      // Réfraction rayon par rayon : le rayon venu de l'œil entre dans le verre (loi de Snell),
      // traverse son épaisseur, et touche le fond plus loin. Chaque couleur a son indice : dispersion.
      "  float thick = bevel(inside, zR, pp) + zR * 0.2;",
      "  vec3 I = vec3(0.0, 0.0, -1.0);",
      "  vec3 Tr = refract(I, N, 1.0 / (1.5 - 0.07 * gDisp));",
      "  vec3 Tg = refract(I, N, 1.0 / 1.5);",
      "  vec3 Tb = refract(I, N, 1.0 / (1.5 + 0.07 * gDisp));",
      "  vec2 zoom = -lp * (1.0 - 1.0/gZoom);",
      // gThick : épaisseur du verre. Très épais, l'image se retourne sur le bord (pli net), comme dans un bloc de verre.
      "  vec2 oR = Tr.xy / max(-Tr.z, 0.25) * thick * gThick + zoom;",
      "  vec2 oG = Tg.xy / max(-Tg.z, 0.25) * thick * gThick + zoom;",
      "  vec2 oB = Tb.xy / max(-Tb.z, 0.25) * thick * gThick + zoom;",
      "  vec3 col = vec3(bgAt(pc + oR).r, bgAt(pc + oG).g, bgAt(pc + oB).b);",
      // verre fumé : on mélange avec une moyenne autour (flou)
      "  if (gFrost > 0.01){",
      "    vec2 sp = pc + oG; float rb = 4.0 + gFrost * 12.0;",   // le flou continue d'augmenter au-delà de 100 %
      "    vec3 bl = (bgAt(sp + vec2(rb, 0.0)) + bgAt(sp - vec2(rb, 0.0)) + bgAt(sp + vec2(0.0, rb)) + bgAt(sp - vec2(0.0, rb))) * 0.25;",
      "    col = mix(col, bl + 0.05, min(gFrost, 1.0));",
      "  }",
      // Le verre absorbe un peu là où il est épais ; la lumière du fond qui voyage dans le verre
      // ressort tout au bord, en un liseré très fin de sa propre couleur.
      "  col *= 1.0 - 0.05 * bevel(inside, zR, pp) / zR;",
      // Une grande plaque (un rayon entier) porte beaucoup de texte : on assombrit un peu son intérieur
      // (pas son bord) pour que le texte blanc reste lisible sur les zones claires du fond. Nul sur les
      // petits éléments, donc leur rendu ne change pas.
      "  col *= 1.0 - 0.32 * plateau * smoothstep(0.0, 1.0, inside / zR);",
      // Reflet du décor : sur le bord penché, le verre agit comme un miroir (Fresnel : plus on le voit
      // en biais, plus il réfléchit). On y voit le décor de l'autre côté du bord, retourné.
      "  vec2 nrm = N.xy / max(length(N.xy), 1e-3);",   // sens du bord, vers l'extérieur de la carte
      "  float rimK = 1.0 - N.z;",
      "  float fres = 0.03 + 0.97 * pow(rimK, 2.2);",
      "  vec3 refl = bgAt(pc + nrm * (inside * 2.0 + 5.0));",
      "  col = mix(col, refl * 1.1 + 0.04, clamp(fres * gReflect, 0.0, 0.92));",
      // Lumière des sources du fond à travers le verre : depuis la vraie position de chaque source
      // (derrière le verre), le rayon entre par l'arrière plat, traverse, ressort par l'avant courbe.
      // On voit un éclat là où la courbe le renvoie vers l'œil — seulement sur la partie courbe
      // (sur le plat, la source se voit déjà à travers le verre, par la réfraction du fond).
      "  vec3 V = vec3(0.0, 0.0, 1.0);",
      "  float curve = smoothstep(0.02, 0.35, 1.0 - N.z);",
      "  for (int j = 0; j < 3; j++){",
      "    if (float(j) >= nlight) break;",
      "    vec3 L = normalize(vec3(lPos[j].xy - pc, -lPos[j].z));",
      "    vec3 Din = refract(-L, vec3(0.0, 0.0, -1.0), 1.0 / 1.5);",
      "    vec3 Dout = refract(Din, -N, 1.5);",
      "    float glint = pow(max(dot(Dout, V), 0.0), 28.0) * curve;",
      "    vec2 toL = lPos[j].xy - pc; float dl = length(toL);",
      "    float near = 1.0 / (1.0 + pow(dl / (lPos[j].w * 4.0), 2.0));",   // plus faible quand la source est loin
      "    col = 1.0 - (1.0 - col) * (1.0 - clamp(lCol[j].rgb * lCol[j].a * glint * near * 1.2 * gLight, 0.0, 1.0));",
      // Contre-reflet : la lumière qui entre d'un côté du verre ressort de l'autre. Sur le bord OPPOSÉ
      // à la source : un fin liseré net très lumineux contre le bord, et juste à l'intérieur une
      // bande sombre nette (l'ombre inverse), comme sur du verre épais.
      "    float opp = smoothstep(0.0, 0.85, -dot(nrm, toL / max(dl, 1.0))) * smoothstep(0.02, 0.25, rimK);",
      // Épaisseur (gCw) : largeur du liseré et de la bande sombre, qui grandissent ensemble.
      // Rugosité (gRough) : 0 = bords nets (verre poli) ; plus haut = bords adoucis et trait cassé en grain.
      "    float soft = mix(0.06, 1.0, gRough);",
      "    float lc = 1.8 * gCw, lh = 1.0 * gCw, dc = 5.5 * gCw, dh = 2.0 * gCw;",
      "    float grain = mix(1.0, 0.35 + 1.3 * n(pc * 0.38), gRough);",
      "    float line = (1.0 - smoothstep(lh * (1.0 - soft), lh * (1.0 + soft) + 0.5, abs(inside - lc))) * grain;",
      "    float dark = (1.0 - smoothstep(dh * (1.0 - soft), dh * (1.0 + soft) + 0.5, abs(inside - dc))) * grain;",
      "    float pw = clamp(lCol[j].a, 0.0, 1.0);",
      "    col *= 1.0 - 0.42 * dark * opp * near * pw * gCounter;",
      "    col = 1.0 - (1.0 - col) * (1.0 - clamp(lCol[j].rgb * lCol[j].a * line * opp * near * 1.8 * gCounter, 0.0, 1.0));",
      "  }",
      "  col += col * exp(-inside / 0.9) * 0.3 * gLight;",
      "  gl_FragColor = vec4(mix(base, col, 1.0 - smoothstep(-0.8, 0.6, sd)), 1.0);",   // bord lissé
      "}"
    ].join("\n"),
    // Le contexte graphique est créé une seule fois ; ensuite on met simplement en pause ou on reprend.
    start() {
      if (reduced || this.on) return;
      if (!this.gl && !this.init()) return;
      this.on = true;
      addEventListener("resize", this.onResize);
      document.addEventListener("visibilitychange", this.onVisible);
      this.onResize();
      this.canvas.hidden = false;
      document.documentElement.classList.add("fx-fluid", "gl-glass");
      liquid.rebuild();
      this.last = performance.now();
      this.raf = requestAnimationFrame((now) => this.draw(now));
    },
    init() {
      const canvas = document.getElementById("fluid");
      const gl = canvas && canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
      if (!gl) return false;
      const shader = (type, src) => { const sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
      const prog = gl.createProgram();
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, "attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }"));
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, this.FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "a");
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      this.u = {};
      for (const name of ["res", "t", "scroll", "oct", "warp", "size", "fusion", "lace", "ncol", "px", "cols", "cards", "crad", "ncard",
        "gZoom", "gBezel", "gDisp", "gFrost", "gLight", "gRound", "gThick", "gReflect", "gCounter", "gCw", "gRough", "lPos", "lCol", "nlight"]) this.u[name] = gl.getUniformLocation(prog, name);
      Object.assign(this, { canvas, gl });
      this.onResize = () => {
        const k = 0.85;  // un peu sous la résolution de l'écran : les bords du verre restent nets, le téléphone respire
        canvas.width = Math.max(1, Math.round(innerWidth * k)); canvas.height = Math.max(1, Math.round(innerHeight * k));
        gl.viewport(0, 0, canvas.width, canvas.height);
        this.prevBoxes = "";
      };
      this.onVisible = () => { if (document.hidden) cancelAnimationFrame(this.raf); else { this.last = performance.now(); this.raf = requestAnimationFrame((now) => this.draw(now)); } };
      return true;
    },
    // Les éléments en verre visibles (position et arrondi), lus à chaque image.
    boxes() {
      const boxes = new Float32Array(MAX_CARDS * 4), radii = new Float32Array(MAX_CARDS);
      let n = 0;
      for (const el of document.querySelectorAll(GL_GLASS)) {
        if (n === MAX_CARDS) break;
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height || b.bottom < 0 || b.top > innerHeight) continue;
        if (el.closest(".picker, .lab-body")) continue;   // panneaux opaques : leur verre reste en CSS
        if (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true })) continue;
        let r = this.radius.get(el);
        if (r === undefined) { r = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0; this.radius.set(el, r); }
        // Seules les cartes d'information (.card) imposent leur propre arrondi (moins rond qu'un galet, pour
        // laisser de la place au texte aux extrémités) ; tout le reste garde l'arrondi réglé dans l'atelier.
        boxes.set([b.left, b.top, b.width, b.height], n * 4); radii[n] = el.matches(".card") ? r : 999; n++;
      }
      return { boxes, radii, n };
    },
    draw(now) {
      this.raf = requestAnimationFrame((t) => this.draw(t));
      // 20 images/s suffisent pour le fond ; dès qu'un élément bouge (défilement, animation),
      // on redessine à chaque image pour que le verre suive sans retard.
      const { boxes, radii, n } = this.boxes();
      const key = n + ":" + boxes.slice(0, n * 4).join(",");
      const moved = key !== this.prevBoxes;
      if (!moved && now - this.last < 50) return;
      this.prevBoxes = key;
      this.time += ((now - this.last) / 1000) * glass.speed;   // la vitesse de l'atelier (0 = arrêt)
      this.last = now;
      const gl = this.gl, u = this.u, cols = glass.colors.slice(0, 8);
      const rgb = new Float32Array(24);
      cols.forEach((hex, i) => { const v = parseInt(hex.slice(1), 16); rgb.set([(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255], i * 3); });
      gl.uniform2f(u.res, this.canvas.width, this.canvas.height);
      gl.uniform1f(u.px, this.canvas.width / innerWidth);
      gl.uniform1f(u.t, this.time);
      gl.uniform1f(u.scroll, scrollY / innerHeight);
      gl.uniform1f(u.oct, glass.complexity);
      gl.uniform1f(u.warp, 0.5 + 0.3 * glass.complexity);
      gl.uniform1f(u.size, glass.size);
      gl.uniform1f(u.fusion, Math.max(0.02, glass.fusion));
      gl.uniform1f(u.lace, glass.lace);
      gl.uniform1f(u.ncol, cols.length);
      gl.uniform3fv(u.cols, rgb);
      gl.uniform4fv(u.cards, boxes); gl.uniform1fv(u.crad, radii); gl.uniform1f(u.ncard, n);
      gl.uniform1f(u.gZoom, glass.zoom); gl.uniform1f(u.gBezel, glass.bezel); gl.uniform1f(u.gDisp, glass.diffraction);
      gl.uniform1f(u.gFrost, glass.frost); gl.uniform1f(u.gLight, glass.light); gl.uniform1f(u.gRound, glass.round);
      gl.uniform1f(u.gThick, glass.thick); gl.uniform1f(u.gReflect, glass.reflect); gl.uniform1f(u.gCounter, glass.counter);
      gl.uniform1f(u.gCw, glass.cwidth); gl.uniform1f(u.gRough, glass.crough);
      // Sources du fond : elles dérivent lentement avec les vagues (même vitesse que le fond).
      const lp = new Float32Array(12), lcol = new Float32Array(12), lights = glass.lights.slice(0, 3);
      lights.forEach((l, i) => {
        const v = parseInt(l.color.slice(1), 16);
        lp.set([l.x * innerWidth + Math.sin(this.time * 0.11 + i * 2.1) * innerWidth * 0.04,
                l.y * innerHeight + Math.cos(this.time * 0.09 + i * 1.3) * innerHeight * 0.03,
                20 + l.depth * 220, Math.max(12, l.size * Math.min(innerWidth, innerHeight) * 0.45)], i * 4);
        lcol.set([(v >> 16 & 255) / 255, (v >> 8 & 255) / 255, (v & 255) / 255, l.power], i * 4);
      });
      gl.uniform4fv(u.lPos, lp); gl.uniform4fv(u.lCol, lcol); gl.uniform1f(u.nlight, lights.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    stop() {
      if (!this.on) return;
      this.on = false;
      cancelAnimationFrame(this.raf);
      removeEventListener("resize", this.onResize);
      document.removeEventListener("visibilitychange", this.onVisible);
      this.canvas.hidden = true;
      document.documentElement.classList.remove("fx-fluid", "gl-glass");
      liquid.rebuild();
    }
  };

  /* =====================  Scènes 3D (Three.js)  ======================== */
  // Ramène une position dans [min, max[ : les objets bouclent pendant le défilement.
  const wrap = (v, min, max) => ((((v - min) % (max - min)) + (max - min)) % (max - min)) + min;
  // Demi-largeur visible à une distance donnée de la caméra : place les objets sur les bords, quelle que soit la forme de l'écran.
  const halfWidth = (camera, dist) => Math.tan((camera.fov * Math.PI) / 360) * dist * camera.aspect;

  // Socle commun : rendu plein écran derrière l'interface, pause quand l'appli est cachée,
  // la caméra suit le défilement et l'inclinaison du téléphone.
  function stage(options) {
    const THREE = window.THREE;
    const canvas = document.getElementById("fx3d");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio || 1.5));
    renderer.setSize(innerWidth, innerHeight, false);
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0, last = performance.now(), energy = 0;

    const onResize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
    const onPointer = (e) => { tilt.tx = (e.clientX / innerWidth - 0.5) * 2; tilt.ty = (e.clientY / innerHeight - 0.5) * 2; };
    const onTilt = (e) => { if (e.gamma == null) return; tilt.tx = Math.max(-1, Math.min(1, e.gamma / 30)); tilt.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 30)); };
    const onVisible = () => { if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(loop); } };
    addEventListener("resize", onResize);
    addEventListener("pointermove", onPointer, { passive: true });
    addEventListener("deviceorientation", onTilt, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      tilt.x += (tilt.tx - tilt.x) * 0.05; tilt.y += (tilt.ty - tilt.y) * 0.05;
      energy *= Math.pow(0.25, dt);
      options.frame(now / 1000, dt, { tilt, scroll: scrollY / innerHeight, energy });
      renderer.render(options.scene, camera);
      raf = requestAnimationFrame(loop);
    }
    canvas.hidden = false;
    document.documentElement.classList.add("fx-3d");
    raf = requestAnimationFrame(loop);

    return {
      THREE, renderer, camera,
      kick(amount = 1) { energy = Math.min(3, energy + amount); },
      dispose() {
        cancelAnimationFrame(raf);
        removeEventListener("resize", onResize); removeEventListener("pointermove", onPointer);
        removeEventListener("deviceorientation", onTilt); document.removeEventListener("visibilitychange", onVisible);
        options.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
        renderer.dispose();
        canvas.hidden = true;
        document.documentElement.classList.remove("fx-3d");
      }
    };
  }

  /* ---------- Argile : boules de pâte à modeler sur une table ---------- */
  function clayScene() {
    const THREE = window.THREE;
    const sceneMain = new THREE.Scene();
    sceneMain.background = new THREE.Color(0xefe7ff);

    // Lumière douce de studio et ombres floues.
    sceneMain.add(new THREE.HemisphereLight(0xffffff, 0xb8a6ee, 0.55));
    const sun = new THREE.DirectionalLight(0xfff4ea, 0.85);
    sun.position.set(-4, 6, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 14;
    sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
    sceneMain.add(sun, sun.target);

    // La table n'affiche que les ombres : le fond garde exactement la couleur de la page.
    const table = new THREE.Mesh(new THREE.PlaneGeometry(40, 80), new THREE.ShadowMaterial({ color: 0x5b3fa8, opacity: 0.22 }));
    table.position.set(0, -12, 0); table.receiveShadow = true;
    sceneMain.add(table);

    // La pâte : surface mate, et une ondulation lente calculée par le GPU (bruit 3D).
    const time = { value: 0 };
    function clay(color) {
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.t = time;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float t;\n" + NOISE)
          .replace("#include <begin_vertex>", "vec3 transformed = position + normal * snoise(position * 1.3 + vec3(t * 0.35)) * 0.12;");
      };
      return m;
    }
    const COLORS = [0xff9e6e, 0xa48cff, 0x5fd6a8, 0xff9fc4, 0xffd25e, 0x6fbfff];
    const sphere = new THREE.SphereGeometry(1, 64, 64), donut = new THREE.TorusGeometry(0.7, 0.32, 40, 80);
    const blobs = [];
    for (let i = 0; i < 11; i++) {
      const geo = i % 4 === 3 ? donut : sphere;
      const mesh = new THREE.Mesh(geo, clay(COLORS[i % COLORS.length]));
      mesh.castShadow = true;
      const r = geo === sphere ? 0.45 + Math.random() * 0.7 : 1;
      mesh.scale.setScalar(r);
      mesh.userData = {
        side: (i % 2 ? 1 : -1) * (0.75 + Math.random() * 0.35), y: 2 - i * 2.2, z: 0.9 + Math.random() * 0.6,
        r, phase: Math.random() * 6.28, spin: (Math.random() - 0.5) * 0.4
      };
      if (geo === donut) mesh.rotation.x = 0.4;
      sceneMain.add(mesh);
      blobs.push(mesh);
    }

    const s = stage({
      scene: sceneMain, maxPixelRatio: 1.25,
      frame(t, dt, { tilt, scroll, energy }) {
        time.value = t;
        for (const b of blobs) {
          const u = b.userData, squish = Math.sin(t * 1.6 + u.phase) * 0.05 + energy * 0.08 * Math.sin(t * 18 + u.phase);
          b.position.set(u.side * halfWidth(s.camera, 9 - u.z), wrap(u.y + scroll * 3.4, -14, 10), u.z + Math.sin(t * 0.9 + u.phase) * 0.18);
          b.scale.set(u.r * (1 + squish), u.r * (1 - squish), u.r * (1 + squish * 0.5));
          b.rotation.z += u.spin * dt;
        }
        s.camera.position.set(tilt.x * 0.5, -tilt.y * 0.4, 9);
        s.camera.lookAt(0, 0, 0);
      }
    });
    s.renderer.shadowMap.enabled = true;
    s.renderer.shadowMap.type = THREE.VSMShadowMap;
    return { skin: "argile", kick: s.kick, dispose: s.dispose };
  }

  // Bruit 3D (simplex, Ashima Arts / Stefan Gustavson, licence MIT).
  const NOISE = [
    "vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;} vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}",
    "vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);} vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}",
    "float snoise(vec3 v){ const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);",
    " vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx); vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g;",
    " vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy); vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;",
    " i=mod289(i); vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));",
    " float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx; vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);",
    " vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y); vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);",
    " vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));",
    " vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;",
    " vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);",
    " vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3))); p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;",
    " vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;",
    " return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3))); }"
  ].join("\n");

  window.CoursesFX = { setSkin, setGlass, leave, celebrate, enter };
})();
