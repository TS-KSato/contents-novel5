// index.js — Topページの占い/カレンダー処理（外部化）
const JSON_PATH = "./fortune_messages.json";
const FALLBACK = {
  meta:{version:2, characters:["ルナル","アラン","リリア"], free_categories:["総合"]},
  weights:{"5":18,"4":32,"3":30,"2":15,"1":5},
  categories:[
    {key:"総合",paid:false},{key:"健康",paid:true},{key:"平穏",paid:true},{key:"生活",paid:true},
    {key:"対人",paid:true},{key:"成長",paid:true},{key:"目的",paid:true},{key:"自由",paid:true},
    {key:"娯楽",paid:true},{key:"評価",paid:true}
  ],
  messages:{
    "総合":{
      "5":{ "ルナル":"今日は追い風だ遠慮なく行こう","アラン":"思った以上に進む日素直に踏み出そう","リリア":"光があなたを包む日小さな奇跡を拾って" },
      "4":{ "ルナル":"整っているいつもより一歩深く","アラン":"流れは良好段取りを意識すると吉","リリア":"澄んだ空気迷ったら軽い方を" },
      "3":{ "ルナル":"平常運足場を固めておけ","アラン":"可もなく不可もなく基本を丁寧に","リリア":"静かな日無理せず整えて" },
      "2":{ "ルナル":"焦りは不要今日は守りを優先","アラン":"無理は禁物小目標で十分","リリア":"休む勇気を心に余白を" },
      "1":{ "ルナル":"退くも勇明日に力を残せ","アラン":"今日は小休止最低限でOK","リリア":"やさしく過ごして自分を責めないで" }
    }
  }
};

let META=null, MESSAGES=null, WEIGHTS=null, CATEGORIES=null, CHARACTERS=null, FREE_KEYS=new Set(["総合"]), isPremium=false;

