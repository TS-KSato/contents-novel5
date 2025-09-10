// zodiac.js — 星座データ・描画・フィルタ・FAB・ボトムナビ
const ZODIACS = [
  { id:"aries", 記号:"⟡", 星座:"牡羊座", 性質:"挑戦型", 領域:"人の世界", 役割:"開拓者", 親和元素:"炎", 守護存在:"銀竜",
    ロア:"額角の尖光のごとく始まりを告げる。ためらいを裂き、停滞を切り開く。",
    診断:"属性は火。性格は先駆的で一直線、思い立ったら素早く動ける行動派です。周囲を鼓舞する熱量が強みですが、拙速や衝動が雑さを生むことも。使命は「最初の一歩を示すこと」。小さくても成果の実感をこまめに積み、勢いを制御しながらチームの起点をつくると成功が加速します。" },
  { id:"taurus", 記号:"⟐", 星座:"牡牛座", 性質:"秩序型", 領域:"自然の世界", 役割:"守り手", 親和元素:"土", 守護存在:"人間",
    ロア:"踏み固めた轍は道となる。蓄えを耕し、実りの季を揺るがせない。",
    診断:"属性は土。性格は安定志向で粘り強く、五感に根ざした現実感覚が武器。暮らしや資源を豊かに整える力に長けます。一方、慣れが頑固さや停滞の原因に。使命は「価値を耕し守ること」。自分のペースを尊重しつつ、節目の柔軟な舵切りを覚えるほど、蓄積が資産へと育ちます。" },
  { id:"gemini", 記号:"⋇", 星座:"双子座", 性質:"洞察型", 領域:"人の世界", 役割:"開拓者", 親和元素:"風", 守護存在:"妖精",
    ロア:"二つの声は風に乗る。離れても呼応し、遠きをひとつに結ぶ。",
    診断:"属性は風。性格は好奇心旺盛で軽やか、情報を結び直すのが得意です。発想の切り替えが速く、言葉とネットワークで流れをつくれる人。散漫や浅読みになりやすい点に注意。使命は「知を循環させること」。要点を束ね共有し、役割を俊敏にシフトするほど、影響力が自然に増えます。" },
  { id:"cancer", 記号:"☽", 星座:"蟹座", 性質:"共感型", 領域:"心の世界", 役割:"守り手", 親和元素:"水", 守護存在:"妖精",
    ロア:"潮が抱く揺籃。傷を覆い、静かな祈りで夜を渡らせる。",
    診断:"属性は水。性格は包容力があり、内側を整える守り手者。感情の機微に敏感で、安心して戻れる“基地”をつくれます。守りに偏ると殻に籠りがち。使命は「人と場を育むこと」。健やかな境界線を学び、必要なときに外へ一歩出る勇気を持つほど、あなたの優しさが循環を生みます。" },
  { id:"leo", 記号:"✹", 星座:"獅子座", 性質:"挑戦型", 領域:"人の世界", 役割:"開拓者", 親和元素:"炎", 守護存在:"銀竜",
    ロア:"焔は冠、誇りは旗。中心に立ち、光を分かつ。",
    診断:"属性は火。性格は堂々とした創造者で、自己表現で周囲を照らす中心軸。称賛より自分の掲げる旗が原動力です。独善や過剰演出には注意。使命は「物語の主役を生き、光を分け合うこと」。観客ではなく仲間を増やし、役割を委ねるほど作品と影響力が大きく育っていきます。" },
  { id:"virgo", 記号:"✶", 星座:"乙女座", 性質:"秩序型", 領域:"知の世界", 役割:"守り手", 親和元素:"土", 守護存在:"人間",
    ロア:"穂は数えられ、頁は整う。細部の調律が全体を静かに正す。",
    診断:"属性は土。性格は精緻で実務的、秩序立てて最適化する調律者。弱点の補修や品質向上が得意です。完璧主義は疲労と停滞のもと。使命は「小さな改善で全体を正すこと」。基準を“現実的な最善”に置き、区切りを設けて成果を外に渡すほど、信頼と評価が着実に育ちます。" },
  { id:"libra", 記号:"⚖", 星座:"天秤座", 性質:"洞察型", 領域:"人の世界", 役割:"守り手", 親和元素:"風", 守護存在:"人間",
    ロア:"片羽が沈めば、もう片羽が上がる。均衡の中点に留まる術を知る。",
    診断:"属性は風。性格は対話的で調和志向、異なる立場の中点を見つける調停者。美意識と公正感覚が場の質を支えます。迎合や優柔不断には注意。使命は「良い関係の設計」。原則を明文化し、合意形成のプロセスを整えるほど、争点は澄み、信頼のネットワークが広がります。" },
  { id:"scorpio", 記号:"⟀", 星座:"蠍座", 性質:"共感型", 領域:"心の世界", 役割:"開拓者", 親和元素:"水", 守護存在:"銀竜",
    ロア:"深針は誓いを貫く。静かな熱が運命の布を結び替える。",
    診断:"属性は水。性格は深く静かで、一点へ潜る集中力が武器。信義を重んじ、長い時間軸で変容を起こします。執着や秘密主義は孤立の種に。使命は「本質を貫き再生を導くこと」。信頼できる少数と深く連携し、節目で“手放す”選択を持つほど、飛躍の余白が生まれます。" },
  { id:"sagittarius", 記号:"➹", 星座:"射手座", 性質:"洞察型", 領域:"自然の世界", 役割:"開拓者", 親和元素:"炎", 守護存在:"人間",
    ロア:"遠矢は地平を越える。答えは遠く、歩は軽い。",
    診断:"属性は火。性格は自由で楽観的、遠い可能性へと矢を放つ探求者。枠を越える旅が知恵を運びます。粗さや飽きっぽさには注意。使命は「意味を見つけ共有すること」。仮説→検証→物語化の循環を回し、経験を学びへ翻訳するほど、人を動かす力に変わります。" },
  { id:"capricorn", 記号:"⟑", 星座:"山羊座", 性質:"秩序型", 領域:"人の世界", 役割:"開拓者", 親和元素:"土", 守護存在:"人間",
    ロア:"古塔の段を一歩ずつ。責務を背に、頂へ至る蹄音は確か。",
    診断:"属性は土。性格は責任感が強く、目標へ粘り強く登る実務派リーダー。制度・構造を作り、持続可能性を確立します。過重や硬直に注意。使命は「仕組みで成果を残すこと」。任せ方と休み方を設計し、長期視点のロードマップで着実に峰へ。信頼はあなたの最大資本です。" },
  { id:"aquarius", 記号:"⌇", 星座:"水瓶座", 性質:"洞察型", 領域:"知の世界", 役割:"守り手", 親和元素:"風", 守護存在:"妖精",
    ロア:"星水を分かち合う器。常の形を替え、新しき流れを注ぐ。",
    診断:"属性は風。性格は独創的でフラット、常識を再設計する改革者。テクノロジーと共同体への感度が高い。孤高や理屈先行に注意。使命は「次の当たり前を作ること」。オープンな仕組みと参加のルールを整えるほど、変化が広がり、個の発明が社会の基盤へ繋がります。" },
  { id:"pisces", 記号:"Ͽ", 星座:"魚座", 性質:"共感型", 領域:"自然の世界", 役割:"守り手", 親和元素:"水", 守護存在:"妖精",
    ロア:"夢と現の境を泳ぐ歌い手。やわらかな共鳴が固きをほどく。",
    診断:"属性は水。性格は共感的で境界が柔らかく、芸術的・霊的領域に強み。癒やしと受容で固さをほどきます。曖昧さや依存には注意。使命は「つながりを癒やし、想像力で橋を架けること」。休息と自己境界を意識するほど、優しさが持続し、創造性も澄んでいきます。" }
];

