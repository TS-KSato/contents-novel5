// archetype-path.js (ESM) — このページ専用の描画・イベント
import { $, esc, ArchetypeStore, Avatar } from "/assets/js/core.js";
import { Events } from "/assets/js/ga4.js";

/* ====== 1) タイプ辞書（id -> 表示用） ====== */
const ARCHETYPES = Object.freeze({
  alan:  { id:'alan',  name:'アラン',  desc:'', av:'av-alan',  initials:'AL' },
  drake: { id:'drake', name:'ドレイク',desc:'', av:'av-drake', initials:'DR' },
  nester:{ id:'nester',name:'ネスター',desc:'', av:'av-nester',initials:'NE' },
  lilia: { id:'lilia', name:'リリア',  desc:'', av:'av-lilia', initials:'LI' },
  laila: { id:'laila', name:'ライラ',  desc:'', av:'av-laila', initials:'LA' }
});

/* ====== 2) Phase1：4軸 → 最も近いタイプ pick ====== */
// 回答の取得（右= true / 左= false）
function readAxes(){
  const axes = ["logic","spirit","vector","social"];
  const ans = {};
  axes.forEach(ax=>{
    const el = document.querySelector(`.toggle[data-axis="${ax}"] input[type="checkbox"]`);
    ans[ax] = !!(el && el.checked);
  });
  return ans;
}

// 代表パターン（ハミング距離で最小を採用）
const ARCH_RULES = [
  { id:"alan",  pat:{logic:false, spirit:false, vector:true,  social:true } },
  { id:"drake", pat:{logic:true,  spirit:true,  vector:true,  social:true } },
  { id:"nester",pat:{logic:false, spirit:false, vector:false, social:false} },
  { id:"lilia", pat:{logic:false, spirit:false, vector:true,  social:false} },
  { id:"laila", pat:{logic:true,  spirit:true,  vector:false, social:false} },
];
function pickArchetype(ans){
  let best = ARCH_RULES[0], bestDist = Infinity;
  for(const r of ARCH_RULES){
    let d = 0; for(const k in r.pat){ if(!!ans[k] !== !!r.pat[k]) d++; }
    if (d < bestDist){ best = r; bestDist = d; }
  }
  return best.id;
}

/* ====== 3) 確定済みタイプの描画 ====== */
function renderArchetypeBox(a){
  const box = $("#archetypeBox");
  const text = $("#archText");
  if (!box || !text) return;

  // 内容構築（DOMで安全に）
  text.innerHTML = `
    <div class="pill">確定済みのタイプ</div>
    <div class="arch-line">
      <span class="arch-avatar-slot"></span>
      <div>
        <h3 class="arch-name" style="margin:.25rem 0 0"></h3>
        <p class="note arch-desc" style="margin:.25rem 0 0"></p>
      </div>
    </div>
    <div class="actions" style="margin-top:10px">
      <button class="btn ghost" id="btnChange">タイプをやり直す（この端末のみ）</button>
      <a class="btn" href="#p2h">十の質問へ進む</a>
    </div>`;

  $(".arch-avatar-slot", text).appendChild(Avatar.render(a));
  $(".arch-name", text).textContent = a.name || "—";
  $(".arch-desc", text).textContent = a.desc || "";

  $("#btnChange", text)?.addEventListener("click", ()=>{
    if (confirm("この端末に保存されたタイプを未設定に戻します。よろしいですか？")){
      ArchetypeStore.clear();
      apply();
    }
  });
}

/* ====== 4) Phase2：十の質問 ====== */
const QUESTIONS = [
  { id:'q1',  left:'静かに整える',        right:'速く動く' },
  { id:'q2',  left:'周囲との調和',        right:'正しさを貫く' },
  { id:'q3',  left:'感覚で決める',        right:'根拠で決める' },
  { id:'q4',  left:'計画を守る',          right:'状況に合わせる' },
  { id:'q5',  left:'一人で集中',          right:'仲間と分担' },
  { id:'q6',  left:'学びを深める',        right:'試して覚える' },
  { id:'q7',  left:'慎重に様子を見る',    right:'まず一歩踏み出す' },
  { id:'q8',  left:'短所を整える',        right:'長所を伸ばす' },
  { id:'q9',  left:'道筋を確認する',      right:'ゴールから逆算する' },
  { id:'q10', left:'自分のペース',        right:'相手のペース' },
];

