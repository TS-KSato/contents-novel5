const BASE_PATH   = "./";
const FILE_PREFIX = "articles_";
const FILE_PAD    = 3;
const PROBE_MAX   = 200;
const PICK_COUNT  = 3;
const DEFAULT_FREE_PARAS = 2;
let isPremium = false; // 本番はサーバ判定

const statusPill = document.getElementById("statusPill");
const listEl = document.getElementById("articles");

function getWeekKey(d=new Date()){
  const onejan = new Date(d.getFullYear(),0,1);
  const days = Math.floor((d - onejan)/86400000);
  const week = Math.floor((days + onejan.getDay()+6)/7) + 1;
  return `${d.getFullYear()}-W${week}`;
}
function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; } }
function shuffleDet(arr, seedStr){
  const rng = mulberry32(hashStr(seedStr));
  const a = arr.slice();
  for(let i=a.length-1;i>0;i--){ const j = Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}
async function fetchJson(path){ const res = await fetch(path,{cache:"no-cache"}); if(!res.ok) throw new Error(res.status); return res.json(); }
function pad(n,w=FILE_PAD){ return String(n).padStart(w,"0"); }

async function probeFiles(){
  const found=[]; const BATCH=10;
  for(let start=1; start<=PROBE_MAX; start+=BATCH){
    const tasks=[];
    for(let i=start;i<start+BATCH && i<=PROBE_MAX;i++){
      const path = `${BASE_PATH}${FILE_PREFIX}${pad(i)}.json`;
      tasks.push(fetchJson(path).then(j=>({ok:true,j,id:i,path})).catch(_=>({ok:false})));
    }
    const results=await Promise.all(tasks);
    for(const r of results){
      if(!r.ok) continue;
      if(Array.isArray(r.j["語り巻"])){
        r.j["語り巻"].forEach((it,idx)=>found.push({ id:`${r.id}-${idx+1}`, path:r.path, data: normalizeArticle(it, r.j) }));
      }else{
        found.push({ id:r.id, path:r.path, data: normalizeArticle(r.j, null) });
      }
    }
    if(found.length>=36) break;
  }
  return found;
}
function normalizeArticle(raw,parent){
  const title  = raw.題名 || raw.title || "（無題）";
  const author = raw.語り手 || raw.author || "";
  const role   = raw.語り手の肩書 || raw.role || "";
  const lead   = raw.lead || raw.導入 || "";
  const body   = Array.isArray(raw.body)?raw.body:(typeof raw.本文==="string"?raw.本文.split(/\n{2,}/):[]);
  const date   = raw.date || raw.日付 || raw.公開日 || (parent && parent.月度 ? parent.月度 : "");
  const tags   = raw.tags || raw.印 || [];
  const source_hint = raw.source_hint || raw.出典 || "";
  const free_paragraphs = Number.isInteger(raw.free_paragraphs) ? raw.free_paragraphs : null;
  const avatar = raw.avatar || raw.語り手の肖像 || guessAvatar(author);
  return { title, author, role, lead, body, date, tags, source_hint, free_paragraphs, avatar };
}
function guessAvatar(author){
  if(!author) return "";
  const map = {
    "ルナル":"assets/char-lunal.jpg",
    "アラン":"assets/char-alan.jpg",
    "リリア":"assets/char-lilia.jpg",
    "ライラ":"assets/char-laila.jpg",
    "ドレイク":"assets/char-drake.jpg",
    "ネクサート":"assets/char-king.jpg",
    "マグナス":"assets/char-magnus.jpg",
    "ネスター":"assets/char-nester.jpg",
    "ミレイア":"assets/char-mireia.jpg"
  };
  for(const k of Object.keys(map)){ if(author.startsWith(k)) return map[k]; }
  return "";
}
function pickArticles(pool){
  const seed = "serial|" + getWeekKey();
  const shuffled = shuffleDet(pool, seed);
  const seen = new Set(); const picks=[];
  for(const a of shuffled){ if(seen.has(a.id)) continue; picks.push(a); seen.add(a.id); if(picks.length>=PICK_COUNT) break; }
  return picks;
}
function esc(s){ return String(s||"").replace(/[&<>]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m])); }

function renderItem(a){
  const d = a.data.date ? new Date(a.data.date) : null;
  const metaDate = (d && !isNaN(d)) ? `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日` : esc(a.data.date||"");
  const tags = (a.data.tags||[]).slice(0,3).map(esc).join("・");
  const freeN = a.data.free_paragraphs ?? DEFAULT_FREE_PARAS;
  const hasLead = !!(a.data.lead && a.data.lead.trim());
  const freeBody = (a.data.body||[]).slice(0, Math.max(0, freeN));
  const fullBody = (a.data.body||[]);
  const freeHtml = `${ hasLead ? `<p class="lead">${esc(a.data.lead)}</p>` : "" }<div class="body">${freeBody.map(p=>`<p>${esc(p)}</p>`).join("")}</div>`;
  const fullHtml = `${ hasLead ? `<p class="lead">${esc(a.data.lead)}</p>` : "" }<div class="body">${fullBody.map(p=>`<p>${esc(p)}</p>`).join("")}</div>`;
  const av = a.data.avatar;
  const initials = (a.data.author||"").slice(0,2) || "賢者";
  const avatarHtml = av ? `<div class="avatar" style="background-image:url('${esc(av)}');" aria-hidden="true"></div>` : `<div class="avatar fallback" aria-hidden="true">${esc(initials)}</div>`;
  return `
    <article class="card">
      <div class="article-head">
        ${avatarHtml}
        <div>
          <h2 class="title">${esc(a.data.title)}</h2>
          <div class="byline meta">
            ${metaDate ? `${esc(metaDate)}` : ``}
            ${tags ? ` / ${tags}` : ``}
            ${a.data.author ? ` / 語り手：${esc(a.data.author)}` : ``}
            ${a.data.role ? `（${esc(a.data.role)}）` : ``}
          </div>
        </div>
      </div>
      <div class="sep"></div>
      ${ isPremium ? fullHtml
                   : `${freeHtml}${ fullBody.length > freeBody.length ? `<div class="sep"></div><div class="pill">🔒 続きを読むには <a class="pill" href="./signup.html" style="margin-left:.5rem;">会員登録</a></div>` : `` }` }
      ${ a.data.source_hint ? `<div class="sep"></div><p class="meta">${esc(a.data.source_hint)}（※長文引用は避け要旨化）</p>` : "" }
    </article>`;
}
function renderArticles(arr){
  if(!arr?.length){ listEl.innerHTML = `<div class="card"><p class="meta">記事が見つかりませんでした。</p></div>`; return; }
  const picks = pickArticles(arr);
  listEl.innerHTML = picks.map(renderItem).join("");
}

let cachedArticles = [];
(async function(){
  try{ const pool = await probeFiles(); cachedArticles = pool; renderArticles(pool); }
  catch(e){ listEl.innerHTML = `<div class="card"><p class="meta">読み込みに失敗しました。</p></div>`; }
})();

// bottom nav current
(function(){
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav a').forEach(function(a){
    var href = a.getAttribute('href')||'';
    if(href.endsWith(path)){ a.classList.add('bn-accent'); a.setAttribute('aria-current','page'); }
  });
})();
