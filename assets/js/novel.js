// novel.js — インラインJSの外部化（novel.json を読む）
const JSON_URL = './novel.json';
const POS_KEY_PREFIX = 'novel_pos_';
const GA = (...args)=>{ try{ if (window.gtag) window.gtag(...args); } catch(e){} };

let endcapShownForChapter = null;
let chapters = [];
let currentIdx = 0;
let progressHit = new Set();

const $ = (s, r=document)=>r.querySelector(s);

const selectorEl = $('#chapterSelector');
const contentEl  = $('#chapterContent');
const titleEl    = $('#currentChapterTitle');
const prevBtn    = $('#prevChapter');
const nextBtn    = $('#nextChapter');
const barEl      = $('#progressBar');
const resumeBtn  = $('#resumeBtn');
const endcapEl   = $('#endcap');
const endcapNextBtn = $('#endcapNextBtn');
const endcapPrevBtn = $('#endcapPrevBtn');
const endcapTocBtn  = $('#endcapTocBtn');
const endcapHeading = $('#endcapHeading');
const nextPreviewEl = $('#nextPreview');

const stripHtml = (html)=>{ const tmp=document.createElement('div'); tmp.innerHTML=html||''; return tmp.textContent||tmp.innerText||''; };

fetch(JSON_URL, {cache:'no-store'})
  .then(r=>r.json())
  .then(data=>{
    chapters = data.chapters || [];
    buildSelector();
    render(0, true);
    if (chapters[0]) GA('event','view_novel', { items:[{ chapter_id: chapters[0].id, chapter_title: chapters[0].title }] });
  })
  .catch(err=>{
    contentEl.innerHTML = '<p style="color:#ffd27e">読み込みに失敗しました。novel.json を確認してください。</p>';
    console.error(err);
  });

function buildSelector(){
  selectorEl.innerHTML = chapters.map((c,i)=>`<option value="${i}">${String(c.id).padStart(2,'0')}：${c.title}</option>`).join('');
}
function render(idx, scrollTop){
  if (idx < 0 || idx >= chapters.length) return;
  currentIdx = idx; progressHit.clear();
  const c = chapters[idx];
  titleEl.textContent = c.title;
  selectorEl.value = String(idx);
  contentEl.innerHTML = c.content;

  if (idx < chapters.length-1){
    const n = chapters[idx+1];
    const preview = stripHtml(n.content).slice(0, 80);
    nextPreviewEl.textContent = preview ? preview + '…' : '';
    endcapHeading.textContent = '次に読む：' + n.title;
    endcapEl.hidden = true;
    endcapShownForChapter = null;
  }else{
    nextPreviewEl.textContent = '';
    endcapHeading.textContent = '完結';
    endcapEl.hidden = false;
    endcapShownForChapter = chapters[idx].id;
  }
  GA('event','pick_chapter', { chapter_id:c.id, chapter_title:c.title });
  if (scrollTop) window.scrollTo(0, 0);
  requestAnimationFrame(()=> updateResumeButton() );
}

function updateResumeButton(){
  const key = POS_KEY_PREFIX + chapters[currentIdx].id;
  const y = Number(localStorage.getItem(key) || 0);
  if (y>80){
    resumeBtn.style.display = 'block';
    resumeBtn.onclick = ()=> window.scrollTo({top:y, behavior:'smooth'});
  }else{
    resumeBtn.style.display = 'none';
  }
  updateProgress();
}

function updateProgress(){
  const h = document.documentElement;
  const scrolled = h.scrollTop || document.body.scrollTop;
  const height = h.scrollHeight - h.clientHeight;
  const r = height>0 ? (scrolled/height) : 0;
  barEl.style.width = (r*100)+'%';

  if (chapters.length && currentIdx < chapters.length-1){
    if (r >= 0.95){
      if (endcapEl.hidden){ endcapEl.hidden = false; }
      if (endcapShownForChapter !== chapters[currentIdx].id){
        endcapShownForChapter = chapters[currentIdx].id;
        GA('event','view_endcap', { chapter_id: chapters[currentIdx].id, next_chapter_id: chapters[currentIdx+1].id });
      }
    }else{
      if (!endcapEl.hidden) endcapEl.hidden = true;
    }
  }
  if (!updateProgress._t){
    updateProgress._t = setTimeout(()=>{
      const key = POS_KEY_PREFIX + chapters[currentIdx].id;
      localStorage.setItem(key, String(window.scrollY));
      updateProgress._t = null;
    }, 250);
  }
  const pct = Math.floor(r*100);
  [25,50,75,100].forEach(th=>{
    if (pct>=th && !progressHit.has(th)){
      progressHit.add(th);
      GA('event','read_progress', { chapter_id:chapters[currentIdx].id, percent: th });
    }
  });
}

window.addEventListener('scroll', updateProgress);
selectorEl.addEventListener('change', ()=> render(Number(selectorEl.value), true));
prevBtn.addEventListener('click', ()=>{ if (currentIdx>0){ GA('event','prev_chapter', { from:chapters[currentIdx].id }); render(currentIdx-1, true); }});
nextBtn.addEventListener('click', ()=>{ if (currentIdx<chapters.length-1){ GA('event','next_chapter', { from:chapters[currentIdx].id }); render(currentIdx+1, true); }});
endcapNextBtn?.addEventListener('click', ()=>{ if (currentIdx<chapters.length-1){ GA('event','click_next_chapter', { from:chapters[currentIdx].id, to:chapters[currentIdx+1].id }); render(currentIdx+1, true); }});
endcapPrevBtn?.addEventListener('click', ()=>{ if (currentIdx>0){ GA('event','click_prev_chapter', { from:chapters[currentIdx].id, to:chapters[currentIdx-1].id }); render(currentIdx-1, true); }});
endcapTocBtn?.addEventListener('click', ()=>{ selectorEl.focus({preventScroll:false}); GA('event','click_toc', { from:chapters[currentIdx].id }); window.scrollTo({top:0, behavior:'smooth'}); });
