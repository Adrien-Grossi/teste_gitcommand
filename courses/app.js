/* =========================================================================
   Mes courses · logique de l'appli
   Trois parcours :
     Courses   ce qu'il reste à acheter (rien de coché, ou en stock mais périmé)
     Ranger    acheté, pas encore daté → on dicte la date de chaque article
     Chez moi  le stock, le plus urgent en haut
   Un article coché au magasin passe en stock ; « Fini » ou « Jeté » le remet dans les courses.

   Sections : 1 catalogue · 2 données · 3 outils · 4 dates · 5 affichage · 6 actions
              7 message « Annuler » · 8 ranger un article · 9 voix · 10 rappels
              11 transfert · 12 styles · 13 démarrage
   Les effets visuels vivent dans effects.js (window.CoursesFX) ; l'appli marche sans eux.
   ========================================================================= */
(function () {
  "use strict";

  /* 1. Catalogue : rayons dans l'ordre d'un supermarché, frais et surgelés à la fin ---------- */
  const AISLES = [
    { id: "fl", name: "Fruits & légumes", items: [
      ["Fruits", "", "bananes, pastèque…"], ["Concombres", "×2"], ["Carottes", "1 kg"], ["Poivrons", "×2"],
      ["Salades feuille de chêne", "×3"], ["Brocolis", "×2"], ["Patates", "1 kg"], ["Oignons"], ["Échalotes"], ["Ail"]] },
    { id: "pain", name: "Pain & petit-déjeuner", items: [
      ["Pain de mie"], ["Pains à burger"], ["Tortillas"], ["Céréales"], ["Benco / chocolat en poudre"], ["Café en grains"]] },
    { id: "sale", name: "Épicerie salée", items: [
      ["Penne", "1 kg"], ["Spaghetti", "1 kg"], ["Riz", "1 kg"], ["Nouilles à ramen"], ["Sauce bolognaise en pot", "×2"],
      ["Petits pois en conserve"], ["Maïs", "×4"], ["Olives en conserve", "×2"], ["Huile d'olive", "×2"],
      ["Vinaigrette blanche"], ["Sauce soja sucrée"], ["Ketchup"], ["Mayonnaise"], ["Chips aux oignons"]] },
    { id: "epices", name: "Épices & pâtisserie", items: [
      ["Paprika"], ["Noix de muscade"], ["Ail en poudre"], ["Graines de sésame"], ["Farine T45", "2 kg"],
      ["Levure de boulanger"], ["Sucre de canne"]] },
    { id: "sucre", name: "Épicerie sucrée", items: [
      ["BN / Pim's"], ["Compote pomme / pêche"], ["Bonbons sommeil"], ["Sirop de cassis"], ["Sirop de citron"]] },
    { id: "boissons", name: "Boissons", items: [
      ["Pack de Vittel", "6 L"], ["Pack de Cristalline"], ["Pack de Coca Zero"], ["Pack de 7Up Light"],
      ["Jus d'orange", "×1"], ["Jus de pêche"], ["Pack de lait"], ["Vin blanc"], ["Vin rouge"]] },
    { id: "jelly", name: "Animaux · Jelly", items: [
      ["Croquettes"], ["Bâtons pour les dents"], ["Boîtes de pâtée", "×1"], ["Haricots verts", "×6"]] },
    { id: "maison", name: "Entretien & maison", items: [
      ["Liquide vaisselle"], ["Pastilles lave-vaisselle"], ["Sel lave-vaisselle"], ["Pods lessive"], ["Adoucissant"],
      ["Sacs poubelle", "100 L"], ["Essuie-tout"], ["Papier toilette", "", "le plus doux"], ["Papier cuisson"],
      ["Papier alu"], ["Film alimentaire"], ["Tableau blanc en rouleau"]] },
    { id: "hygiene", name: "Hygiène", items: [
      ["Gel douche"], ["Dentifrice"], ["Lingettes aloe vera"], ["Crème pour mes p'tites fesses !"]] },
    { id: "viande", name: "Boucherie & charcuterie", items: [
      ["Poulet en morceaux", "1,5 kg"], ["Émincés de poulet"], ["Poulet fermier"], ["Viande rouge"], ["Lardons"], ["Jambon"]] },
    { id: "frais", name: "Frais & fromages", items: [
      ["Yaourts 0 %", "×14 min"], ["Yaourts", "×14 min"], ["Œufs", "2 boîtes de 12"], ["Beurre à tartiner"],
      ["Crème épaisse"], ["Vache qui rit"], ["Fromage à burger"], ["Parmesan râpé", "×4"], ["Mozza", "×4"],
      ["Burrata", "×2"], ["Féta", "200 g"], ["Gnocchis à poêler"]] },
    { id: "surgeles", name: "Surgelés", hint: "En dernier, pour que ça reste froid.", items: [
      ["Steaks surgelés"], ["Nuggets de poulet"], ["Glace"]] },
    { id: "pharma", name: "Pharmacie (hors magasin)", items: [["Médoc TDAH"]] }
  ];

  /* 2. Données ------------------------------------------------------------------------------- *
   * marks[id] : "got" = en stock (acheté) · "skip" = pas besoin pour cette course
   * dates[id] : "AAAA-MM-JJ" ou "none" (ne périme pas)
   * custom    : articles ajoutés {id, name, aisle}                                              */
  const KEY = "courses-v1";
  const SKINS = { carnet: "#0e0e10", verre: "#0a0f2c", argile: "#efe7ff" };
  // Atelier du verre : réglages d'origine du style Verre (fond fluide et verre des cartes).
  const GLASS_DEFAULTS = {
    colors: ["#293dd9", "#8040f2", "#ff5c8c", "#ff8f4d", "#1ac7cc"],
    complexity: 3, size: 1, fusion: 0.24, lace: 0.4, speed: 1,
    zoom: 1.12, bezel: 1, diffraction: 0.5, frost: 0, light: 1, round: 1,
    // Sources lumineuses posées dans le fond (1 à 3) : x, y sur l'écran (0 à 1), taille et
    // profondeur derrière le verre (0 à 1), intensité (0 à 2), couleur.
    lights: [
      { x: 0.12, y: 0.12, color: "#ffcf9a", power: 0.9, size: 0.45, depth: 0.5 },
      { x: 0.85, y: 0.64, color: "#9fd8ff", power: 0.6, size: 0.35, depth: 0.6 }
    ]
  };
  const copyGlass = (g) => ({ ...g, colors: g.colors.slice(), lights: g.lights.map((l) => ({ ...l })) });
  const state = { marks: {}, dates: {}, custom: [], tab: "courses", skin: "carnet", glass: copyGlass(GLASS_DEFAULTS), v: 3 };

  function load() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!saved) return;
    Object.assign(state, normalize(saved));
  }
  // Rend des données (sauvegardées ou importées) conformes au format actuel.
  function normalize(d) {
    const out = {
      marks: isObj(d.marks) ? d.marks : {}, dates: isObj(d.dates) ? d.dates : {},
      custom: Array.isArray(d.custom) ? d.custom : [],
      tab: /^(courses|ranger|frigo)$/.test(d.tab) ? d.tab : "courses",
      skin: SKINS[d.skin] ? d.skin : "carnet", glass: normalizeGlass(d.glass), v: 3
    };
    // Avant les onglets (sans « v »), « Pas besoin » voulait dire « j'en ai déjà » : c'est du stock.
    if (!d.v) for (const k in out.marks) if (out.marks[k] === "skip") out.marks[k] = "got";
    return out;
  }
  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }
  // Réglages du verre : chaque valeur est bornée ; ce qui manque reprend la valeur d'origine.
  function normalizeGlass(g) {
    const out = copyGlass(GLASS_DEFAULTS);
    if (!isObj(g)) return out;
    const colors = Array.isArray(g.colors) ? g.colors.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 8) : [];
    if (colors.length >= 2) out.colors = colors;
    for (const c of GLASS_SLIDERS) if (typeof g[c.key] === "number") out[c.key] = Math.min(c.max, Math.max(c.min, g[c.key]));
    if (Array.isArray(g.lights)) {
      const clamp = (v, d) => (typeof v === "number" ? Math.min(LIGHT_LIMITS[d][1], Math.max(LIGHT_LIMITS[d][0], v)) : null);
      const lights = g.lights.slice(0, 3).map((l) => isObj(l) && /^#[0-9a-f]{6}$/i.test(l.color) && {
        x: clamp(l.x, "x") ?? 0.5, y: clamp(l.y, "y") ?? 0.3, color: l.color,
        power: clamp(l.power, "power") ?? 0.8, size: clamp(l.size, "size") ?? 0.4, depth: clamp(l.depth, "depth") ?? 0.5
      }).filter(Boolean);
      out.lights = lights;
    }
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
    syncReminders();
  }

  /* 3. Outils -------------------------------------------------------------------------------- */
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const vibrate = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
  // Effets visuels optionnels (effects.js) : chaque appel est sans risque s'ils sont absents.
  function fx(name, ...args) {
    try { const f = window.CoursesFX && window.CoursesFX[name]; return f ? f(...args) : undefined; } catch (e) { return undefined; }
  }

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>'
  };

  // Catalogue complet : articles de base + ajouts (un ajout du même nom qu'un article de base est ignoré).
  const BASE_NAMES = new Set(AISLES.flatMap((a) => a.items.map((it) => slug(it[0]))));
  function catalogue() {
    return AISLES.map((a) => {
      const items = a.items.map(([name, qty = "", note = ""]) => ({ id: a.id + ":" + slug(name), name, qty, note, aisle: a.name }));
      for (const c of state.custom) {
        if (c.aisle === a.id && !BASE_NAMES.has(slug(c.name))) items.push({ id: c.id, name: c.name, qty: "", note: "ajouté", aisle: a.name, custom: true });
      }
      return { id: a.id, name: a.name, hint: a.hint, items };
    });
  }
  const allItems = () => catalogue().flatMap((a) => a.items);
  const itemById = (id) => allItems().find((it) => it.id === id);

  /* 4. Dates --------------------------------------------------------------------------------- */
  const MONTHS = ["janvier", "fevrier", "mars", "avril", "mai", "juin", "juillet", "aout", "septembre", "octobre", "novembre", "decembre"];
  const pad2 = (n) => String(n).padStart(2, "0");
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };
  const toISO = (dt) => dt.getFullYear() + "-" + pad2(dt.getMonth() + 1) + "-" + pad2(dt.getDate());
  const fromISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const daysLeft = (s) => Math.round((fromISO(s) - today()) / 864e5);
  const shortDate = (s) => { const [y, m, d] = s.split("-"); return d + "/" + m + (+y !== new Date().getFullYear() ? "/" + y.slice(2) : ""); };
  const relDays = (n) => n < 0 ? "périmé depuis " + -n + " j" : n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " j";
  const longDate = (s) => fromISO(s).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const inDays = (n) => { const t = today(); t.setDate(t.getDate() + n); return toISO(t); };

  // Jour + mois (+ année facultative). Sans année : la prochaine occurrence, sauf date tout juste passée.
  function makeDate(d, m, y) {
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
    if (y == null) {
      y = today().getFullYear();
      if (new Date(y, m - 1, d) < new Date(today().getTime() - 60 * 864e5)) y++;
    } else if (y < 100) y += 2000;
    const dt = new Date(y, m - 1, d);
    return dt.getMonth() === m - 1 ? toISO(dt) : null;
  }
  // Chiffres tapés : JJMM ou JJMMAA.
  function digitsToDate(b) {
    if (b.length === 4) return makeDate(+b.slice(0, 2), +b.slice(2, 4));
    if (b.length === 6) return makeDate(+b.slice(0, 2), +b.slice(2, 4), +b.slice(4, 6));
    return null;
  }
  const dateToDigits = (s) => { const [y, m, d] = s.split("-"); return d + m + y.slice(2); };
  // Phrase dite : « 2606 », « 26 06 », « 26/06/27 », « 26 juin », « premier juillet 2027 »…
  function spokenToDate(text) {
    let t = " " + norm(text).replace(/\b(premier|1er)\b/g, " 1 ") + " ";
    const mi = MONTHS.findIndex((name) => t.includes(name));
    if (mi >= 0) {
      const [before, after] = t.split(MONTHS[mi]);
      const dn = before.match(/\d+/g), yn = after.match(/\d+/g);
      if (!dn) return null;
      let y = yn ? +yn[0] : null;
      if (y != null && !(y < 100 || (y >= 2000 && y < 2100))) y = null;
      return makeDate(+dn[dn.length - 1], mi + 1, y);
    }
    const runs = t.match(/\d+/g); if (!runs) return null;
    const all = runs.join("");
    if (all.length === 4 || all.length === 6) return digitsToDate(all);
    if (all.length === 8) return makeDate(+all.slice(0, 2), +all.slice(2, 4), +all.slice(4));
    if (runs.length >= 2) return makeDate(+runs[0], +runs[1], runs[2] ? +runs[2] : null);
    return null;
  }

  /* 5. Affichage ----------------------------------------------------------------------------- */
  const isExpired = (id) => isDate(state.dates[id]) && daysLeft(state.dates[id]) < 0;
  const needsBuying = (id) => !state.marks[id] || (state.marks[id] === "got" && isExpired(id));
  const toPutAway = (id) => state.marks[id] === "got" && !state.dates[id];
  const putAwayQueue = () => allItems().filter((it) => toPutAway(it.id)).map((it) => it.id);

  const TITLES = { courses: "À acheter", ranger: "À ranger", frigo: "Chez moi" };

  function itemLabel(it, extra = "") {
    return '<span class="label"><span class="name">' + esc(it.name) + "</span>" +
      (it.qty ? '<span class="qty">' + esc(it.qty) + "</span>" : "") +
      (it.note ? '<span class="note">' + esc(it.note) + "</span>" : "") + extra + "</span>";
  }
  function badge(id, n) { const el = $(id); el.textContent = n > 99 ? "99+" : n; el.hidden = !n; }

  function render() {
    const cat = catalogue();
    const shop = renderShop(cat), range = renderRange(cat), stock = renderStock(cat);
    for (const t of ["courses", "ranger", "frigo"]) $("v-" + t).hidden = t !== state.tab;
    document.querySelectorAll(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === state.tab ? "page" : "false"));
    badge("badgeCourses", shop.n); badge("badgeRanger", range.n); badge("badgeFrigo", stock.urgent);

    $("viewTitle").textContent = TITLES[state.tab];
    const n = { courses: shop.n, ranger: range.n, frigo: stock.n }[state.tab];
    $("count").innerHTML = n ? "<b>" + n + "</b>" : "";
    const sub = $("viewSub");
    if (state.tab === "courses") {
      sub.innerHTML = shop.here ? "Rayon en cours : <strong>" + esc(shop.here) + "</strong> · touche ce qui va dans le caddie" : "Liste terminée";
    } else if (state.tab === "ranger") {
      sub.textContent = range.n ? "En rangeant, dis la date de chaque article." : "Tout est rangé et daté.";
    } else {
      const parts = [];
      if (stock.expired) parts.push('<span class="t-bad">' + stock.expired + (stock.expired > 1 ? " périmés" : " périmé") + "</span>");
      if (stock.soon) parts.push('<span class="t-warn">' + stock.soon + " à manger vite</span>");
      sub.innerHTML = parts.join(" · ") || "Le plus urgent en haut.";
    }
    return { shop, range, stock };
  }

  // Courses : rayons qui ont encore quelque chose à acheter.
  function renderShop(cat) {
    let html = "", here = null, n = 0, skipped = 0;
    for (const a of cat) {
      skipped += a.items.filter((it) => state.marks[it.id] === "skip").length;
      const items = a.items.filter((it) => needsBuying(it.id));
      if (!items.length) continue;
      n += items.length;
      if (!here) here = a.name;
      html += '<section class="block' + (here === a.name ? " here" : "") + '" data-aisle="' + a.id + '">' +
        '<div class="block-h"><h2>' + esc(a.name) + '</h2><span class="n">' + items.length + "</span></div>" +
        (a.hint ? '<p class="hint">' + esc(a.hint) + "</p>" : "") + '<ul class="rows">' +
        items.map((it) => {
          const expired = isExpired(it.id) ? '<span class="tag-bad">Périmé le ' + shortDate(state.dates[it.id]) + " · à racheter</span>" : "";
          return '<li data-id="' + esc(it.id) + '"><button class="tap" type="button" data-act="got"><span class="box">' + ICON.check + "</span>" +
            itemLabel(it, expired) + "</button>" +
            (it.custom
              ? '<button class="side" type="button" data-act="del" aria-label="Supprimer ' + esc(it.name) + '">' + ICON.trash + "Suppr.</button>"
              : '<button class="side" type="button" data-act="skip">' + ICON.cross + "Pas besoin</button>") + "</li>";
        }).join("") + "</ul></section>";
    }
    $("shopList").innerHTML = html;
    $("shopDone").hidden = n > 0;
    $("skipBar").hidden = !skipped;
    $("skipText").textContent = skipped + (skipped > 1 ? " articles mis de côté pour cette fois" : " article mis de côté pour cette fois");
    return { n, here };
  }

  // Ranger : acheté, sans date.
  function renderRange(cat) {
    const items = cat.flatMap((a) => a.items).filter((it) => toPutAway(it.id));
    $("rangeList").innerHTML = items.map((it) =>
      '<li data-id="' + esc(it.id) + '"><button class="tap" type="button" data-act="date"><span class="dot" aria-hidden="true"></span>' +
      itemLabel({ name: it.name, qty: it.qty, note: it.aisle }) + "</button>" +
      '<button class="side" type="button" data-act="none">' + ICON.cross + "Pas de date</button></li>").join("");
    $("rangeList").hidden = !items.length;
    $("rangeBtn").hidden = !items.length;
    $("rangeBtnText").textContent = "Ranger avec la voix (" + items.length + ")";
    $("rangeDone").hidden = items.length > 0;
    return { n: items.length };
  }

  // Chez moi : le stock, groupé du plus urgent au moins urgent.
  const GROUPS = [
    { id: "expired", title: "Périmé · à jeter", cls: "bad" },
    { id: "soon", title: "À manger vite", cls: "warn" },
    { id: "week", title: "Cette semaine", cls: "" },
    { id: "later", title: "Plus tard", cls: "" },
    { id: "undated", title: "Pas encore daté", cls: "quiet" },
    { id: "never", title: "Ne périme pas", cls: "quiet", folded: true }
  ];
  function stockGroup(d) {
    if (d === "none") return "never";
    if (!isDate(d)) return "undated";
    const n = daysLeft(d);
    return n < 0 ? "expired" : n <= 2 ? "soon" : n <= 7 ? "week" : "later";
  }
  function renderStock(cat) {
    const groups = Object.fromEntries(GROUPS.map((g) => [g.id, []]));
    for (const it of cat.flatMap((a) => a.items)) {
      if (state.marks[it.id] !== "got") continue;
      const d = state.dates[it.id];
      groups[stockGroup(d)].push({ it, d, days: isDate(d) ? daysLeft(d) : Infinity });
    }
    let html = "";
    for (const g of GROUPS) {
      const rows = groups[g.id].sort((a, b) => a.days - b.days);
      if (!rows.length) continue;
      const head = '<div class="block-h"><h2>' + g.title + '</h2><span class="n">' + rows.length + "</span></div>";
      const list = '<ul class="rows">' + rows.map(({ it, d, days }) => {
        const when = isDate(d)
          ? '<span class="when"><b>' + (days < 0 ? "−" + -days + " j" : days === 0 ? "Auj." : days === 1 ? "Demain" : days + " j") + "</b>" + shortDate(d) + "</span>"
          : g.id === "undated" ? '<span class="when"><b>Dater</b></span>' : "";
        return '<li data-id="' + esc(it.id) + '"><button class="tap" type="button" data-act="edit">' + itemLabel({ name: it.name, qty: it.qty }) + when + "</button>" +
          '<button class="side" type="button" data-act="done">' + (g.id === "expired" ? ICON.trash + "Jeté" : ICON.check + "Fini") + "</button></li>";
      }).join("") + "</ul>";
      html += g.folded
        ? '<details class="block ' + g.cls + '"><summary>' + head + "</summary>" + list + "</details>"
        : '<section class="block ' + g.cls + '">' + head + list + "</section>";
    }
    $("stockList").innerHTML = html;
    const n = Object.values(groups).reduce((s, g) => s + g.length, 0);
    $("stockEmpty").hidden = n > 0;
    return { n, expired: groups.expired.length, soon: groups.soon.length, urgent: groups.expired.length + groups.soon.length };
  }

  /* 6. Actions ------------------------------------------------------------------------------- */
  function setTab(tab) {
    state.tab = tab; save(); render();
    try { window.scrollTo(0, 0); } catch (e) {}
    fx("enter", $("v-" + tab));
  }
  document.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]"); if (b) setTab(b.dataset.tab);
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-go]"); if (b) setTab(b.dataset.go);
  });

  // Courses : un appui = dans le caddie (passe à « Ranger ») ; « Pas besoin » = caché pour cette fois.
  $("shopList").addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const li = btn.closest("li"), id = li.dataset.id, act = btn.dataset.act, it = itemById(id);
    const before = { mark: state.marks[id], date: state.dates[id] };
    wakeScreen();
    if (act === "del") {
      const i = state.custom.findIndex((c) => c.id === id);
      const removed = state.custom.splice(i, 1)[0];
      delete state.marks[id]; delete state.dates[id];
      save(); render();
      toast("Supprimé : " + removed.name, () => { state.custom.splice(i, 0, removed); restore(id, before); });
      return;
    }
    if (act === "got") {
      state.marks[id] = "got"; delete state.dates[id];   // une ancienne date ne vaut pas pour le nouveau paquet
      toast("Pris : " + it.name + " · à ranger", () => restore(id, before));
      vibrate(15);
    } else {
      state.marks[id] = "skip"; if (isExpired(id)) delete state.dates[id];
      toast("Pas besoin cette fois : " + it.name, () => restore(id, before));
      vibrate(8);
    }
    save();
    const block = li.closest(".block"), rect = li.getBoundingClientRect();
    const lastOfAisle = block.querySelectorAll("li").length === 1;
    await (fx("leave", li, act) || cssLeave(li));
    const { shop } = render();
    if (act === "got" && !shop.n) fx("celebrate", "list");
    else if (act === "got" && lastOfAisle) fx("celebrate", "aisle", rect);
  });
  function cssLeave(li) { li.classList.add("leaving"); return new Promise((r) => setTimeout(r, 380)); }
  function restore(id, before) {
    if (before.mark) state.marks[id] = before.mark; else delete state.marks[id];
    if (before.date !== undefined) state.dates[id] = before.date; else delete state.dates[id];
  }

  $("unskipBtn").addEventListener("click", () => {
    const skipped = Object.keys(state.marks).filter((k) => state.marks[k] === "skip");
    skipped.forEach((k) => delete state.marks[k]);
    save(); render();
    toast("Articles réaffichés dans la liste", () => skipped.forEach((k) => (state.marks[k] = "skip")));
  });

  $("addAisle").innerHTML = AISLES.map((a) => '<option value="' + a.id + '">' + esc(a.name) + "</option>").join("");
  $("addForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("addName").value.trim(); if (!name) return;
    const item = { id: "c:" + Date.now().toString(36), name, aisle: $("addAisle").value };
    state.custom.push(item); save(); render();
    $("addName").value = "";
    toast("Ajouté aux courses : " + name, () => { state.custom = state.custom.filter((c) => c.id !== item.id); });
  });

  // Ranger : la ligne lance la série à partir de cet article ; « Pas de date » le range sans date.
  $("rangeBtn").addEventListener("click", () => openLabeler(putAwayQueue()));
  $("rangeList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const id = btn.closest("li").dataset.id;
    if (btn.dataset.act === "none") {
      state.dates[id] = "none"; save(); render();
      toast("Sans date : " + itemById(id).name, () => delete state.dates[id]);
      return;
    }
    const q = putAwayQueue(), i = q.indexOf(id);
    openLabeler(q.slice(i).concat(q.slice(0, i)));
  });

  // Chez moi : la ligne corrige la date ; « Fini » / « Jeté » remet l'article dans les courses.
  $("stockList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const id = btn.closest("li").dataset.id;
    if (btn.dataset.act === "edit") { openLabeler([id]); return; }
    const before = { mark: state.marks[id], date: state.dates[id] };
    delete state.marks[id]; delete state.dates[id];
    save(); render();
    toast(itemById(id).name + " · remis dans les courses", () => restore(id, before));
  });

  /* 7. Message « Annuler » ------------------------------------------------------------------- */
  let toastTimer = null, undoFn = null;
  function toast(text, undo) {
    undoFn = undo || null;
    $("toastText").textContent = text;
    $("undoBtn").hidden = !undo;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { $("toast").hidden = true; undoFn = null; }, 4000);
  }
  $("undoBtn").addEventListener("click", () => {
    if (undoFn) undoFn();
    undoFn = null; $("toast").hidden = true; save(); render();
  });

  /* 8. Ranger un article (plein écran) ------------------------------------------------------- */
  const sheet = $("sheet");
  const lb = { queue: [], pos: 0, digits: "", msg: "", pending: null, saved: 0 };

  function openLabeler(ids) {
    if (!ids.length) { toast("Tout est déjà daté.", null); return; }
    Object.assign(lb, { queue: ids, pos: 0, saved: 0 });
    voice.begin();                      // appelé pendant le clic : le micro peut s'ouvrir
    sheet.hidden = false; document.body.classList.add("sheet-open");
    showItem();
  }
  function closeLabeler() {
    voice.end();
    sheet.hidden = true; document.body.classList.remove("sheet-open");
    if (state.tab === "ranger" && lb.saved && !putAwayQueue().length) state.tab = "frigo";
    save(); render();
    if (lb.saved) toast(lb.saved + (lb.saved > 1 ? " dates enregistrées" : " date enregistrée"), null);
  }
  function showItem() {
    if (lb.pos >= lb.queue.length) { closeLabeler(); return; }
    const it = itemById(lb.queue[lb.pos]) || { name: "?", qty: "", aisle: "" }, d = state.dates[lb.queue[lb.pos]];
    $("lbProgress").textContent = lb.pos + 1 + " / " + lb.queue.length;
    $("lbAisle").textContent = it.aisle + (isDate(d) ? " · date actuelle : " + shortDate(d) : "");
    $("lbName").textContent = it.name + (it.qty ? " · " + it.qty : "");
    $("lbPrev").disabled = lb.pos === 0;
    Object.assign(lb, { digits: "", msg: "", pending: null });
    drawDate();
    voice.next();
  }
  function drawDate() {
    const b = lb.digits, slots = b.length > 4 ? 6 : 4;
    let h = "";
    for (let i = 0; i < slots; i++) {
      if (i === 2 || i === 4) h += '<span class="sep">/</span>';
      h += i < b.length ? b[i] : '<span class="ph">' + "JJMMAA"[i] + "</span>";
    }
    const iso = digitsToDate(b), pv = $("lbPreview"), ok = $("lbOk");
    $("lbDate").innerHTML = h;
    $("lbDate").classList.toggle("ok", !!iso);
    ok.disabled = !iso;
    ok.classList.toggle("ready", !!lb.pending);
    if (iso) { pv.className = "preview ok"; pv.textContent = longDate(iso) + " · " + relDays(daysLeft(iso)) + (lb.pending ? " · vérifie et touche Valider" : ""); }
    else if (lb.msg) { pv.className = "preview err"; pv.textContent = lb.msg; }
    else if (b.length === 4 || b.length === 6) { pv.className = "preview err"; pv.textContent = "Cette date n'existe pas. Corrige avec ⌫."; }
    else { pv.className = "preview"; pv.textContent = "Dis la date, ou tape-la : 2606 pour le 26 juin"; }
  }
  // Une date entendue attend la vérification : un appui sur Valider l'enregistre.
  function proposeDate(iso) { Object.assign(lb, { digits: dateToDigits(iso), msg: "", pending: iso }); drawDate(); }
  function saveDate(value) {
    state.dates[lb.queue[lb.pos]] = value;
    if (value !== "none") { lb.saved++; fx("celebrate", "saved", $("lbDate").getBoundingClientRect()); }
    save(); vibrate(15);
    lb.pos++; showItem();
  }
  function press(k) {
    voice.pause();
    lb.pending = null; lb.msg = "";
    if (k === "del") lb.digits = lb.digits.slice(0, -1);
    else if (k === "clr") lb.digits = "";
    else if (lb.digits.length < 6) lb.digits += k;
    drawDate();
  }
  const skipItem = () => { lb.pos++; showItem(); };
  const prevItem = () => { if (lb.pos > 0) { lb.pos--; showItem(); } };

  $("lbPad").addEventListener("click", (e) => { const k = e.target.closest("[data-k]"); if (k) press(k.dataset.k); });
  $("lbOk").addEventListener("click", () => { const iso = digitsToDate(lb.digits); if (iso) saveDate(iso); });
  $("lbSkip").addEventListener("click", skipItem);
  $("lbPrev").addEventListener("click", prevItem);
  $("lbClose").addEventListener("click", closeLabeler);
  $("lbDate").addEventListener("click", () => { if (lb.pending) { lb.pending = null; lb.digits = ""; drawDate(); } });
  $("lbChips").addEventListener("click", (e) => {
    const c = e.target.closest("[data-q]"); if (!c) return;
    saveDate(c.dataset.q === "none" ? "none" : inDays(+c.dataset.q));
  });
  $("lbMic").addEventListener("click", () => voice.toggle());
  document.addEventListener("keydown", (e) => {
    if (sheet.hidden) return;
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("del");
    else if (e.key === "Enter") { e.preventDefault(); $("lbOk").click(); }
    else if (e.key === "Escape") closeLabeler();
  });

  /* 9. Voix ---------------------------------------------------------------------------------- *
   * Deux moteurs :
   *  - « claude » : la dictée de claude.ai (page ouverte dans Chrome) ; une écoute continue.
   *  - « browser » : la reconnaissance vocale de Chrome (appli installée) ; une phrase par écoute.
   * Une date entendue s'affiche et attend Valider ; le micro repart à l'article suivant.         */
  function heard(phrases, final) {
    for (const p of phrases) if (voiceCommand(p)) return true;
    for (const p of phrases) { const iso = spokenToDate(p); if (iso) { proposeDate(iso); return true; } }
    if (final) { lb.digits = ""; lb.pending = null; lb.msg = "Pas compris « " + phrases[0].trim() + " ». Redis, par exemple « 26 juin »."; drawDate(); }
    return false;
  }
  function voiceCommand(said) {
    const t = norm(said);
    if (lb.pending && /\b(oui|ok|okay|valide|valider|c'est bon|d'accord)\b/.test(t)) { saveDate(lb.pending); return true; }
    if (lb.pending && /\b(non|corrige|attends?)\b/.test(t)) { lb.pending = null; lb.digits = ""; drawDate(); return true; }
    if (/(pas|sans|aucune) (de )?date|ne perime pas/.test(t)) { saveDate("none"); return true; }
    if (/\b(passe|passer|suivant)\b/.test(t)) { skipItem(); return true; }
    if (/\b(retour|precedent)\b/.test(t)) { prevItem(); return true; }
    if (/\b(stop|termine|arrete|c'est fini)\b/.test(t)) { closeLabeler(); return true; }
    return false;
  }
  const MIC_ERRORS = {
    "not-allowed": "Micro refusé : Chrome ⋮ → Paramètres des sites → Micro → autorise ce site.",
    NotAllowedError: "Micro refusé : Chrome ⋮ → Paramètres des sites → Micro → autorise ce site.",
    "service-not-allowed": "Dictée Google désactivée sur le téléphone : active l'appli Google.",
    "audio-capture": "Micro occupé par une autre appli. Ferme-la et réessaie.",
    NotFoundError: "Aucun micro trouvé sur cet appareil.",
    network: "La dictée a besoin d'internet. Vérifie ta connexion.",
    "language-not-supported": "Dictée en français indisponible sur ce téléphone.",
    unsupported: "Pas de dictée dans ce navigateur. Ouvre l'appli par son icône, ou dans Chrome."
  };

  const voice = {
    engine: null, on: false, wanted: false, rec: null, misses: 0, micOk: false, claude: null, buffer: "", bufferTimer: null,

    setButton(listening) {
      this.on = listening;
      $("lbMic").classList.toggle("on", listening);
      $("lbMicText").textContent = listening ? "J'écoute… dis la date" : this.wanted ? "Dire la date" : "Micro en pause · toucher pour reprendre";
    },
    fail(code) {
      this.wanted = false; this.setButton(false);
      lb.msg = (MIC_ERRORS[code] || "Le micro n'a pas marché. Touche le bouton micro.") + " (code : " + code + ")";
      drawDate();
    },
    // Ouverture de l'écran Ranger (pendant le clic).
    begin() {
      this.wanted = true; this.misses = 0;
      if (this.engine === "claude") this.startClaude();
    },
    // Nouvel article affiché.
    next() {
      this.misses = 0;
      if (this.engine === "browser" && this.wanted) this.listen();
      if (!this.engine && this.wanted) { this.wanted = false; lb.msg = MIC_ERRORS.unsupported; drawDate(); }
      this.setButton(this.on);
    },
    pause() { if (this.engine === "browser") this.stopBrowser(); },
    end() {
      this.wanted = false;
      if (this.engine === "browser") this.stopBrowser();
      if (this.engine === "claude" && this.claude.active()) this.claude.stop().catch(() => {});
    },
    toggle() {
      if (this.engine === "claude") { if (this.on) this.claude.stop().catch(() => {}); else this.startClaude(); return; }
      if (this.on) { this.wanted = false; this.stopBrowser(); return; }
      this.wanted = true; this.misses = 0; lb.msg = "";
      if (!this.engine) { this.fail("unsupported"); return; }
      this.listen();
    },

    // Moteur « browser » : la reconnaissance vocale de Chrome.
    stopBrowser() { const r = this.rec; this.rec = null; if (r) { try { r.abort(); } catch (e) {} } this.setButton(false); },
    listen() {
      this.stopBrowser();
      if (sheet.hidden) return;
      // La première fois, on demande l'accès au micro pour que Chrome affiche sa question.
      if (!this.micOk && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.setButton(true);
        navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => {
          s.getTracks().forEach((t) => t.stop());
          this.micOk = true;
          if (this.wanted && !sheet.hidden) this.listen(); else this.setButton(false);
        }, (err) => this.fail((err && err.name) || "inconnu"));
        return;
      }
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      let r; try { r = new SR(); } catch (e) { this.fail("unsupported"); return; }
      this.rec = r;
      let again = false;
      r.lang = "fr-FR"; r.interimResults = false; r.maxAlternatives = 5;
      r.onresult = (ev) => {
        if (this.rec !== r) return;
        this.misses = 0;
        again = !heard(Array.from(ev.results[0], (alt) => alt.transcript), true);
      };
      r.onerror = (ev) => {
        if (this.rec !== r || ev.error === "aborted") return;
        if (ev.error !== "no-speech") { this.fail(ev.error); return; }
        if (++this.misses < 3) again = true;
        else { this.wanted = false; lb.msg = "Micro en pause. Touche le bouton micro pour reprendre."; drawDate(); }
      };
      r.onend = () => {
        if (this.rec !== r) return;
        this.rec = null; this.setButton(false);
        if (again && this.wanted && !sheet.hidden) setTimeout(() => this.listen(), 250);
      };
      try { r.start(); this.setButton(true); } catch (e) { this.rec = null; this.setButton(false); }
    },

    // Moteur « claude » : écoute continue ; une date peut arriver en deux morceaux (« 26 » puis « juin »).
    startClaude() {
      this.claude.start({ language: "fr" }).catch((e) => {
        const c = e && e.code;
        if (c === "not_granted") lb.msg = "Micro refusé. Réactive-le dans le menu Autorisations de la page.";
        else if (c === "unavailable") lb.msg = "Dictée indisponible ici. Tape la date.";
        else if (c && c !== "stopped" && c !== "dismissed") lb.msg = "Le micro n'a pas démarré. Touche le bouton micro.";
        if (!sheet.hidden) drawDate();
      });
    },
    attachClaude(d) {
      this.claude = d; this.engine = "claude";
      d.onState((s) => this.setButton(s.state === "listening" || s.state === "starting"));
      d.onPartial((x) => {
        if (sheet.hidden || lb.pending || !x.text) return;
        const pv = $("lbPreview"); pv.className = "preview"; pv.textContent = "« " + (this.buffer + " " + x.text).trim() + " »";
      });
      d.onFinal((x) => {
        if (sheet.hidden || !x.text.trim()) return;
        this.buffer = (this.buffer + " " + x.text).trim();
        clearTimeout(this.bufferTimer);
        if (heard([this.buffer], false)) { this.buffer = ""; return; }
        this.bufferTimer = setTimeout(() => { if (this.buffer) { heard([this.buffer], true); this.buffer = ""; } }, 2200);
      });
    }
  };
  if (window.SpeechRecognition || window.webkitSpeechRecognition) voice.engine = "browser";
  // Dans la page Claude, la dictée de claude.ai remplace celle du navigateur.
  try {
    if (window.claude && window.claude.use) window.claude.use("dictation").then((d) => { if (d) voice.attachClaude(d); }).catch(() => {});
  } catch (e) {}

  /* 10. Rappels : notification 2 jours avant la date, puis quand elle est dépassée ----------- *
   * Le service worker (sw.js) lit le stock daté dans IndexedDB et affiche les notifications,
   * à l'ouverture de l'appli et environ une fois par jour en arrière-plan quand Android le permet. */
  let canNotify = false;   // vrai une fois le service worker installé (pas dans la page Claude ni un fichier)
  function idb(fn) {
    return new Promise((resolve, reject) => {
      const r = indexedDB.open("courses", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("kv");
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const tx = r.result.transaction("kv", "readwrite"), out = fn(tx.objectStore("kv"));
        tx.oncomplete = () => resolve(out && out.result);
        tx.onerror = () => reject(tx.error);
      };
    });
  }
  function syncReminders() {
    if (!canNotify) return Promise.resolve();
    const stock = allItems().filter((it) => state.marks[it.id] === "got" && isDate(state.dates[it.id]))
      .map((it) => ({ id: it.id, name: it.name, date: state.dates[it.id] }));
    return idb((s) => s.put(stock, "stock")).catch(() => {});
  }
  function checkReminders() {
    if (!canNotify || Notification.permission !== "granted") return;
    syncReminders().then(() => navigator.serviceWorker.ready)
      .then((reg) => { if (reg.active) reg.active.postMessage({ type: "check" }); }).catch(() => {});
  }
  function registerDailyCheck() {
    if (!canNotify) return;
    navigator.serviceWorker.ready.then((reg) => {
      if (!reg.periodicSync) return;
      return navigator.permissions.query({ name: "periodic-background-sync" }).then((st) => {
        if (st.state === "granted") return reg.periodicSync.register("check-dates", { minInterval: 12 * 3600 * 1000 });
      });
    }).catch(() => {});
  }
  function drawNotifCard() {
    const p = canNotify ? Notification.permission : "granted";   // pas de carte si les rappels sont impossibles ici
    $("notifCard").hidden = p === "granted";
    $("notifBtn").textContent = p === "denied" ? "Bloqué" : "Activer";
  }
  $("notifBtn").addEventListener("click", () => {
    if (Notification.permission === "denied") { toast("Autorise les notifications de l'appli dans les réglages du téléphone.", null); return; }
    Notification.requestPermission().then((p) => {
      drawNotifCard();
      if (p !== "granted") return;
      registerDailyCheck(); checkReminders();
      toast("Rappels activés : tu seras prévenu 2 jours avant une date.", null);
    });
  });

  /* 11. Transfert entre appareils ou versions ------------------------------------------------- */
  const PREFIX = "COURSES1:";
  $("exportBtn").addEventListener("click", () => {
    const code = PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(state))));
    $("xfer").value = code;
    const manual = () => { $("xfer").focus(); $("xfer").select(); $("xferMsg").textContent = "Le code est sélectionné : copie-le, puis colle-le dans l'autre version."; };
    try {
      navigator.clipboard.writeText(code).then(
        () => { $("xferMsg").textContent = "Copié. Dans l'autre version, colle le code ici puis touche « Importer ce code »."; }, manual);
    } catch (e) { manual(); }
  });
  $("importBtn").addEventListener("click", () => {
    let data;
    try {
      const raw = $("xfer").value.trim().replace(PREFIX, "").replace(/\s+/g, "");
      data = JSON.parse(decodeURIComponent(escape(atob(raw))));
      if (!isObj(data) || !isObj(data.marks)) throw new Error("format");
    } catch (e) { $("xferMsg").textContent = "Ce code n'est pas reconnu. Recopie-le en entier depuis « Copier mes données »."; return; }
    const before = JSON.parse(JSON.stringify(state));
    Object.assign(state, normalize(data));
    save(); applySkin(); render();
    $("xfer").value = "";
    $("xferMsg").textContent = "Importé : " + Object.keys(state.marks).length + " articles cochés, " + state.custom.length + " ajouts, " +
      Object.values(state.dates).filter(isDate).length + " dates.";
    toast("Données importées", () => { Object.assign(state, before); applySkin(); });
  });

  /* 12. Styles ------------------------------------------------------------------------------- */
  function applySkin() {
    document.documentElement.setAttribute("data-skin", state.skin);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", SKINS[state.skin]);
    document.querySelectorAll("[data-pick]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pick === state.skin)));
    $("labBtn").hidden = state.skin !== "verre";
    if (state.skin !== "verre") closeLab();
    fx("setGlass", state.glass);
    fx("setSkin", state.skin);
  }
  $("skinBtn").addEventListener("click", () => { $("picker").hidden = false; });
  $("picker").addEventListener("click", (e) => {
    if (e.target.closest("[data-close-picker]")) { $("picker").hidden = true; return; }
    const b = e.target.closest("[data-pick]");
    if (b) { state.skin = b.dataset.pick; save(); applySkin(); }
  });

  /* Atelier du verre : on règle le fond et le verre, et on voit le résultat en direct
     (la carte test en haut du panneau, et les vraies cartes au-dessus). */
  const pct = (v) => Math.round(v * 100) + " %";
  const GLASS_SLIDERS = [
    { group: "labBg", key: "complexity", label: "Complexité des vagues", min: 1, max: 5, step: 1, show: (v) => ["très douces", "douces", "moyennes", "riches", "volutes"][v - 1] },
    { group: "labBg", key: "size", label: "Taille des vagues", min: 0.5, max: 2, step: 0.05, show: (v) => "×" + v.toFixed(2) },
    { group: "labBg", key: "fusion", label: "Fusion des couleurs", min: 0, max: 1, step: 0.02, show: (v) => (v < 0.05 ? "franche" : pct(v)) },
    { group: "labBg", key: "lace", label: "Filets clairs", min: 0, max: 1, step: 0.02, show: (v) => (v ? pct(v) : "aucun") },
    { group: "labBg", key: "speed", label: "Vitesse", min: 0, max: 4, step: 0.1, show: (v) => (v ? "×" + v.toFixed(1) : "arrêt") },
    { group: "labGlass", key: "zoom", label: "Loupe", min: 1, max: 1.4, step: 0.01, show: (v) => (v === 1 ? "aucune" : "×" + v.toFixed(2)) },
    { group: "labGlass", key: "bezel", label: "Bombé des bords", min: 0, max: 2, step: 0.05, show: (v) => (v ? pct(v) : "plat") },
    { group: "labGlass", key: "diffraction", label: "Diffraction (arc-en-ciel)", min: 0, max: 1, step: 0.02, show: (v) => (v ? pct(v) : "aucune") },
    { group: "labGlass", key: "frost", label: "Verre fumé", min: 0, max: 1, step: 0.02, show: (v) => (v ? pct(v) : "clair") },
    { group: "labGlass", key: "light", label: "Lumière des bords", min: 0, max: 2, step: 0.05, show: (v) => (v ? pct(v) : "éteinte") },
    { group: "labGlass", key: "round", label: "Arrondi des cartes", min: 0, max: 1, step: 0.02, show: (v) => (v > 0.97 ? "galet" : v < 0.03 ? "coins vifs" : pct(v)) }
  ];
  const LIGHT_LIMITS = { x: [0, 1], y: [0, 1], power: [0, 2], size: [0.1, 1], depth: [0.05, 1] };
  const LIGHT_SLIDERS = [
    { key: "power", label: "Intensité", min: 0, max: 2, step: 0.05, show: (v) => (v ? pct(v) : "éteinte") },
    { key: "size", label: "Taille", min: 0.1, max: 1, step: 0.02, show: pct },
    { key: "depth", label: "Profondeur derrière le verre", min: 0.05, max: 1, step: 0.02, show: (v) => (v < 0.3 ? "tout près" : v > 0.75 ? "loin" : pct(v)) }
  ];
  const EXTRA_COLORS = ["#ffd25e", "#5fd6a8", "#ff4f6d", "#4cc9ff", "#c7f464", "#ffffff", "#ff9ff3", "#2e2a6b"];
  for (const group of ["labBg", "labGlass"]) {
    $(group).innerHTML = GLASS_SLIDERS.filter((c) => c.group === group).map((c) =>
      '<label class="lab-row" for="lab-' + c.key + '"><span>' + c.label + ' <output id="labOut-' + c.key + '"></output></span>' +
      '<input type="range" id="lab-' + c.key + '" data-key="' + c.key + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '"></label>').join("");
  }
  function drawLab() {
    const g = state.glass, n = g.colors.length;
    $("labColors").innerHTML = g.colors.map((c, i) =>
      '<span class="lab-color"><input type="color" value="' + c + '" data-ci="' + i + '" aria-label="Couleur ' + (i + 1) + '">' +
      '<button type="button" data-rm="' + i + '" aria-label="Retirer la couleur ' + (i + 1) + '"' + (n <= 2 ? " disabled" : "") + ">×</button></span>").join("") +
      (n < 8 ? '<button class="pill" type="button" data-add>+ Couleur</button>' : "");
    for (const c of GLASS_SLIDERS) { $("lab-" + c.key).value = g[c.key]; $("labOut-" + c.key).textContent = c.show(g[c.key]); }
    drawLights();
  }
  // Sources lumineuses du fond : le pavé représente l'écran ; on touche une source pour la choisir,
  // on la glisse pour la déplacer ; ses réglages s'affichent dessous.
  let selLight = 0;
  function drawLights() {
    const lights = state.glass.lights;
    selLight = Math.min(selLight, Math.max(0, lights.length - 1));
    $("lightPad").innerHTML = lights.map((l, i) =>
      '<span class="lightdot' + (i === selLight ? " sel" : "") + '" data-li="' + i + '" style="left:' + l.x * 100 + "%;top:" + l.y * 100 +
      "%;--lc:" + l.color + '"></span>').join("");
    $("lightList").innerHTML = lights.map((l, i) =>
      '<span class="lab-color' + (i === selLight ? " sel" : "") + '"><input type="color" value="' + l.color + '" data-lc="' + i + '" aria-label="Couleur de la lumière ' + (i + 1) + '">' +
      '<button type="button" data-lrm="' + i + '" aria-label="Retirer la lumière ' + (i + 1) + '">×</button></span>').join("") +
      (lights.length < 3 ? '<button class="pill" type="button" data-ladd>+ Lumière</button>' : "");
    drawLightSliders();
  }
  // Choisir une lumière : on change seulement la sélection et ses curseurs. On ne remplace JAMAIS
  // la liste des pastilles ici, sinon le sélecteur de couleur natif ouvert dessus serait détruit.
  function selectLight(i) {
    if (i === selLight) return;
    selLight = i;
    $("lightPad").querySelectorAll(".lightdot").forEach((d) => d.classList.toggle("sel", +d.dataset.li === i));
    $("lightList").querySelectorAll(".lab-color").forEach((d, k) => d.classList.toggle("sel", k === i));
    drawLightSliders();
  }
  function drawLightSliders() {
    const l = state.glass.lights[selLight];
    $("labLight").innerHTML = l ? '<p class="small">Lumière ' + (selLight + 1) + "</p>" + LIGHT_SLIDERS.map((c) =>
      '<label class="lab-row" for="labL-' + c.key + '"><span>' + c.label + " <output>" + c.show(l[c.key]) + "</output></span>" +
      '<input type="range" id="labL-' + c.key + '" data-lkey="' + c.key + '" min="' + c.min + '" max="' + c.max + '" step="' + c.step + '" value="' + l[c.key] + '"></label>').join("")
      : '<p class="small">Aucune lumière : seul le fond éclaire le verre.</p>';
  }
  function moveLight(e) {
    const l = state.glass.lights[selLight]; if (!l) return;
    const r = $("lightPad").getBoundingClientRect();
    l.x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    l.y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const dot = $("lightPad").querySelector('[data-li="' + selLight + '"]');
    dot.style.left = l.x * 100 + "%"; dot.style.top = l.y * 100 + "%";
    pushGlass();
  }
  $("lightPad").addEventListener("pointerdown", (e) => {
    const dot = e.target.closest("[data-li]");
    if (dot) selectLight(+dot.dataset.li);
    $("lightPad").setPointerCapture(e.pointerId); moveLight(e);
  });
  $("lightPad").addEventListener("pointermove", (e) => { if (e.buttons) moveLight(e); });
  let labSaveTimer = 0;
  function pushGlass() {
    fx("setGlass", state.glass);
    clearTimeout(labSaveTimer); labSaveTimer = setTimeout(save, 300);
  }
  $("lab").addEventListener("input", (e) => {
    const t = e.target;
    if (t.dataset.key) {
      const c = GLASS_SLIDERS.find((x) => x.key === t.dataset.key);
      state.glass[c.key] = +t.value;
      $("labOut-" + c.key).textContent = c.show(+t.value);
    } else if (t.dataset.ci) state.glass.colors[+t.dataset.ci] = t.value;
    else if (t.dataset.lc) {
      const i = +t.dataset.lc;
      state.glass.lights[i].color = t.value;
      const dot = $("lightPad").querySelector('[data-li="' + i + '"]');
      if (dot) dot.style.setProperty("--lc", t.value);   // le point du pavé prend la couleur choisie
    }
    else if (t.dataset.lkey) {
      const c = LIGHT_SLIDERS.find((x) => x.key === t.dataset.lkey);
      state.glass.lights[selLight][c.key] = +t.value;
      t.parentNode.querySelector("output").textContent = c.show(+t.value);
    }
    else return;
    pushGlass();
  });
  $("lab").addEventListener("click", (e) => {
    const g = state.glass;
    if (e.target.closest("[data-add]")) g.colors.push(EXTRA_COLORS.find((c) => !g.colors.includes(c)) || "#ffffff");
    else if (e.target.closest("[data-rm]")) g.colors.splice(+e.target.closest("[data-rm]").dataset.rm, 1);
    else if (e.target.closest("[data-ladd]")) { g.lights.push({ x: 0.5, y: 0.4, color: "#ffffff", power: 0.8, size: 0.35, depth: 0.5 }); selLight = g.lights.length - 1; }
    else if (e.target.closest("[data-lrm]")) g.lights.splice(+e.target.closest("[data-lrm]").dataset.lrm, 1);
    else if (e.target.closest("#lightList .lab-color")) { selectLight([...$("lightList").querySelectorAll(".lab-color")].indexOf(e.target.closest(".lab-color"))); return; }
    else if (e.target.closest("#labReset")) state.glass = copyGlass(GLASS_DEFAULTS);
    else if (e.target.closest("#labClose")) { closeLab(); return; }
    else return;
    drawLab(); pushGlass();
  });
  function openLab() { $("picker").hidden = true; drawLab(); $("lab").hidden = false; document.body.classList.add("lab-open"); }
  function closeLab() { $("lab").hidden = true; document.body.classList.remove("lab-open"); }
  $("labBtn").addEventListener("click", openLab);

  /* 13. Démarrage ---------------------------------------------------------------------------- */
  let wakeLock = null;
  function wakeScreen() {
    try {
      if (wakeLock || !navigator.wakeLock || document.visibilityState !== "visible") return;
      navigator.wakeLock.request("screen").then((l) => { wakeLock = l; l.addEventListener("release", () => { wakeLock = null; }); }).catch(() => {});
    } catch (e) {}
  }
  // Au retour sur l'appli (par exemple le lendemain), on recalcule les dates.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    wakeScreen(); render(); checkReminders();
  });
  load();
  applySkin();
  render();
  wakeScreen();
  fx("enter", $("v-" + state.tab));
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register("sw.js").then(() => {
      canNotify = "Notification" in window && "indexedDB" in window;
      drawNotifCard();
      if (canNotify && Notification.permission === "granted") { registerDailyCheck(); checkReminders(); }
    }).catch(() => {});
  }
})();
