const monthSel = document.getElementById("month");
const daySel = document.getElementById("day");
const errBox = document.getElementById("formErr");
const resultEl = document.getElementById("result");

for (let m = 1; m <= 12; m++){ const o=document.createElement("option"); o.value=String(m); o.textContent=String(m); monthSel.appendChild(o); }
function buildDayOptions(n){ daySel.innerHTML='<option value="" hidden>日を選ぶ</option>'; for(let d=1; d<=n; d++){ const o=document.createElement("option"); o.value=String(d); o.textContent=String(d); daySel.appendChild(o); } }
buildDayOptions(31);

function daysIn(m,y){ return [31,((y%4===0 && y%100!==0)||y%400===0)?29:28,31,30,31,30,31,31,30,31,30,31][m-1]; }
function reflowDays(){ const y=new Date().getFullYear(); const m=Number(monthSel.value||0); if(!m){ buildDayOptions(31); return; } const n=daysIn(m,y); const prev=daySel.value; buildDayOptions(n); if(prev && Number(prev)<=n) daySel.value=prev; }
monthSel.addEventListener("change", reflowDays); window.addEventListener("pageshow", reflowDays);

const CHARACTERS = [
  { id:"alan", name:"アラン", role:"若き守り手",   lines:["できることを三つ。終わったら胸を張ろう。","怖いなら一緒に行こう。足は二人分で軽くなる。"] },
  { id:"laila",name:"ライラ", role:"古き語り部",   lines:["急ぐ話ほど腰を据えて聞こう。真は静けさの中にある.","休息は物語の間（ま）。間があるから響くのだ。"] },
  { id:"drake",name:"ドレイク", role:"勇者の剣士", lines:["刃を抜く前に、心を抜け。決めるのは覚悟だ。","仲間を信じろ。背中はそれで守られる。"] },
  { id:"nester",name:"ネスター", role:"風の導き手",lines:["高く飛べば遠くが見える。視点を変えるだけで解ける謎がある。","地図を広げよ。道は一本ではない。"] }
];

function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function pick(len, seed){return hashStr(seed)%len}
function todayKey(){const d=new Date();return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`}

function showError(msg){ errBox.textContent=msg||""; errBox.style.display = msg ? "block" : "none"; }
function renderResult(p,line){
  resultEl.innerHTML = `
    <div class="card fadein" aria-labelledby="p-lab">
      <div id="p-lab" class="label">今日の導き手</div>
      <div class="partner">
        <div class="avatar" aria-hidden="true">${p.name.slice(0,2)}</div>
        <div><div class="pname">${p.name}</div><div class="prole">${p.role}</div></div>
      </div>
      <p class="line">「${line}」</p>
      <small class="lead" style="display:block;margin-top:6px;font-size:13px;color:var(--muted)">
        ※ 本日は端末日付に基づき一意に決定されます。月・日・性別により、来訪者ごとに結果が異なる場合があります。
      </small>
    </div>`;
  resultEl.scrollIntoView({behavior:"smooth", block:"start"});
}

document.getElementById("btnGo").addEventListener("click", ()=>{
  showError("");
  const mm = monthSel.value; const dd = daySel.value;
  if(!mm || !dd){ showError("月と日を選んでください。"); return; }
  const gender = document.querySelector('input[name="gender"]:checked')?.value || "未選択";
  const seed = `${todayKey()}|${mm}-${dd}|${gender}`;
  const p = CHARACTERS[pick(CHARACTERS.length, seed)];
  const line = p.lines[pick(p.lines.length, seed + "|l")];
  renderResult(p, line);
});

// bottom nav current
(function(){
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav a').forEach(function(a){
    var href = a.getAttribute('href')||'';
    if(href.endsWith(path)){ a.classList.add('bn-accent'); a.setAttribute('aria-current','page'); }
  });
})();
