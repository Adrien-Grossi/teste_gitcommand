/* =========================================================================
   Mes courses · effets visuels (facultatifs)
   L'appli appelle window.CoursesFX ; si une bibliothèque ne charge pas (hors ligne,
   mouvements réduits…), chaque effet s'efface sans rien casser.

   Bibliothèques, intégrées dans vendor/ et chargées seulement quand le style en a besoin :
     GSAP            animations de l'interface (surligneur, écrasement, apparitions)
     canvas-confetti confettis quand un rayon ou la liste est terminé
     Three.js        scènes 3D en fond : Verre (aurore + objets en verre), Argile (pâte à modeler)

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
  let scene = null;          // scène 3D active (Verre ou Argile)

  /* ---------- Style ---------------------------------------------------- */
  function setSkin(next) {
    skin = next;
    if (reduced) return;
    load("gsap").catch(() => {});
    load("confetti").catch(() => {});
    if (scene && scene.skin !== next) { scene.dispose(); scene = null; }
    if ((next === "verre" || next === "argile") && !scene) {
      load("three").then(() => {
        if (skin !== next || scene) return;
        try { scene = next === "verre" ? glassScene() : clayScene(); } catch (e) { scene = null; }
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

  /* ---------- Verre : aurore animée + objets en verre ------------------ */
  function glassScene() {
    const THREE = window.THREE;
    const sceneMain = new THREE.Scene();

    // Aurore : un fond plein écran calculé par le GPU (bruit fractal qui ondule lentement).
    const aurora = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: { t: { value: 0 }, shift: { value: 0 } },
      depthWrite: false, depthTest: false,
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader: [
        "varying vec2 vUv; uniform float t; uniform float shift;",
        "float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }",
        "float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);",
        "  return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }",
        "float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a*n(p); p *= 2.0; a *= 0.5; } return v; }",
        "void main(){",
        "  vec2 p = vUv * vec2(1.6, 3.0) + vec2(0.0, shift);",
        "  float q = fbm(p + t*0.05);",
        "  float r = fbm(p + q*1.8 + vec2(t*0.04, -t*0.03));",
        "  vec3 deep = vec3(0.07, 0.04, 0.2), violet = vec3(0.42, 0.22, 0.95), pink = vec3(1.0, 0.36, 0.64), teal = vec3(0.18, 0.88, 0.78);",
        "  vec3 c = mix(deep, violet, smoothstep(0.25, 0.75, r));",
        "  c = mix(c, pink, smoothstep(0.45, 0.8, q) * 0.85);",
        "  c = mix(c, teal, smoothstep(0.42, 0.8, r*q*1.9) * 0.85);",
        "  c *= 0.85 + 0.25*vUv.y;",
        "  gl_FragColor = vec4(c, 1.0);",
        "}"
      ].join("\n")
    }));
    aurora.frustumCulled = false; aurora.renderOrder = -1;
    sceneMain.add(aurora);

    // Reflets : une carte d'environnement aux couleurs de l'aurore.
    const env = document.createElement("canvas"); env.width = 256; env.height = 128;
    const g = env.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 256, 128);
    grad.addColorStop(0, "#ff5fa2"); grad.addColorStop(0.35, "#6b4dff"); grad.addColorStop(0.7, "#2fe0c8"); grad.addColorStop(1, "#ffffff");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 128);
    const envTex = new THREE.CanvasTexture(env); envTex.mapping = THREE.EquirectangularReflectionMapping;

    // Le verre : un corps presque transparent qui reflète l'aurore + un liseré irisé sur les bords.
    const body = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, metalness: 0, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04,
      transparent: true, opacity: 0.22, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false
    });
    const rimUniforms = { t: { value: 0 } };
    const rim = new THREE.ShaderMaterial({
      uniforms: rimUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "varying vec3 vN; varying vec3 vV; uniform float t; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.4); vec3 c = 0.55 + 0.45*cos(6.2831*(f*0.7 + t*0.05 + vec3(0.0, 0.33, 0.67))); gl_FragColor = vec4(c*f*1.5 + f*0.35, f); }"
    });
    const shapes = [
      new THREE.TorusGeometry(0.9, 0.34, 48, 96), new THREE.IcosahedronGeometry(0.95, 0), new THREE.SphereGeometry(0.75, 48, 48),
      new THREE.TorusKnotGeometry(0.6, 0.2, 140, 20), new THREE.OctahedronGeometry(0.9, 0), new THREE.TorusGeometry(0.55, 0.22, 32, 64),
      new THREE.DodecahedronGeometry(0.8, 0), new THREE.SphereGeometry(0.45, 32, 32)
    ];
    const lights = new THREE.Group();
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 4, 5); lights.add(key);
    lights.add(new THREE.AmbientLight(0xb9a6ff, 0.6));
    sceneMain.add(lights);

    const objects = shapes.map((geo, i) => {
      const group = new THREE.Group();
      group.add(new THREE.Mesh(geo, body), new THREE.Mesh(geo, rim));
      const side = i % 2 ? 1 : -1;
      group.userData = {
        side: side * (0.7 + Math.random() * 0.4), y: 1.5 - i * 2.4, z: -1 - Math.random() * 2.5,
        spin: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5),
        phase: Math.random() * 6.28
      };
      group.scale.setScalar(0.8 + Math.random() * 0.5);
      sceneMain.add(group);
      return group;
    });

    const s = stage({
      scene: sceneMain, maxPixelRatio: 1.5,
      frame(t, dt, { tilt, scroll, energy }) {
        aurora.material.uniforms.t.value = t;
        aurora.material.uniforms.shift.value = scroll * 0.35;
        rimUniforms.t.value = t;
        for (const o of objects) {
          const u = o.userData;
          const x = u.side * halfWidth(s.camera, 7 - u.z);
          o.position.set(x + Math.sin(t * 0.4 + u.phase) * 0.25, wrap(u.y + scroll * 4, -12, 7.2) + Math.sin(t * 0.6 + u.phase) * 0.2, u.z);
          o.rotation.x += u.spin.x * dt * (1 + energy * 4);
          o.rotation.y += u.spin.y * dt * (1 + energy * 4);
          o.rotation.z += u.spin.z * dt * (1 + energy * 4);
        }
        s.camera.position.set(tilt.x * 0.6, -tilt.y * 0.4, 7);
        s.camera.lookAt(0, 0, -2);
      }
    });
    s.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Les reflets du verre : l'aurore convertie en carte d'environnement.
    const pmrem = new THREE.PMREMGenerator(s.renderer);
    const envMap = pmrem.fromEquirectangular(envTex).texture;
    pmrem.dispose();
    body.envMap = envMap; body.needsUpdate = true;
    return { skin: "verre", kick: s.kick, dispose() { s.dispose(); envMap.dispose(); envTex.dispose(); } };
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