const grid = document.getElementById('grid');
const fP = document.getElementById('fPillar');
const fR = document.getElementById('fRealm');
const fO = document.getElementById('fRole');
const fK = document.getElementById('fKin');
const btnReset = document.getElementById('reset');
const fab = document.getElementById('toTop');

function cardHTML(z){
  return `
<article id="${z.id}" class="card" tabindex="0" aria-label="${z.星座}の記述">
  <div class="z-head">
    <div class="z-rune" aria-hidden="true">${z.記号}</div>
    <div class="z-name">${z.星座}</div>
    <span class="spacer"></span>
    <span class="element-badge" title="親和元素">${z.親和元素}</span>
  </div>
  <div class="lore">${z.ロア}</div>
  <p class="diagnosis">${z.診断}</p>
  <details class="meta">
    <summary>詳しい属性を見る</summary>
    <div class="pairs">
      <span class="badge" title="性質">性質：${z.性質}</span>
      <span class="badge" title="領域">領域：${z.領域}</span>
      <span class="badge" title="役割">役割：${z.役割}</span>
      <span class="badge" title="守護存在">守護存在：${z.守護存在}</span>
    </div>
  </details>
</article>`;
}
function matchFilter(z){
  if (fP?.value && z.性質 !== fP.value) return false;
  if (fR?.value && z.領域 !== fR.value) return false;
  if (fO?.value && z.役割 !== fO.value) return false;
  if (fK?.value && z.守護存在 !== fK.value) return false;
  return true;
}
function render(){
  const items = ZODIACS.filter(matchFilter).map(cardHTML).join('');
  grid.innerHTML = items || `<div class="lead" style="text-align:center">該当する星座がありません。</div>`;
}
[fP,fR,fO,fK].forEach(el=> el?.addEventListener('change', render));
btnReset?.addEventListener('click', ()=>{ fP.value=""; fR.value=""; fO.value=""; fK.value=""; render(); });

const showFabAt = 360;
function onScroll(){ fab.setAttribute('aria-hidden', (window.scrollY > showFabAt) ? 'false' : 'true'); }
fab.addEventListener('click', ()=> window.scrollTo({ top:0, behavior:'smooth' }));
window.addEventListener('scroll', onScroll, { passive:true });

(function markBottomNav(){
  const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.bottom-nav a.bn-btn').forEach(a=>{
    const href=(a.getAttribute('href')||'').toLowerCase();
    if (href.endsWith(file)){ a.classList.add('bn-accent'); a.setAttribute('aria-current','page'); }
    a.addEventListener('click', ()=>{ try{ window.gtag && gtag('event','nav_click',{ name:a.dataset.evt }); }catch(e){} });
  });
  const nav = document.querySelector('.bottom-nav');
  const setH = ()=> document.documentElement.style.setProperty('--bn-h', (nav?.offsetHeight||56) + 'px');
  window.addEventListener('load', setH, { once:true }); window.addEventListener('resize', setH); setH();
})();

render(); onScroll();
