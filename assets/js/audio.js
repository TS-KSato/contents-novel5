// audio.js — tracks.json を読み込んでリスト再生（data/ 配下参照＋no-cache）
const $list  = document.getElementById("list") || document.body;
let ALL = [];
let current = null;
let audio = document.querySelector("audio");

// なければ生成（ページに既存の <audio> があればそれを使用）
if (!audio) {
  audio = document.createElement("audio");
  audio.preload = "metadata";
  audio.style.display = "none";
  document.body.appendChild(audio);
}

const esc = (s) => String(s).replace(/[&<>"']/g, m => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m]));

function normalize(t){
  return {
    id: String(t.id || ""),
    name: String(t.name || ""),
    url: String(t.url || ""),
    art: String(t.art || ""),
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

function itemHTML(t){
  const art = t.art
    ? `<div class="art" style="background-image:url('${esc(t.art)}')"></div>`
    : `<div class="art" aria-label="アート未設定">♪</div>`;
  const sub = `${t.bpm ? `${t.bpm} bpm` : ""}${t.duration ? `・${secToMMSS(t.duration)}` : ""}`;
  return `
<article class="item" data-id="${esc(t.id)}">
  ${art}
  <div class="meta">
    <div class="name" title="${esc(t.name)}">${esc(t.name)}</div>
    <div class="sub">${esc(sub.trim().replace(/^・/,""))}</div>
  </div>
  <div class="go">
    <button class="btn" data-act="play" ${t.paid ? 'aria-disabled="true" tabindex="-1"' : ""}>
      ${t.paid ? "購入後再生" : "再生"}
    </button>
  </div>
</article>`;
}

function render(){
  if (!Array.isArray(ALL) || !ALL.length){
    $list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
    return;
  }
  $list.innerHTML = ALL.map(itemHTML).join("");
}

function playTrack(t){
  if (t.paid) return; // 有料は再生しない
  current = t.id;
  audio.src = t.url;
  audio.play().catch(()=>{ /* 自動再生ブロック対策で黙認 */ });

  // リスト上のボタン表記を更新
  $list.querySelectorAll('.item').forEach(it=>{
    const id = it.getAttribute('data-id');
    const btn = it.querySelector('button.btn');
    if (!btn) return;
    if (id === current){
      btn.textContent = "一時停止";
      btn.dataset.act = "pause";
    } else {
      btn.textContent = it.querySelector('.go .btn')?.getAttribute('aria-disabled') ? "購入後再生" : "再生";
      btn.dataset.act = "play";
    }
  });
}

$list.addEventListener('click', (e)=>{
  const btn = e.target.closest('button.btn');
  if (!btn) return;
  const item = e.target.closest('.item');
  if (!item) return;
  const id = item.getAttribute('data-id');
  const t = ALL.find(x=>x.id===id);
  if (!t) return;

  const act = btn.dataset.act;
  if (t.paid) return; // 有料は何もしない

  if (act === 'play'){
    playTrack(t);
  } else if (act === 'pause'){
    audio.pause();
    btn.textContent = "再生";
    btn.dataset.act = "play";
  }
});

audio.addEventListener('ended', ()=>{
  // 再生終了時にボタン表記を戻す
  const it = $list.querySelector(`.item[data-id="${CSS.escape(current||"")}"] .btn`);
  if (it){ it.textContent = "再生"; it.dataset.act = "play"; }
});

// ↓↓↓ 参照先を data/ 配下に変更。頻繁更新に合わせて no-cache を採用。
fetch("./assets/data/tracks.json", { cache: "no-cache" })
  .then(r => r.json())
  .then(json => { ALL = (Array.isArray(json)?json:[]).map(normalize); render(); })
  .catch(()=>{ $list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`; });
