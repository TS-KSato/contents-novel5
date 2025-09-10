// audio.js — 楽曲詳細/再生のロジック（外部化）
const params = new URLSearchParams(location.search);
const id = params.get('id');

const sec = n => !Number.isFinite(n) ? "—" : `${Math.floor(n/60)}:${String(Math.floor(n%60)).padStart(2,'0')}`;
const label = m => (m || "—");
function artOf(t){
  if (t.art) return t.art;
  if (t.url && /\.mp3(?:\?.*)?$/i.test(t.url)) return t.url.replace(/\.mp3(?:\?.*)?$/i, ".jpg");
  return null;
}

// 要素
const artEl   = document.getElementById('art');
const titleEl = document.getElementById('title');
const metaEl  = document.getElementById('meta');
const extraEl = document.getElementById('extra');
const audioEl = document.getElementById('audio');

// 読み込み
fetch('tracks.json')
  .then(r=>r.json())
  .then(list=>{
    const data = (id && list.find(t=>t.id===id)) || list[0];
    if(!data || !data.url){ throw new Error('track not found'); }

    titleEl.textContent = data.name ?? '—';
    metaEl.textContent  = [data.archetype, label(data.mood), (data.bpm?`${data.bpm} BPM`:null), sec(data.duration)]
                            .filter(Boolean).join(' ／ ');
    extraEl.textContent = data.origin ? `出自：${data.origin}` : '—';

    audioEl.src = data.url;
    audioEl.preload = 'metadata';

    const art = artOf(data);
    if (art){
      artEl.style.backgroundImage = `url('${art}')`;
      artEl.classList.remove('fallback');
      artEl.setAttribute('aria-label','アートワーク');
    } else {
      artEl.style.backgroundImage = '';
      artEl.classList.add('fallback');
      artEl.removeAttribute('aria-label');
    }
  })
  .catch(()=>{
    titleEl.textContent = 'わかりません／情報が不足しています';
    metaEl.textContent  = '';
    extraEl.textContent = '';
  });

// コントロール
document.getElementById('play').addEventListener('click', ()=>{
  if (audioEl.paused) audioEl.play(); else audioEl.pause();
});
document.getElementById('back15').addEventListener('click', ()=>{ audioEl.currentTime = Math.max(0, audioEl.currentTime - 15); });
document.getElementById('fwd15').addEventListener('click',  ()=>{ audioEl.currentTime = Math.min((audioEl.duration||1e9), audioEl.currentTime + 15); });
