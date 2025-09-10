// dragon-table.js — 竜の食卓（一覧 & 各キャラ）
// 依存: core.js の esc, Avatar, nav.js(任意)
import { esc, Avatar } from "/assets/js/core.js";

const JSON_PATH = "./recipe.json";

/* ===== 共通ヘルパ ===== */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>[...r.querySelectorAll(s)];
const hashStr = (s)=>{ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; };
const mulberry32 = (a)=>()=>((a+=0x6D2B79F5, a=Math.imul(a^(a>>>15),a|1), a^=a+Math.imul(a^(a>>>7),61), (a^=a>>>14)>>>0)/4294967296);
const todaySeed = ()=>{ const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const pickOneDet = (arr, seedStr)=>{ if(!arr.length) return null; const rng=mulberry32(hashStr(seedStr)); return arr[Math.floor(rng()*arr.length)]; };

/** core.js の Avatar.render() を文字列にする薄いラッパ */
function avatarHTML(name, avatarUrl){
  const wrap = document.createElement('span');
  wrap.className = "avatar-wrap";
  wrap.appendChild(Avatar.render({ name, art: avatarUrl, initials: (name||"食").slice(0,2) || "食" }));
  return wrap.innerHTML; // <img> or fallback div
}

/* ===== 一覧ページ（今日の一品 & キャラ導線） ===== */
function renderToday(dish){
  const host = $("#todayDish");
  if (!host) return;
  if (!dish){
    host.innerHTML = `<div class="meta">料理が見つかりませんでした。後ほど再度お試しください。</div>`;
    return;
  }
  const av = avatarHTML(dish.character, dish.avatar);
  host.innerHTML = `
    <div class="article-head">
      ${av}
      <div>
        <div class="title">${esc(dish.title)}</div>
        <div class="meta">${esc(dish.real_name||"")}${dish.character ? ` / 語り手：${esc(dish.character)}` : ""}</div>
      </div>
    </div>
    ${dish.intro ? `<p class="lead">${esc(dish.intro)}</p>` : ""}
    <div class="sep"></div>
    <div class="body">
      <h3 style="margin:.25rem 0 .25rem;font-size:1rem">材料</h3>
      <ul style="margin:.25rem 0 .5rem;padding-left:1.25rem">
        ${(dish.ingredients||[]).map(i=>`<li>${esc(i)}</li>`).join("")}
      </ul>
      <h3 style="margin:.25rem 0 .25rem;font-size:1rem">作り方</h3>
      <ol style="margin:.25rem 0 .5rem;padding-left:1.25rem">
        ${(dish.steps||[]).map(s=>`<li>${esc(s)}</li>`).join("")}
      </ol>
    </div>
    ${dish.comment ? `<div class="sep"></div><p class="meta">${esc(dish.comment)}</p>` : ""}
  `;
}

const CHAR_ORDER = ["アラン","ドレイク","ライラ","ネスター"];
const CHAR_LINK = {
  "アラン":"./dragon-table-alan.html",
  "ドレイク":"./dragon-table-drake.html",
  "ライラ":"./dragon-table-laila.html",
  "ネスター":"./dragon-table-nester.html"
};
function renderCharLinks(recipes){
  const host = $("#charLinks"); if (!host) return;
  const byChar = {};
  recipes.forEach(r=>{ const c=r.character||"その他"; (byChar[c] ||= []).push(r); });

  host.innerHTML = CHAR_ORDER.map(c=>{
    const arr = byChar[c] || [];
    const rep = arr.find(x=>x.avatar) || {};
    const av = avatarHTML(c, rep.avatar);
    const preview = arr.slice(0,2).map(x=>x.title).join("・");
    const link = CHAR_LINK[c] || "#";
    return `
      <a class="item" href="${esc(link)}" aria-label="${esc(c)}の食卓へ">
        ${av}
        <div>
          <div class="name">${esc(c)}の食卓</div>
          <div class="sub">${arr.length}品 / ${esc(preview || "準備中")}</div>
        </div>
        <span class="pill">見る →</span>
      </a>`;
  }).join("");
}

/* ===== キャラページ（レシピ一覧） ===== */
function clip(t,n){ if(!t) return ""; const s=String(t); return s.length>n ? s.slice(0,n-1)+"…" : s; }
function renderList(items){
  const listEl = $("#list"); if (!listEl) return;
  if(!items.length){
    listEl.innerHTML = '<div class="sub">レシピは準備中です。recipe.json をご確認ください。</div>';
    return;
  }
  listEl.innerHTML = items.map(r=>{
    const av = avatarHTML(r.character, r.avatar);
    const id = r.id != null ? String(r.id) : String(Math.abs(hashStr(r.title||"")));
    return `
      <a class="item" role="listitem" href="./recipe.html?id=${encodeURIComponent(id)}" aria-label="${esc(r.title)}の詳細へ">
        ${av}
        <div>
          <div class="name">${esc(r.title)}</div>
          <div class="sub">${esc(clip(r.intro || r.comment || "", 46))}</div>
        </div>
        <span class="pill">詳しく →</span>
      </a>`;
  }).join("");
}

/* ===== 起動 ===== */
(async function init(){
  try{
    const res = await fetch(JSON_PATH, {cache:"no-cache"});
    if(!res.ok) throw new Error("fetch failed");
    const data = await res.json();
    const recipes = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
    if (!recipes.length) throw new Error("no recipes");

    // body data-* でモード判定
    const mode = document.body.getAttribute('data-mode');         // "index" | "char"
    const character = document.body.getAttribute('data-character'); // 例: "アラン"

    if (mode === "index"){
      // 今日の一品
      renderToday(pickOneDet(recipes, "food|"+todaySeed()));
      // キャラ別導線
      renderCharLinks(recipes);
    } else if (mode === "char"){
      const list = recipes
        .filter(r => (r.character||"") === character)
        .sort((a,b)=> (a.title||"").localeCompare(b.title||"", 'ja'));
      renderList(list);
    }
  }catch(e){
    console.warn("recipe.json 読み込み失敗:", e);
    $("#todayDish") && ($("#todayDish").innerHTML = `<div class="meta">レシピの読み込みに失敗しました。recipe.json をご確認ください。</div>`);
    $("#charLinks") &
