const $ = sel => document.querySelector(sel);
function getDisplayName(name){ if(!name) return "（無名）"; if(typeof name==="string") return name; return name.display||name.short||"（無名）"; }
const state = { items:[], filtered:[], activeIndex:-1 };

function renderRooms(){
  const el=$("#rooms"); el.innerHTML="";
  state.filtered.forEach((it,idx)=>{
    const b=document.createElement("button"); b.type="button"; b.className="room-item"; b.addEventListener("click",()=>setActive(idx));
    const info=document.createElement("div");
    const n=document.createElement("div"); n.className="r-name"; n.textContent=getDisplayName(it.name);
    const m=document.createElement("div"); m.className="r-meta"; m.textContent=it.summary||"";
    info.append(n,m); b.appendChild(info);
    if(idx===state.activeIndex) b.classList.add("active"); el.appendChild(b);
  });
}
function renderThread(it){
  const el=$("#thread"); el.innerHTML="";
  if(!it){ el.innerHTML='<div class="empty">左の一覧からルームを選んでください。</div>'; return; }
  let last=""; (it.messages||[]).forEach(msg=>{
    const ts=msg.ts||"", date=ts.split("T")[0]||"";
    if(date && date!==last){ el.insertAdjacentHTML("beforeend", `<div class="section-date">${date}</div>`); last=date; }
    const who = msg.speaker||"—";
    const isLaila = (who||"").startsWith("ライラ");
    el.insertAdjacentHTML("beforeend", `
      <div class="msg${isLaila?" laila":""}">
        <div class="who">${who}</div>
        <div class="text">${(msg.text||"").replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}</div>
        <div class="meta">${ts}</div>
      </div>`);
  });
  if(!it.messages?.length){ el.innerHTML='<div class="empty">このルームにはメッセージがありません。</div>'; }
}
function setActive(i){ state.activeIndex=i; renderRooms(); renderThread(state.filtered[i]); }

$("#q").addEventListener("input", ()=>{
  const q=($("#q").value||"").trim().toLowerCase();
  state.filtered = !q ? [...state.items] : state.items.filter(it=>{
    const hay=`${getDisplayName(it.name)} ${it.role||""} ${it.summary||""}`.toLowerCase();
    return hay.includes(q);
  });
  if(state.activeIndex>=0 && !state.filtered.includes(state.items[state.activeIndex])) state.activeIndex=-1;
  renderRooms(); renderThread(state.filtered[state.activeIndex]);
});

(async()=>{
  try{
    const res=await fetch("./teachings_unified.json",{cache:"no-store"});
    if(!res.ok) throw 0; const json=await res.json();
    state.items=Array.isArray(json.items)?json.items:[]; state.filtered=[...state.items];
    renderRooms(); if(state.items.length) setActive(0); else renderThread(null);
  }catch(e){
    const el=$("#thread");
    el.innerHTML='<div class="empty">データの読み込みに失敗しました。teachings_unified.json を確認してください。</div>';
  }
})();

// bottom nav current
(function(){
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav a').forEach(function(a){
    var href = a.getAttribute('href') || '';
    if (href.endsWith(path)) { a.classList.add('bn-accent'); a.setAttribute('aria-current','page'); }
    else { a.classList.remove('bn-accent'); a.removeAttribute('aria-current'); }
  });
})();
