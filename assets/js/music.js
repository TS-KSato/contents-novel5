// music.js — tracks.json を読み込んで一覧表示（data/ 配下参照）
const $grid = document.getElementById("grid");      // <div id="grid">
const $tabs = document.getElementById("tabs");      // <div id="tabs">（任意）
let ALL = [];
let active = "all"; // フィルタ（"all" | mood:xxx | arch:xxx）

const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));
const has = (v) => v !== undefined && v !== null && String(v).length > 0;

function normalize(t){
  return {
    id: String(t.id || ""),
    name: String(t.name || ""),
    url: String(t.url || ""),
    art: String(t.art || ""),            // 画像がない場合はフォールバック表示
    bpm: Number.isFinite(t.bpm) ? t.bpm : null,
    duration: Number.isFinite(t.duration) ? t.duration : null,
    mood: String(t.mood || ""),
    archetype: String(t.archetype || ""),
    paid: Boolean(t.paid)
  };
}

function secToMMSS(n){
  if(!Number.isFinite(n)) return "";
  const m = Math.floor(n/60), s = Math.floor(n%60);
  return `${m}:${String(s).padStart(2,"0")}`;
}

function cardHTML(t){
  // アートエリア：画像があれば <div style="background-image">、なければ頭文字
  const art = has(t.art)
    ? `<div class="art" style="background-image:url('${esc(t.art)}')"></div>`
    : `<div class="art fallback" aria-label="アート未設定">${esc(t.name).slice(0,1)}</div>`;

  return `
<article class="card">
  ${art}
  <div class="meta">
    <div class="name" title="${esc(t.name)}">${esc(t.name)}</div>
    <div class="sub">
      ${t.bpm ? `${t.bpm} bpm` : ""} ${t.duration ? `・${secToMMSS(t.duration)}` : ""}
    </div>
    <div class="pill">${esc(t.mood || "mood")}</div>
  </div>
  <div class="go">
    <a class="btn" href="${esc(t.url)}" ${t.paid ? 'aria-disabled="true" tabindex="-1"' : ""}>
      ${t.paid ? "購入後再生" : "再生"}
    </a>
  </div>
</article>`;
}

function render(){
  const rows = ALL.filter(t => {
    if(active === "all") return true;
    if(active.startsWith("mood:")) return t.mood === active.slice(5);
    if(active.startsWith("arch:")) return t.archetype === active.slice(5);
    return true;
  });

  $grid.innerHTML = rows.map(cardHTML).join("") || `<div class="muted">わかりません／情報が不足しています</div>`;
  // GA4（任意）
  try{ window.gtagEvent && rows.length && window.gtagEvent("view_music", { count: rows.length }); }catch(_){}
}

function buildTabs(){
  if(!$tabs) return;
  const moods = Array.from(new Set(ALL.map(t => t.mood).filter(Boolean)));
  const arches = Array.from(new Set(ALL.map(t => t.archetype).filter(Boolean)));

  const chip = (label, val) => `<button class="tab${active===val?" active":""}" data-v="${val}">${label}</button>`;
  $tabs.innerHTML =
    chip("すべて", "all") +
    (moods.length ? moods.map(m => chip(`#${esc(m)}`, `mood:${m}`)).join("") : "") +
    (arches.length ? arches.map(a => chip(`@${esc(a)}`, `arch:${a}`)).join("") : "");

  $tabs.addEventListener("click", (e) => {
    const b = e.target.closest(".tab");
    if(!b) return;
    active = b.dataset.v || "all";
    $tabs.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x===b));
    render();
  });
}

// ↓↓↓ 参照先を data/ 配下に変更（キャッシュ無効化のため ?v を付与）
fetch("./assets/data/tracks.json")
  .then(r => r.json())
  .then(json => {
    ALL = (Array.isArray(json) ? json : []).map(normalize);
    buildTabs();
    render();
  })
  .catch(() => {
    $grid.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
  });