const $ = (sel, el=document)=> el.querySelector(sel);
const esc = (s)=> String(s||"").replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
function hashStr(s){ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function mulberry32(a){ return function(){ let t=a+=0x6D2B79F5; t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296; } }
function todayKey(){ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }
function starText(n){ return "★★★★★☆☆☆☆☆".slice(5-n,10-n); }
function pickByWeights(weights, seed){ const rng=mulberry32(hashStr(seed)); const entries=Object.entries(weights); const total=entries.reduce((s,[,w])=>s+Number(w),0); let r=rng()*total; for(const [star,w] of entries){ if(r<w) return Number(star); r-=w; } return 3; }

// analytics placeholder (必要なら ga4.js に差し替え可能)
function track(name, detail){ document.dispatchEvent(new CustomEvent('track', {detail:{name, ...detail}})); }

function initWithJson(json){
  META=json.meta||{}; WEIGHTS=json.weights||FALLBACK.weights; MESSAGES=json.messages||FALLBACK.messages; CATEGORIES=json.categories||FALLBACK.categories; CHARACTERS= (json.meta?.characters)||FALLBACK.meta.characters; if(Array.isArray(json.meta?.free_categories)) FREE_KEYS=new Set(json.meta.free_categories);
}

function renderResult(char){
  const res = $('#result');
  const box = $('#resultBox');
  res.style.display = 'block';

  const seed = `${todayKey()}|${char}|総合`;
  const stars = pickByWeights(WEIGHTS, seed);
  const msg = (MESSAGES?.["総合"]?.[String(stars)]?.[char]) || '今日の言葉は準備中です';

  const premiumList = CATEGORIES.filter(c=>c.paid);
  const paidHtml = premiumList.map(c=>`<li class="lock">${esc(c.key)}：<span aria-hidden="true">🔒</span> 有料で開放</li>`).join('');

  box.innerHTML = `
    <div style="display:flex; gap:.75rem; align-items:center; margin-bottom:.25rem">
      <div style="width:2.75rem; height:2.75rem; border-radius:50%; border:1px solid #2b3559; background:#10162a; display:flex; align-items:center; justify-content:center">${esc(char.slice(0,2))}</div>
      <div>
        <div class="stars" aria-label="運勢">${starText(stars)}</div>
        <div style="color:#e8eeff; font-size:1rem; margin-top:.125rem">${esc(msg)}</div>
      </div>
    </div>
    <hr style="border:none; border-top:1px solid var(--line); margin:.75rem 0" />
    <div class="meta">無料会員：総合のみ表示 / 有料会員：9カテゴリが毎日開放</div>
    <ul style="margin:.25rem 0 0 .9rem; padding:0">${paidHtml}</ul>
    <div style="margin-top:.75rem; display:flex; gap:.5rem; flex-wrap:wrap">
      <a href="./signup.html" class="btn" data-evt="upsell">有料プランを見る</a>
    </div>`;
}

function initCalendar(){
  const pad = n => String(n).padStart(2,'0');
  const fmtJP = d => {
    const y=d.getFullYear(), m=d.getMonth()+1, da=d.getDate();
    const w = ['日','月','火','水','木','金','土'][d.getDay()];
    return `${y}年${m}月${da}日（${w}）`;
  };
  const keyMMDD = d => `${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  function vernalEquinoxDay(year){ return Math.floor(20.8431 + 0.242194*(year-1980)) - Math.floor((year-1980)/4); }
  function autumnalEquinoxDay(year){ return Math.floor(23.2488 + 0.242194*(year-1980)) - Math.floor((year-1980)/4); }
  function nthWeekdayOfMonth(year, month, weekday, nth){
    const first = new Date(year, month-1, 1);
    const add = (weekday - first.getDay() + 7) % 7;
    return 1 + add + 7*(nth-1);
  }
  function japaneseHolidayCore(y,m,d){
    if (m===1 && d===1) return '元日';
    if (m===2 && d===11) return '建国記念の日';
    if (m===2 && d===23) return '天皇誕生日';
    if (m===4 && d===29) return '昭和の日';
    if (m===5 && d===3) return '憲法記念日';
    if (m===5 && d===4) return 'みどりの日';
    if (m===5 && d===5) return 'こどもの日';
    if (m===8 && d===11) return '山の日';
    if (m===11 && d===3) return '文化の日';
    if (m===11 && d===23) return '勤労感謝の日';
    if (m===1 && d===nthWeekdayOfMonth(y,1,1,2)) return '成人の日';
    if (m===7 && d===nthWeekdayOfMonth(y,7,1,3)) return '海の日';
    if (m===9 && d===nthWeekdayOfMonth(y,9,1,3)) return '敬老の日';
    if (m===10 && d===nthWeekdayOfMonth(y,10,1,2)) return 'スポーツの日';
    if (m===3 && d===vernalEquinoxDay(y)) return '春分の日';
    if (m===9 && d===autumnalEquinoxDay(y)) return '秋分の日';
    return null;
  }
  function japaneseHoliday(date){
    const y=date.getFullYear(), m=date.getMonth()+1, d=date.getDate();
    const core = japaneseHolidayCore(y,m,d);
    if (core) return core;
    const yd = new Date(date); yd.setDate(d-1);
    if (yd.getDay()===0 && japaneseHolidayCore(yd.getFullYear(), yd.getMonth()+1, yd.getDate())) return '振替休日';
    return null;
  }

  const elDate = document.getElementById('calDate');
  const elHoliday = document.getElementById('calHoliday');
  const elQuoteText = document.getElementById('quoteText');
  const elQuoteAuthor = document.getElementById('quoteAuthor');
  const $section = document.getElementById('calendarQuote');
  const btnPrev = document.getElementById('btnPrevDay');
  const btnNext = document.getElementById('btnNextDay');
  const btnToday = document.getElementById('btnToday');

  let quotes = null;
  let current = new Date();

  function render(){
    const key = keyMMDD(current);
    const list = (quotes && (quotes[key] || quotes[key.toLowerCase()] || quotes[key.replace(/^0/,'').replace('-0','-')])) || [];
    const item = list[0] || {text:"この日は静穏竜はただ翼を休める", author:"銀竜録"};
    elDate.textContent = fmtJP(current);
    const holi = japaneseHoliday(current);
    elHoliday.textContent = holi ? `祝日：${holi}` : '';
    elQuoteText.classList.remove('skeleton');
    elQuoteText.textContent = item.text;
    elQuoteAuthor.innerHTML = `— ${item.author}`;
  }

  // 初描画
  render();
  // 引用データ
  fetch('./quotes.json', {cache:'no-store'})
    .then(r=>r.json()).then(data=>{ quotes = data; render(); })
    .catch(()=>{ quotes = {"01-01":[{"text":"（名言データが見つかりません）","author":"銀竜録"}]}; render(); });

  // ナビ
  btnPrev.addEventListener('click', ()=>{ current.setDate(current.getDate()-1); render(); });
  btnNext.addEventListener('click', ()=>{ current.setDate(current.getDate()+1); render(); });
  btnToday.addEventListener('click', ()=>{ current = new Date(); render(); });

  // スワイプ
  let x0=null,y0=null;
  $section.addEventListener('touchstart', e=>{ const t=e.touches[0]; x0=t.clientX; y0=t.clientY; }, {passive:true});
  $section.addEventListener('touchend', e=>{
    if(x0===null) return;
    const t=e.changedTouches[0], dx=t.clientX-x0, dy=t.clientY-y0;
    if(Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)){ if(dx<0) current.setDate(current.getDate()+1); else current.setDate(current.getDate()-1); render(); }
    x0=y0=null;
  });
}

function main(){
  // JSON読み込み
  fetch(JSON_PATH).then(r=>r.ok?r.json():Promise.reject('fetch not ok')).then(initWithJson).catch(()=>initWithJson(FALLBACK));

  // クリックイベント
  $('#ctaGet').addEventListener('click', ()=>{
    const first = CHARACTERS?.[0]||'ルナル';
    renderResult(first);
    window.scrollTo({top:$('#result').offsetTop - 12, behavior:'smooth'});
  });

  $('#charButtons').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-char]');
    if(!btn) return;
    const c = btn.getAttribute('data-char');
    renderResult(c);
    window.scrollTo({top:$('#result').offsetTop - 12, behavior:'smooth'});
  });

  initCalendar();
}

document.addEventListener('DOMContentLoaded', main);
