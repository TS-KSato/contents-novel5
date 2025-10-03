/* 
  銀竜競技：アランの調和試技
  - 縦画面スマホ向け / GitHub Pages対応（静的）
  - Canvas 1枚描画、通信なし、音なし（制約環境でも動作）
*/

const BUILD = window.__BUILD__ || {version:"v0", builtAt:""};
document.getElementById("version").textContent = BUILD.version;

const $ = (id)=>document.getElementById(id);
const Screens = {
  home: $("screen-home"),
  how: $("screen-how"),
  match: $("screen-match"),
  result: $("screen-result"),
};

function showScreen(name){
  for(const k in Screens){ Screens[k].classList.remove("active"); }
  Screens[name].classList.add("active");
}

const Storage = {
  key: "harmony_v1",
  load(){
    try{
      return JSON.parse(localStorage.getItem(this.key)) || {highScore:0,bestRank:"—"};
    }catch(e){ return {highScore:0,bestRank:"—"}; }
  },
  save(data){
    try{
      localStorage.setItem(this.key, JSON.stringify(data));
    }catch(e){ /* ignore */ }
  }
};

// ====== 世界観データ（軽量） ======
const Fields = [
  { id:"sanctuary", name:"シルバーミスト聖域", bg:"#0d1220", weather:["fog","wind","sun"] },
  { id:"nexart", name:"ネクサート広場", bg:"#12131b", weather:["sun","rain","wind"] },
  { id:"watch", name:"山間の見張り塔", bg:"#0d1018", weather:["wind","sun"] },
  { id:"elf", name:"エルフの木道", bg:"#0e1413", weather:["sun","fog"] },
  { id:"academy", name:"学院講堂", bg:"#13131a", weather:["sun"] },
];

const Weathers = {
  sun:  { id:"sun",  name:"晴れ", speedMul:1.00, visibility:1.0, outputBias:0 },
  fog:  { id:"fog",  name:"霧",   speedMul:1.00, visibility:0.75, outputBias:0 },
  wind: { id:"wind", name:"風",   speedMul:1.10, visibility:1.0, outputBias:0 },
  rain: { id:"rain", name:"雨",   speedMul:0.95, visibility:1.0, outputBias:-0.05 },
};

const Rivals = [
  { id:"soldier", name:"兵士団代表",  rank:"初段",    trait:"威圧ノイズ", noise:2, endAccel:0.00, strict:0, timingBias:0 },
  { id:"mages",   name:"王室魔法団",  rank:"二段",    trait:"終盤加速",   noise:0, endAccel:0.12, strict:0, timingBias:0 },
  { id:"envoy",   name:"王の使い",    rank:"三段",    trait:"採点厳格",   noise:0, endAccel:0.00, strict:1, timingBias:0 },
  { id:"drake",   name:"剣士（門下）",rank:"四段",    trait:"タイミング", noise:0, endAccel:0.00, strict:0, timingBias:0.02 },
  { id:"nestor",  name:"求道者",      rank:"王宮杯",  trait:"風脈同期",   noise:0, endAccel:0.06, strict:0, timingBias:0, windSync:true },
];

// スコア設定
const ScoreCfg = {
  perfect:300, target:120, miss:20,
  outputBonus:80,
  streakStart:3, streakPer:50, streakCap:300,
  winPerTier:200
};

// ====== UI初期化 ======
function initSelectors(){
  const fSel = $("fieldSelect");
  Fields.forEach(f=>{
    const o=document.createElement("option"); o.value=f.id; o.textContent=f.name; fSel.appendChild(o);
  });
  const wSel = $("weatherSelect");
  // 初期は最初のフィールドの天候で埋める
  function updateWeatherOptions(){
    wSel.innerHTML="";
    const f = Fields.find(x=>x.id===fSel.value) || Fields[0];
    f.weather.forEach(w=>{
      const o=document.createElement("option"); o.value=w; o.textContent=Weathers[w].name; wSel.appendChild(o);
    });
  }
  updateWeatherOptions();
  fSel.addEventListener("change", updateWeatherOptions);

  const rSel = $("rivalSelect");
  Rivals.forEach(r=>{
    const o=document.createElement("option"); o.value=r.id; o.textContent=`${r.name}（${r.rank}）`; rSel.appendChild(o);
  });
}
initSelectors();

// ハイスコア表示
(function(){
  const s = Storage.load();
  $("highScore").textContent = s.highScore||0;
  $("bestRank").textContent  = s.bestRank||"—";
})();

$("btnHow").addEventListener("click", ()=>showScreen("how"));
$("btnBackHome").addEventListener("click", ()=>showScreen("home"));

let match = null;

