// music.js — tracks.json から一覧を描画（インライン版を外部化）
let TRACKS = [];
let current = 'all';
const list = document.getElementById('list');

const sec = n => !Number.isFinite(n) ? "—" : `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const label = m => (m || "—");
function artOf(t){
  if (t.art) return t.art;
  if (t.url && /\.mp3(?:\?.*)?$/i.test(t.url)) return t.url.replace(/\.mp3(?:\?.*)?$/i, ".jpg");
  return null;
}
function draw(){
  list.innerHTML = '';
  const rows = TRACKS.filter(t => current === 'all' ? true : t.mood === current);
  rows.forEach(t => {
    const a = document.createElement('a');
    a.className = 'card';
    a.href = `audio.html?id=${encodeURIComponent(t.id)}&from=music`;

    const art = artOf(t);
    const artDiv = document.createElement('div');
    artDiv.className = 'art' + (art ? '' : ' fallback');
    if (art){ artDiv.style.backgroundImage = `url('${art}')`; }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `
      <div class="name">${t.name ?? '—'}</div>
      <div class="sub">${[t.origin, (t.bpm?`${t.bpm} BPM`:null), sec(t.duration)].filter(Boolean).join(' ／ ')}</div>
      <span class="pill">${label(t.mood)}</span>`;

    const go = document.createElement('div');
    go.className = 'go';
    go.innerHTML = `<button class="btn" type="button" aria-label="詳細へ">聴く</button>`;

    a.append(artDiv, meta, go);
    list.appendChild(a);
  });
}
document.querySelectorAll('.tab').forEach(btn=>{
  btn.addEventListener('click', () => {
    current = btn.dataset.key;
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    draw();
  });
});

fetch('./tracks.json')
  .then(r => r.json())
  .then(json => { TRACKS = json || []; draw(); })
  .catch(() => { list.innerHTML = '<p>わかりません／情報が不足しています</p>'; });
