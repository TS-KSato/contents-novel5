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
    return 1