// ====== メーター描画・判定 ======
class Meter {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.w = canvas.width;
    this.h = canvas.height;
    this.reset();
  }
  reset(){
    this.t=0;
    this.pos=0.5; // 0..1
    this.dir=1;   // 1 or -1
    this.speed=0.6; // units per second (ratio of width)
    this.yellow=[0.44,0.56]; // default
    this.green=[0.30,0.70];
    this.outputBand=[0.6,0.7]; // 最適出力帯
    this.noise=0; // px jitter
    this.endAccel=0; // toward end of round
    this.windSync=false;
    this.visibility=1.0;
  }
  setZones(level, rival, weather){
    // 難易度は相手の厳格さで絞る
    const baseYellow = 0.12;
    const baseGreen  = 0.30;
    const y = Math.max(0.06, baseYellow - 0.01*level - (rival.strict?0.03:0));
    const g = Math.max(0.20, baseGreen - 0.02*level - (rival.strict?0.05:0));
    // 中心はランダム（単調回避）
    const c = 0.2 + Math.random()*0.6;
    this.yellow=[c-y/2, c+y/2];
    this.green=[c-g/2, c+g/2];
    // 出力帯は環境に応じて提示（雨は低め、風はやや広がる）
    const bias = weather.outputBias || 0;
    const center = 0.65 + bias;
    const width = 0.10 - (level*0.005) - (rival.strict?0.02:0);
    this.outputBand=[center-width/2, center+width/2];
  }
  update(dt, timeRatio, weather, rival){
    // 速度設定：往復（0..1）
    let v = this.speed * weather.speedMul;
    if (rival.endAccel && timeRatio>0.6) v *= (1 + rival.endAccel*((timeRatio-0.6)/0.4));
    // 風脈同期：sin波で速度ゆらぎ
    if (this.windSync && weather.id==="wind"){
      v *= (1.0 + 0.15*Math.sin((performance.now()/1000)*2.2));
    }
    this.pos += this.dir * v * dt;
    if (this.pos>1){ this.pos=1; this.dir=-1; }
    if (this.pos<0){ this.pos=0; this.dir=1; }
  }
  draw(){
    const ctx=this.ctx, w=this.w, h=this.h;
    ctx.clearRect(0,0,w,h);
    // レール
    ctx.fillStyle="#111829"; ctx.fillRect(12,h/2-10,w-24,20);
    // ゾーン（緑→黄の順、透明度で視認性）
    const vis = Math.max(0.45, this.visibility);
    ctx.globalAlpha = 0.5*vis;
    ctx.fillStyle="#3de0a0"; // green
    ctx.fillRect(12 + (w-24)*this.green[0], h/2-10, (w-24)*(this.green[1]-this.green[0]), 20);
    ctx.globalAlpha = 0.7*vis;
    ctx.fillStyle="#ffd761"; // yellow
    ctx.fillRect(12 + (w-24)*this.yellow[0], h/2-12, (w-24)*(this.yellow[1]-this.yellow[0]), 24);
    ctx.globalAlpha = 1.0;
    // 針
    const jitter = this.noise? (Math.random()*this.noise - this.noise/2):0;
    const x = 12 + (w-24)*this.pos + jitter;
    ctx.fillStyle="#8dd1ff";
    ctx.fillRect(x-4, h/2-22, 8, 44);
  }
  judge(){
    const p=this.pos;
    const inY = (p>=this.yellow[0] && p<=this.yellow[1]);
    const inG = (p>=this.green[0]  && p<=this.green[1]);
    let kind="miss";
    if (inY) kind="perfect";
    else if (inG) kind="target";
    return kind;
  }
  outputOk(value){
    return (value>=this.outputBand[0] && value<=this.outputBand[1]);
  }
}

