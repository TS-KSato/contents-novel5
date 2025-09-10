// index.html の構造に合わせた非モジュール実装
(function(){
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>Array.from(document.querySelectorAll(s));
const GA = window.GA || { track: ()=>{} };


// DOM 取得
const ctaBtn = $('#ctaGet');
const resultSection = $('#result');
const resultBox = $('#resultBox') || $('#result'); // resultBox が無ければ result を使用
const charRoot = $('#charButtons');
const charButtons = charRoot ? $$('#charButtons [data-char], #charButtons button') : [];
const prevBtn = $('#btnPrevDay');
const nextBtn = $('#btnNextDay');
const calDate = $('#calDate');
const calQuote = $('#calQuote'); // 単一要素版
const quoteText = $('#quoteText'); // 分割版（存在しない可）
const quoteAuthor = $('#quoteAuthor');


// オプション: fortune JSON があれば使う（無ければデフォルト文言）
async function loadFortuneText(){
try{
const res = await fetch('./assets/data/fortune_messages.json', { cache: 'no-cache' });
if(!res.ok) throw new Error('fortune not found');
const json = await res.json();
return (json && json.today && json.today.overall) || null;
}catch{ return null }
}


// カレンダー日付の状態
let offsetDays = 0; // 0=今日、-1=昨日、+1=明日...
function fmtDate(d){ return `${d.getMonth()+1}月${d.getDate()}日`; }
function setCalendar(){
const base = new Date();
const target = new Date(base.getFullYear(), base.getMonth(), base.getDate()+offsetDays);
if(calDate) calDate.textContent = fmtDate(target);
}


function setQuote(){
// デフォルト名言（世界内語彙）
const text = '静かな観察が、次の一手を照らす。';
const author = '— 銀竜の記録より';
if(calQuote) calQuote.textContent = `${text} ${author}`;
if(quoteText) quoteText.textContent = text;
if(quoteAuthor) quoteAuthor.textContent = author;
}
})();