function populateQuestions(){
  const host = $("#qList");
  if (!host) return;
  host.innerHTML = QUESTIONS.map((q,idx)=>`
    <div class="q" data-qid="${q.id}">
      <div class="t">Q${idx+1}.</div>
      <div class="toggle" data-q="${q.id}">
        <span class="opt">${esc(q.left)}</span>
        <label class="switch">
          <input type="checkbox" aria-label="Q${idx+1}" />
          <span class="knob"></span>
        </label>
        <span class="opt">${esc(q.right)}</span>
      </div>
    </div>`).join("");

  host.querySelectorAll('.toggle input[type="checkbox"]').forEach(inp=>{
    inp.addEventListener('change', ()=>{
      inp.closest('.toggle')?.setAttribute('data-touched','1');
      refreshEvalButton();
    });
  });
  refreshEvalButton();
}

function isAllAnswered(){
  const toggles = $$('#qList .toggle');
  if (!toggles.length) return false;
  return toggles.every(t => t.getAttribute('data-touched') === '1');
}
function collectAnswers(){
  return $$('#qList .toggle').map(t=>{
    const ch = t.querySelector('input[type="checkbox"]'); return !!(ch && ch.checked);
  });
}
function refreshEvalButton(){
  const btn = $("#btnEval"); if (!btn) return;
  btn.disabled = !isAllAnswered();
}
function clearAnswers(){
  $$('#qList .toggle').forEach(t=>{
    const ch = t.querySelector('input[type="checkbox"]'); if (ch) ch.checked = false;
    t.removeAttribute('data-touched');
  });
  refreshEvalButton();
}

// 結果（保存しない・断定しない）
const ROLES = [
  { id:'disciple',  name:'学び手',     nick:'〈Disciple〉'   },
  { id:'lore',      name:'記録手',     nick:'〈Lorekeeper〉' },
  { id:'wind',      name:'案内手',     nick:'〈Wind Guide〉' },
  { id:'knight',    name:'支え手',     nick:'〈Knight〉'     },
  { id:'storm',     name:'切り開き手', nick:'〈Stormblade〉' },
  { id:'healer',    name:'整え手',     nick:'〈Healer〉'     },
];
function decideRole(answerBools){
  const s = answerBools.reduce((a,b)=>a + (b?1:0), 0); // 0..10
  if (s <= 1) return ROLES[0];
  if (s <= 3) return ROLES[1];
  if (s <= 5) return ROLES[2];
  if (s <= 7) return ROLES[3];
  if (s <= 9) return ROLES[4];
  return ROLES[5];
}
function showResult(role){
  const box = $("#resultBox"), out = $("#roleText");
  if (!box || !out) return;
  box.hidden = false;
  out.innerHTML = `
    <div class="pill">本日のヒント</div>
    <h3 style="margin:.4rem 0 0">${esc(role.name)} <small class="note">${esc(role.nick)}</small></h3>
    <p class="note" style="margin:.25rem 0 0">
      これは本日の行動スタイルのヒントです。必要に応じて調整してお使いください。
    </p>`;
  box.scrollIntoView({behavior:'smooth',block:'start'});
}

/* ====== 5) apply(): 可視性の一元管理 ====== */
function show(el, on){ if (el) el.hidden = !on; }
function getArchetype(){ const id = ArchetypeStore.get(); return id && ARCHETYPES[id] ? ARCHETYPES[id] : null; }

function apply(){
  const a = getArchetype();
  show($("#phase1"), !a);
  show($("#archetypeBox"), !!a);
  show($("#phase2"), !!a);
  if (a){ // 確定済み時のみ描画/準備
    renderArchetypeBox(a);
    populateQuestions();
  }else{
    $("#resultBox") && ($("#resultBox").hidden = true);
  }
}

/* ====== 6) イベント紐付け（Phase1/2） ====== */
function bindPhase1(){
  $("#btnP1")?.addEventListener('click', ()=>{
    const ans = readAxes();
    const id  = pickArchetype(ans);
    ArchetypeStore.set(id);
    Events.eval_path?.("phase1_done");
    apply();
  });
  $("#btnP1Reset")?.addEventListener('click', ()=>{
    document.querySelectorAll('.toggle[data-axis] input[type="checkbox"]').forEach(i=> i.checked = false);
  });
}
function bindPhase2(){
  $("#btnEval")?.addEventListener('click', ()=>{
    if (!isAllAnswered()) return;
    const answers = collectAnswers();
    const role = decideRole(answers);
    Events.eval_path?.("result_view");
    showResult(role);
  });
  $("#btnClearQ")?.addEventListener('click', clearAnswers);
}

// DOM 準備後に初期化
document.addEventListener('DOMContentLoaded', ()=>{
  apply();
  bindPhase1();
  bindPhase2();
});
