/* ------------------------------------------------------------------ *
 * 1. TYPES DE CONTENU -> COULEUR
 *    -> le champ "type" du frontmatter doit correspondre à une clé ici
 * ------------------------------------------------------------------ */
const CONTENT_TYPES = {
  pensee:    { label: "Pensée",           color: "var(--c-pensee)" },
  recherche: { label: "Recherche",        color: "var(--c-recherche)" },
  narration: { label: "Narration",        color: "var(--c-narration)" },
  lecture:   { label: "Fiche de lecture", color: "var(--c-lecture)" },
};
 
/* ------------------------------------------------------------------ *
 * 2. FORMES -> ÉTAT DE LA NOTE
 *    -> le champ "shape" du frontmatter doit correspondre à une clé ici
 *
 *    Pense-évolution : chaque forme a un mode d'affichage.
 *    - Aujourd'hui : "css" -> forme géométrique simple (clip-path / border-radius)
 *    - Demain : passe un logo monochrome (svg/png transparent, silhouette noire)
 *      et renseigne "mask" -> le logo est recoloré automatiquement avec la
 *      couleur du type de contenu (via CSS mask-image), sans toucher au reste
 *      du script.
 *    - Ou passe un logo en couleurs et renseigne "image" -> il s'affiche tel
 *      quel, la couleur du type devient un anneau autour.
 * ------------------------------------------------------------------ */
const SHAPES = {
  bulbe: {
    label: "Bulbe (note courte)",
    css: { borderRadius: "50%", clipPath: "none" },
    // mask: "shapes/bulbe.svg",
    // image: "shapes/bulbe-logo.svg",
  },
  bourgeon: {
    label: "Bourgeon (note moyenne)",
    css: { borderRadius: "0", clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" },
    // mask: "shapes/bourgeon.svg",
    // image: "shapes/bourgeon-logo.svg",
  },
  fruit: {
    label: "Fruit (note longue)",
    css: { borderRadius: "6px", clipPath: "none" },
    // mask: "shapes/fruit.svg",
    // image: "shapes/fruit-logo.svg",
  },
};
 
/* Applique une forme + une couleur à un élément (rond ou légende) */
function applyShape(el, shapeKey, color, size) {
  const shape = SHAPES[shapeKey] || SHAPES.bulbe;
  el.style.width = size + "px";
  el.style.height = size + "px";
 
  // remise à zéro
  el.style.border = "none";
  el.style.backgroundImage = "none";
  el.style.webkitMaskImage = "none";
  el.style.maskImage = "none";
 
  if (shape.mask) {
    // logo monochrome recoloré par la couleur du type de contenu
    el.style.background = color;
    el.style.webkitMaskImage = `url(${shape.mask})`;
    el.style.maskImage = `url(${shape.mask})`;
    el.style.webkitMaskSize = "contain";
    el.style.maskSize = "contain";
    el.style.webkitMaskRepeat = "no-repeat";
    el.style.maskRepeat = "no-repeat";
    el.style.webkitMaskPosition = "center";
    el.style.maskPosition = "center";
    el.style.clipPath = "none";
    el.style.borderRadius = "0";
  } else if (shape.image) {
    // logo en couleurs, la couleur du type devient un anneau
    el.style.background = "transparent";
    el.style.backgroundImage = `url(${shape.image})`;
    el.style.backgroundSize = "contain";
    el.style.backgroundRepeat = "no-repeat";
    el.style.backgroundPosition = "center";
    el.style.border = `2px solid ${color}`;
    el.style.borderRadius = "50%";
    el.style.clipPath = "none";
  } else {
    // forme géométrique CSS simple (par défaut)
    el.style.background = color;
    el.style.clipPath = shape.css.clipPath;
    el.style.borderRadius = shape.css.borderRadius;
  }
}
 
/* ------------------------------------------------------------------ *
 * 3. CHARGEMENT DES PENSÉES DEPUIS /thoughts/
 * ------------------------------------------------------------------ */
let thoughts = [];
 
function parseThoughtFile(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    return { title: "(sans titre)", date: "", type: "pensee", shape: "bulbe", content: raw };
  }
 
  const [, frontmatterBlock, content] = match;
  const meta = {};
  frontmatterBlock.split("\n").forEach(line => {
    const sep = line.indexOf(":");
    if (sep === -1) return;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim();
    meta[key] = value;
  });
 
  return {
    title: meta.title || "(sans titre)",
    date: meta.date || "",
    type: meta.type || "pensee",
    shape: meta.shape || "bulbe",
    content: content.trim(),
  };
}
 
