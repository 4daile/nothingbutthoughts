/* ==================================================================== *
 * JARDIN DIGITAL — logique des "thoughts"
 * ==================================================================== */

/* ------------------------------------------------------------------ *
 * 1. THÈMES -> COULEURS
 *    -> "theme" dans chaque fichier .md doit correspondre à une clé ici
 * ------------------------------------------------------------------ */
const THEMES = {
  code:    { label: "Code",     color: "var(--c-code)" },
  design:  { label: "Design",   color: "var(--c-design)" },
  idee:    { label: "Idée",     color: "var(--c-idee)" },
  vie:     { label: "Vie",      color: "var(--c-vie)" },
  lecture: { label: "Lecture",  color: "var(--c-lecture)" },
};

let thoughts = [];

/* ------------------------------------------------------------------ *
 * 2. CHARGEMENT DES PENSÉES DEPUIS /thoughts/
 *    -> thoughts/manifest.json liste les fichiers à charger
 *    -> chaque fichier .md a un frontmatter (title, date, theme)
 *       suivi du contenu en markdown
 * ------------------------------------------------------------------ */
function parseThoughtFile(raw) {
  // sépare le frontmatter (entre les deux premières lignes "---") du contenu
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) {
    // pas de frontmatter détecté : on traite tout comme du contenu
    return { title: "(sans titre)", date: "", theme: "idee", content: raw };
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
    theme: meta.theme || "idee",
    content: content.trim(),
  };
}

async function loadThoughts() {
  const manifestRes = await fetch("thoughts/manifest.json");
  const filenames = await manifestRes.json();

  const loaded = await Promise.all(
    filenames.map(async (filename) => {
      const res = await fetch(`thoughts/${filename}`);
      const raw = await res.text();
      return parseThoughtFile(raw);
    })
  );

  return loaded;
}

/* ------------------------------------------------------------------ *
 * 3. GÉNÉRATION DES RONDS (position aléatoire à chaque refresh)
 * ------------------------------------------------------------------ */
const garden = document.getElementById("garden");
const legend = document.getElementById("legend");
const MIN_SIZE = 26;
const MAX_SIZE = 46;
const MARGIN = 60; // marge par rapport aux bords de l'écran

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function renderLegend() {
  Object.values(THEMES).forEach(theme => {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `<span class="swatch" style="background:${theme.color}"></span>${theme.label}`;
    legend.appendChild(item);
  });
}

function renderDots() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  thoughts.forEach((thought, i) => {
    const size = randomBetween(MIN_SIZE, MAX_SIZE);
    const x = randomBetween(MARGIN, w - MARGIN);
    const y = randomBetween(MARGIN, h - MARGIN);
    const theme = THEMES[thought.theme] || THEMES.idee;

    const dot = document.createElement("button");
    dot.className = "thought-dot";
    dot.style.width = size + "px";
    dot.style.height = size + "px";
    dot.style.left = x + "px";
    dot.style.top = y + "px";
    dot.style.background = theme.color;
    dot.setAttribute("aria-label", thought.title);
    dot.addEventListener("click", () => openThought(i));

    garden.appendChild(dot);
  });
}

/* ------------------------------------------------------------------ *
 * 4. FENÊTRE / MODALE
 * ------------------------------------------------------------------ */
const overlay = document.getElementById("overlay");
const modalDate = document.getElementById("modal-date");
const modalThemeDot = document.getElementById("modal-theme");
const modalTitleText = document.getElementById("modal-title-text");
const modalBody = document.getElementById("modal-body");
const modalClose = document.getElementById("modal-close");

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function openThought(index) {
  const thought = thoughts[index];
  const theme = THEMES[thought.theme] || THEMES.idee;

  modalDate.textContent = formatDate(thought.date);
  modalThemeDot.style.background = theme.color;
  modalTitleText.textContent = thought.title;
  modalBody.innerHTML = marked.parse(thought.content || "");

  overlay.classList.add("open");
}

function closeThought() {
  overlay.classList.remove("open");
}

modalClose.addEventListener("click", closeThought);
overlay.addEventListener("click", (e) => {
  if (e.target === overlay) closeThought();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeThought();
});

/* ------------------------------------------------------------------ *
 * 5. INIT
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