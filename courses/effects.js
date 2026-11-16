/* =========================================================================
   Mes courses · effets visuels (facultatifs)
   L'appli appelle window.CoursesFX ; si une bibliothèque ne charge pas (hors ligne,
   mouvements réduits…), chaque effet s'efface sans rien casser.

   Bibliothèques, intégrées dans vendor/ et chargées seulement quand le style en a besoin :
     GSAP            animations de l'interface (surligneur, écrasement, apparitions)
     canvas-confetti confettis quand un rayon ou la liste est terminé
     Three.js        scène 3D en fond du style Argile (pâte à modeler)
   Sans bibliothèque : la réfraction du style Verre (filtres SVG calculés ici).

   API : setSkin(skin) · leave(li, action) → Promise · celebrate(kind, rect) · enter(view)
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

  /* ---------- Style ---------------------------------------------------- */
  function setSkin(next) {
    skin = next;
    if (reduced) return;
    load("gsap").catch(() => {});
    load("confetti").catch(() => {});
    if (next === "verre") liquid.start(); else liquid.stop();
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
  const GLASS = ".rows li, .card, .pill, .iconbtn, .skin, .pad button, .datebox, .mic, .btn.ghost, .bigcta";
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
  const LIQUID = ".rows li, .card, .pill, .iconbtn, .skin, .pad button, .datebox, .mic, .btn.ghost, .bigcta, header, .tabs, .toast";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const liquid = {
    supported: (() => { try { return CSS.supports("backdrop-filter", "url(#x)") && /Chrome\//.test(navigator.userAgent); } catch (e) { return false; } })(),
    filters: new Map(), defs: null, observer: null, frame: 0, on: false,

    // Carte de déformation : rouge = décalage horizontal, vert = décalage vertical (128 = aucun).
    // Deux effets s'additionnent, comme dans une loupe en verre épais :
    //  - la tranche (bezel) : près du bord, l'image est fortement tirée vers l'intérieur ;
    //  - le grossissement (zoom > 1) : tout l'intérieur montre une zone plus petite, donc agrandie.
    // range = décalage maximal en pixels, qui devient l'échelle du filtre.
    map(w, h, r, bezel, zoom, range) {
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"), img = g.createImageData(w, h), px = img.data;
      const shrink = 1 - 1 / zoom;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ox = x + 0.5 - w / 2, oy = y + 0.5 - h / 2;
          const qx = Math.abs(ox) - (w / 2 - r), qy = Math.abs(oy) - (h / 2 - r);
          const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
          const depth = -(outside + Math.min(Math.max(qx, qy), 0) - r);   // distance au bord, vers l'intérieur
          let nx = 0, ny = 0;
          if (qx > 0 && qy > 0) { nx = qx / outside; ny = qy / outside; } else if (qx > qy) nx = 1; else ny = 1;
          nx *= Math.sign(ox) || 1; ny *= Math.sign(oy) || 1;
          const edge = depth < bezel ? Math.pow(1 - Math.max(depth, 0) / bezel, 2) * bezel : 0;
          const dx = -ox * shrink - nx * edge, dy = -oy * shrink - ny * edge;
          const i = (y * w + x) * 4;
          px[i] = 128 + Math.max(-1, Math.min(1, dx / range)) * 127;
          px[i + 1] = 128 + Math.max(-1, Math.min(1, dy / range)) * 127;
          px[i + 2] = 128; px[i + 3] = 255;
        }
      }
      g.putImageData(img, 0, 0);
      return c.toDataURL();
    },
    // Un filtre par taille : trois déformations (rouge, vert, bleu) de forces différentes,
    // recombinées ; l'écart entre elles fait les franges irisées.
    filter(w, h, r, lens) {
      const id = "lg-" + w + "-" + h + "-" + r + (lens ? "-l" : "");
      if (this.filters.has(id)) return id;
      if (!this.defs) {
        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
        this.defs = document.createElementNS(SVG_NS, "defs");
        svg.appendChild(this.defs);
        document.body.appendChild(svg);
      }
      const bezel = Math.max(8, Math.min(lens ? 26 : 16, Math.min(w, h) * 0.38));
      const zoom = lens ? 1.12 : 1;
      const range = bezel + (Math.max(w, h) / 2) * (1 - 1 / zoom);
      const scale = range * 2;
      const channel = (n, s) => '<feDisplacementMap in="SourceGraphic" in2="map" scale="' + s.toFixed(1) + '" xChannelSelector="R" yChannelSelector="G" result="d' + n + '"/>' +
        '<feColorMatrix in="d' + n + '" type="matrix" values="' + ["1 0 0 0 0 0 0 0 0 0 0 0 0 0 0", "0 0 0 0 0 0 1 0 0 0 0 0 0 0 0", "0 0 0 0 0 0 0 0 0 0 0 0 1 0 0"][n] + ' 0 0 0 1 0" result="c' + n + '"/>';
      const f = document.createElementNS(SVG_NS, "filter");
      f.setAttribute("id", id);
      for (const [k, v] of Object.entries({ x: 0, y: 0, width: w, height: h, filterUnits: "userSpaceOnUse", "color-interpolation-filters": "sRGB" })) f.setAttribute(k, v);
      f.innerHTML = '<feImage href="' + this.map(w, h, r, bezel, zoom, range) + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="map"/>' +
        channel(0, scale) + channel(1, scale * 0.86) + channel(2, scale * 0.72) +
        '<feBlend in="c0" in2="c1" mode="screen" result="rg"/><feBlend in="rg" in2="c2" mode="screen"/>';
      this.defs.appendChild(f);
      this.filters.set(id, f);
      return id;
    },
    apply() {
      this.frame = 0;
      if (!this.on) return;
      document.querySelectorAll(LIQUID).forEach((el) => {
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
        el.style.backdropFilter = el.style.webkitBackdropFilter = "url(#" + id + ")" + (bar ? " blur(5px)" : "") + " saturate(1.35)";
      });
    },
    schedule() { if (!this.frame) this.frame = requestAnimationFrame(() => this.apply()); },
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

  window.CoursesFX = { setSkin, leave, celebrate, enter };
})();
