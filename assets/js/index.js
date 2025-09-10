// index.js — index.html の構造に合わせた非モジュール実装
(function(){
  const $  = (s)=>document.querySelector(s);
  const $$ = (s)=>Array.from(document.querySelectorAll(s));
  const GA = window.GA || { track: ()=>{} };

  // DOM
  const ctaBtn      = $('#ctaGet');
  const resultSec   = $('#result');
  const resultBox   = $('#resultBox') || $('#result');
  const charRoot    = $('#charButtons');
  const charButtons = charRoot ? $$('#charButtons [data-char], #charButtons button') : [];
  const prevBtn     = $('#btnPrevDay');
  const nextBtn     = $('#btnNextDay');
  const todayBtn    = $('#btnToday');
  const calDate     = $('#calDate');
  const calQuote    = $('#calQuote');
  const quoteText   = $('#quoteText');
  const quoteAuthor = $('#quoteAuthor');

  // fortune（任意JSONがあれば使う）
  async function loadFortuneText(){
    try{
      const res = await fetch('./assets/data/fortune_messages.json', { cache: 'no-cache' });
      if(!res.ok) throw new Error('fortune not found');
      const json = await res.json();
      return (json && json.today && json.today.overall) || null;
    }catch{ return null }
  }

  // カレンダー
  let offsetDays = 0; // 0:今日
  const fmtDate = (d)=> `${d.getMonth()+1}月${d.getDate()}日`;
  function setCalendar(){
    const base   = new Date();
    const target = new Date(base.getFullYear(), base.getMonth(), base.getDate()+offsetDays);
    if (calDate) calDate.textContent = fmtDate(target);
  }

  // 名言（世界内）
  function setQuote(){
    const text   = '静かな観察が、次の一手を照らす。';
    const author = '— 銀竜の記録より';
    if (calQuote)    calQuote.textContent = `${text} ${author}`;
    if (quoteText)   quoteText.textContent = text;
    if (quoteAuthor) quoteAuthor.textContent = author;
  }

  // 結果描画
  const esc = (s)=>String(s||'').replace(/[&<>"']/g, m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  function renderResult({ character, message }){
    if (!resultSec || !resultBox) return;
    resultSec.style.display = 'block';
    resultBox.innerHTML = [
      `<h3>${character ? `${esc(character)} からの今日の言葉` : '今日の言葉'}</h3>`,
      `<p>${esc(message)}</p>`,
      `<div class="paywall"><p>9カテゴリの詳細は有料会員限定です。</p></div>`
    ].join('');
  }

  async function handleGetToday(character){
    const text = await loadFortuneText()
      || '最初の一歩を丁寧に確かめれば、道標は自然と見えてきます。';
    renderResult({ character, message: text });
    GA.track('view_today_overall', { page: 'index' });
  }

  // イベント
  ctaBtn?.addEventListener('click', ()=> handleGetToday());

  charButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const name   = btn.getAttribute('data-char') || btn.textContent.trim();
      const archId = btn.getAttribute('data-archid');
      // 保存ポリシー：archetype_id のみ
      if (archId){ try{ localStorage.setItem('archetype_id', String(archId)); }catch{} }
      handleGetToday(name);
    });
  });

  prevBtn?.addEventListener('click', ()=>{ offsetDays -= 1; setCalendar(); GA.track('nav_calendar', {dir:'prev'}); });
  nextBtn?.addEventListener('click', ()=>{ offsetDays += 1; setCalendar(); GA.track('nav_calendar', {dir:'next'}); });
  todayBtn?.addEventListener('click', ()=>{ offsetDays  = 0; setCalendar(); GA.track('nav_calendar', {dir:'today'}); });

  // 初期化
  document.addEventListener('DOMContentLoaded', ()=>{
    setCalendar();
    setQuote();
  });
})();