// ====== 試合 ======
class Match {
  constructor(opts){
    this.field = opts.field;
    this.weather = opts.weather;
    this.rival = opts.rival;
    this.rounds = opts.rounds;
    this.level = opts.level;
    this.canvas = $("meter");
    this.meter = new Meter(this.canvas);
    this.resetState();
  }
  resetState(){
    this.roundNow = 1;
    this.scoreP = 0;
    this.scoreR = 0;
    this.running=false;
    this.streak=0;
  }
  setupRound(){
    const m=this.meter;
    m.reset();
    m.speed = 0.6 + 0.06*(this.level-1);
    m.noise = this.rival.noise || 0;
    m.endAccel = this.rival.endAccel || 0;
    m.windSync = !!this.rival.windSync;
    m.visibility = Weathers[this.weather].visibility;
    m.setZones(this.level, this.rival, Weathers[this.weather]);
    $("outputBand").textContent = `最適出力帯: ${(m.outputBand[0]*100|0)}%〜${(m.outputBand[1]*100|0)}%`;
    $("rankName").textContent = this.rival.rank;
    $("fieldName").textContent = this.field.name;
    $("weatherName").textContent = Weathers[this.weather].name;
    $("roundNow").textContent = this.roundNow;
    $("roundMax").textContent = this.rounds;
    $("scoreP").textContent = this.scoreP;
    $("scoreR").textContent = this.scoreR;
    $("combatLog").textContent = "リズムを感じて…";
    document.body.style.background = this.field.bg;
  }
  start(){
    showScreen("match");
    this.running=true;
    this.setupRound();
    this.loop();
  }
  stop(){ this.running=false; }
  loop(){
    let last=performance.now();
    const step=()=>{
      if(!this.running) return;
      const now=performance.now();
      const dt = Math.min(0.05,(now-last)/1000);
      last=now;
      const timeRatio = ((now-this.roundStartAt)/this.roundDur);
      this.meter.update(dt, timeRatio, Weathers[this.weather], this.rival);
      this.meter.draw();
      if (now>=this.roundEndAt){ // タイムアップ（未入力扱い）
        this.resolve(null);
        return;
      }
      requestAnimationFrame(step);
    };
    this.roundDur = 2200; // 1ラウンドの可動時間（ms）
    this.roundStartAt = performance.now();
    this.roundEndAt = this.roundStartAt + this.roundDur;
    requestAnimationFrame(step);
  }
  tap(){
    if (!this.running) return;
    const kind = this.meter.judge();
    // 出力値は停止時の pos をそのまま使用（0..1）。
    const outOK = this.meter.outputOk(this.meter.pos);
    let add=0, text="";
    if (kind==="perfect"){ add += ScoreCfg.perfect; text="会心の調和！"; this.streak++; }
    else if (kind==="target"){ add += ScoreCfg.target; text="良好な調和"; this.streak=0; }
    else { add += ScoreCfg.miss; text="過不足…"; this.streak=0; }
    if (outOK) add += ScoreCfg.outputBonus;
    // 連調和ボーナス
    if (this.streak>=ScoreCfg.streakStart){
      const bonus = Math.min(ScoreCfg.streakCap, ScoreCfg.streakPer*(this.streak-ScoreCfg.streakStart+1));
      add += bonus;
      text += ` +連調和${bonus}`;
    }
    this.scoreP += add;
    // 相手スコアは難易度換算（簡易）
    const rivalBase = 180 + (this.level*30) + (Math.random()*40-20);
    this.scoreR += Math.max(50, rivalBase);
    $("scoreP").textContent = this.scoreP|0;
    $("scoreR").textContent = this.scoreR|0;
    $("combatLog").textContent = `${text} （+${add|0}）`;
    // 次へ
    this.nextRound();
  }
  resolve(_){
    this.streak=0;
    $("combatLog").textContent = `タイムアップ`;
    // 相手スコア加算のみ
    const rivalBase = 220 + (this.level*35) + (Math.random()*50-25);
    this.scoreR += Math.max(80, rivalBase);
    $("scoreR").textContent = this.scoreR|0;
    this.nextRound();
  }
  nextRound(){
    this.roundNow++;
    if (this.roundNow>this.rounds){
      this.finish();
      return;
    }
    this.setupRound();
    this.loop();
  }
  finish(){
    this.running=false;
    const won = this.scoreP>=this.scoreR;
    const s = Storage.load();
    let hsUpdated="いいえ";
    if (this.scoreP > (s.highScore||0)){
      s.highScore = this.scoreP|0;
      hsUpdated = "はい";
    }
    // 段位記録
    const idx = Rivals.indexOf(this.rival);
    const bestIdx = Rivals.findIndex(r=>r.rank===s.bestRank);
    if (idx>bestIdx) s.bestRank = this.rival.rank;
    Storage.save(s);
    // 結果表示
    $("finalP").textContent = this.scoreP|0;
    $("finalR").textContent = this.scoreR|0;
    $("hsUpdated").textContent = hsUpdated;
    $("resultTitle").textContent = won ? "勝利！" : "敗北…";
    showScreen("result");
  }
}

function getSelections(){
  const field = Fields.find(f=>f.id === $("fieldSelect").value) || Fields[0];
  const weather = $("weatherSelect").value || field.weather[0];
  const rival = Rivals.find(r=>r.id === $("rivalSelect").value) || Rivals[0];
  const rounds = parseInt($("roundsSelect").value,10) || 3;
  return {field, weather, rival, rounds};
}

$("btnStart").addEventListener("click", ()=>{
  const {field, weather, rival, rounds} = getSelections();
  $("highScore").textContent = Storage.load().highScore||0;
  match = new Match({field, weather, rival, rounds, level: Math.max(1, Rivals.indexOf(rival)+1)});
  match.start();
});

$("btnTap").addEventListener("click", ()=>{
  if (match) match.tap();
});
$("btnPause").addEventListener("click", ()=>{
  if (!match) return;
  match.running = !match.running;
  if (match.running) match.loop();
});

$("btnRetry").addEventListener("click", ()=>{
  if (!match) return;
  const {field, weather, rival, rounds} = getSelections();
  match = new Match({field, weather, rival, rounds, level: Math.max(1, Rivals.indexOf(rival)+1)});
  match.start();
});
$("btnHome").addEventListener("click", ()=>{
  const s = Storage.load();
  $("highScore").textContent = s.highScore||0;
  $("bestRank").textContent = s.bestRank||"—";
  showScreen("home");
});

// 初期表示
showScreen("home");
