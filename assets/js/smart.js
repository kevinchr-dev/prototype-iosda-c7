// SMART grading with 4-button-only input and left/right peeks

const Q1 = "Apakah momennya bagus, subjeknya menarik, dan nuansanya pas?";
const Q2 = "Apakah foto ini tajam (fokus), pencahayaannya seimbang, dan komposisinya rapi?";
const QUESTIONS = [Q1, Q2];

const els = {
  progress: document.getElementById("progress-pill"),
  q: document.getElementById("smart-question"),
  dots: [document.getElementById("dot-1"), document.getElementById("dot-2")],
  ratingRow: document.getElementById("rating-row"),
  cardPrev: document.getElementById("card-prev"),
  cardCurr: document.getElementById("card-current"),
  cardNext: document.getElementById("card-next"),
  imgPrev: document.getElementById("img-prev"),
  imgCurr: document.getElementById("img-current"),
  imgNext: document.getElementById("img-next"),
};

const KEYS = {
  scores: "smart.scores",
  order: "smart.order",
  i: "smart.index",
  stage: "smart.stage",
};

let manifest = [];
let order = [];
let i = 0;
let stage = 0; // 0 = emotional, 1 = objective
let scores = {};

init().catch(console.error);

async function init() {
  await loadManifest();
  restore();

  if (!order.length) {
    order = manifest.slice(0, 24);
    persist(KEYS.order, order);
  }

  els.ratingRow.addEventListener("click", onRateClick);
  window.addEventListener("keydown", hotkeys);

  render();
}

async function loadManifest() {
  const res = await fetch("./photos/manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("manifest not found");
  const data = await res.json();
  manifest = Array.isArray(data.photos) ? data.photos : [];
}

function restore() {
  scores = read(KEYS.scores, {}) || {};
  order = read(KEYS.order, []) || [];
  i = clamp(read(KEYS.i, 0) || 0, 0, Math.max(0, order.length - 1));
  stage = read(KEYS.stage, 0) === 1 ? 1 : 0;
}

function render() {
  els.progress.textContent = order.length ? `${i + 1} / ${order.length}` : "0 / 0";
  els.q.textContent = QUESTIONS[stage];
  els.dots[0].classList.toggle("dot-active", stage === 0);
  els.dots[1].classList.toggle("dot-active", stage === 1);

  const curr = order[i];
  const prev = i > 0 ? order[i - 1] : null;
  const next = i < order.length - 1 ? order[i + 1] : null;

  els.imgCurr.src = curr || "";
  els.imgPrev.src = prev || "";
  els.imgNext.src = next || "";

  els.cardPrev.classList.toggle("hidden", !prev);
  els.cardNext.classList.toggle("hidden", !next);
}

function onRateClick(e) {
  const btn = e.target.closest("[data-score]");
  if (!btn) return;
  const val = +btn.dataset.score;
  const path = order[i];
  const entry = scores[path] || { emotional: null, objective: null };

  if (stage === 0) entry.emotional = val;
  else entry.objective = val;
  scores[path] = entry;
  persist(KEYS.scores, scores);

  if (stage === 0) stage = 1;
  else {
    stage = 0;
    if (i < order.length - 1) i += 1;
  }
  persist(KEYS.stage, stage);
  persist(KEYS.i, i);
  render();
}

function hotkeys(e) {
  if (["1", "2", "3", "4"].includes(e.key)) {
    const fake = { target: document.querySelector(`[data-score="${e.key}"]`) };
    onRateClick(fake);
  }
}

function read(k, fb) {
  try {
    const x = localStorage.getItem(k);
    return x ? JSON.parse(x) : fb;
  } catch {
    return fb;
  }
}
function persist(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