async function loadThoughts() {
  const manifestRes = await fetch("thoughts/manifest.json");
  const filenames = await manifestRes.json();
 
  return Promise.all(
    filenames.map(async (filename) => {
      const res = await fetch(`thoughts/${filename}`);
      const raw = await res.text();
      return parseThoughtFile(raw);
    })
  );
}
 
/* ------------------------------------------------------------------ *
 * 4. LÉGENDE
 * ------------------------------------------------------------------ */
const legend = document.getElementById("legend");
 
function renderLegend() {
  const colorGroup = document.createElement("div");
  colorGroup.className = "legend-group";
  colorGroup.innerHTML = `<div class="legend-title">Type de contenu</div>`;
  Object.values(CONTENT_TYPES).forEach(t => {
    const item = document.createElement("div");
    item.className = "item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = t.color;
    swatch.style.borderRadius = "50%";
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(t.label));
    colorGroup.appendChild(item);
  });
 
  const shapeGroup = document.createElement("div");
  shapeGroup.className = "legend-group";
  shapeGroup.innerHTML = `<div class="legend-title">Forme = état de la note</div>`;
  Object.entries(SHAPES).forEach(([key, shape]) => {
    const item = document.createElement("div");
    item.className = "item";
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    applyShape(swatch, key, "var(--ink-soft)", 14);
    item.appendChild(swatch);
    item.appendChild(document.createTextNode(shape.label));
    shapeGroup.appendChild(item);
  });
 
  legend.appendChild(colorGroup);
  legend.appendChild(shapeGroup);
}
 
/* ------------------------------------------------------------------ *
 * 5. GÉNÉRATION DES RONDS (position aléatoire à chaque refresh)
 * ------------------------------------------------------------------ */
const garden = document.getElementById("garden");
const MIN_SIZE = 26;
const MAX_SIZE = 46;
const MARGIN = 60;
 
function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}
 
function renderDots() {
  const w = window.innerWidth;
  const h = window.innerHeight;
 
  thoughts.forEach((thought, i) => {
    const size = randomBetween(MIN_SIZE, MAX_SIZE);
    const x = randomBetween(MARGIN, w - MARGIN);
    const y = randomBetween(MARGIN, h - MARGIN);
    const contentType = CONTENT_TYPES[thought.type] || CONTENT_TYPES.pensee;
 
    const dot = document.createElement("button");
    dot.className = "thought-dot";
    applyShape(dot, thought.shape, contentType.color, size);
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    dot.setAttribute("aria-label", thought.title);
    dot.addEventListener("click", () => openThought(i));
 
    garden.appendChild(dot);
  });
}
 
/* ------------------------------------------------------------------ *
 * 6. FENÊTRE / MODALE
 * ------------------------------------------------------------------ */
const overlay = document.getElementById("overlay");
const modalDate = document.getElementById("modal-date");
const modalThemeDot = document.getElementById("modal-theme-dot");
const modalShapeLabel = document.getElementById("modal-shape-label");
const modalTitle = document.getElementById("modal-title");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");
 
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
 
function openThought(index) {
  const thought = thoughts[index];
  const contentType = CONTENT_TYPES[thought.type] || CONTENT_TYPES.pensee;
  const shape = SHAPES[thought.shape] || SHAPES.bulbe;
 
  modalDate.textContent = formatDate(thought.date);
  modalThemeDot.style.background = contentType.color;
  modalShapeLabel.textContent = `${contentType.label} · ${shape.label}`;
  modalTitle.textContent = thought.title;
  modalBody.innerHTML = marked.parse(thought.content || "");
 
  overlay.classList.add("open");
}
 
function closeThought() {
  overlay.classList.remove("open");
}
 
modalClose.addEventListener("click", closeThought);
overlay.addEventListener("click", (e) => { if (e.target === overlay) closeThought(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeThought(); });
 
/* ------------------------------------------------------------------ *
 * 7. INIT
 * ------------------------------------------------------------------ */
async function init() {
  renderLegend();
  try {
    thoughts = await loadThoughts();
    renderDots();
  } catch (err) {
    garden.innerHTML = `
      <div style="max-width:480px;margin:120px auto;text-align:center;font-size:14px;color:var(--ink-soft);">
        Impossible de charger les pensées depuis <code>thoughts/</code>.<br>
        Si tu as ouvert ce fichier directement (file://), lance un petit serveur local, par exemple :<br>
        <code>python3 -m http.server</code> puis ouvre <code>http://localhost:8000</code>.
      </div>`;
    console.error(err);
  }
}
 
init();