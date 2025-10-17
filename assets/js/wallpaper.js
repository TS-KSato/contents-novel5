// wallpaper.js — wallpapers.json を読み込んで表示
const ALLOWED_ARCH = new Set(["nature", "life"]);
const TAG_ORDER    = ["dragon", "human", "elf", "fairy"];
const ALLOWED_TAGS = new Set(TAG_ORDER);
const $list = document.getElementById("list");
let ALL = [];

const jpTag = (t) => ({ dragon: "竜", human: "人", elf: "エルフ", fairy: "妖精" }[t] || t);
const has   = (arr, v) => Array.isArray(arr) && arr.includes(v);
const esc   = (s) => String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));

function normalize(w){
  const out = { ...w };
  out.id      = String(out.id || "");
  out.name    = String(out.name || "");
  out.caption = String(out.caption || "");
  out.url     = String(out.url || "");
  out.aspect  = String(out.aspect || "");
  out.paid    = Boolean(out.paid);

  const a = String(out.archetype || "").toLowerCase();
  out.archetype = ALLOWED_ARCH.has(a) ? a : "";

  const tset = new Set((out.tags || []).map(t=>String(t).toLowerCase()).filter(t=>ALLOWED_TAGS.has(t)));
  out.tags = TAG_ORDER.filter(t=>tset.has(t));
  return out;
}

function draw(){
  $list.innerHTML = ALL.map(w => `
<article class="card">
  <img class="hero" src="${w.url}" alt="${esc(w.name)}" loading="lazy" decoding="async" />
  <div class="wrap">
    <div class="name">${esc(w.name)}</div>
    <p class="cap">${esc(w.caption)}</p>
    <div class="row">
      ${w.archetype ? `<span class="pill">${w.archetype === "nature" ? "自然" : "生物"}</span>` : ""}
      ${w.tags.slice(0,2).map(t => `<span class="pill">${jpTag(t)}</span>`).join("")}
      <a class="btn" href="${w.url}" download>${w.paid ? "購入後ダウンロード" : "ダウンロード"}</a>
    </div>
  </div>
</article>`).join("");

  if (typeof window.gtagEvent === "function" && ALL.length) {
    window.gtagEvent("view_wallpaper", { count: ALL.length });
  }
}

fetch("./assets/data/wallpapers.json")
  .then(r => r.json())
  .then(json => { if(!Array.isArray(json)) throw 0; ALL = json.map(normalize); draw(); })
  .catch(() => { $list.innerHTML = '<p class="note">わかりません／情報が不足しています</p>'; });
