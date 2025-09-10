// recipe.js — assets/data/recipe.json を読み込み（no-cache）
// 想定JSON: [{ id, title, hero, tags[], time_min, servings, ingredients[{name,qty}], steps[], note }]

(() => {
  const FILE = "./assets/data/recipe.json";

  // 既存HTMLの要素があれば使う（無ければ自前で一覧描画）
  const $list   = document.getElementById("recipe-list");     // 一覧用 <div id="recipe-list">
  const $title  = document.getElementById("recipe-title");    // 単品表示用 タイトル
  const $hero   = document.getElementById("recipe-hero");     // 単品表示用 .dish-hero .media (div/img)
  const $desc   = document.getElementById("recipe-desc");     // 単品表示用 説明
  const $facts  = document.getElementById("recipe-facts");    // 所要/人数などのコンテナ
  const $tags   = document.getElementById("recipe-tags");     // タグのコンテナ
  const $ings   = document.getElementById("recipe-ingredients"); // <div id="recipe-ingredients">
  const $steps  = document.getElementById("recipe-steps");    // <div id="recipe-steps">
  const $note   = document.getElementById("recipe-note");     // 備考
  const $gallery= document.getElementById("recipe-gallery");  // 任意ギャラリー
  const $root   = document.getElementById("recipe");          // ページ全体の親（任意）

  let ALL = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  function loadJSON(url){
    return fetch(url, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  function normalize(r){
    return {
      id: String(r.id || ""),
      title: String(r.title || ""),
      hero: String(r.hero || ""),
      desc: String(r.desc || r.description || ""),
      tags: Array.isArray(r.tags) ? r.tags.map(x=>String(x)) : [],
      time_min: Number.isFinite(r.time_min) ? r.time_min : null,
      servings: Number.isFinite(r.servings) ? r.servings : null,
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(i => ({
        name: String(i.name || ""),
        qty:  String(i.qty  || "")
      })) : [],
      steps: Array.isArray(r.steps) ? r.steps.map(s => String(s)) : [],
      note: String(r.note || ""),
      gallery: Array.isArray(r.gallery) ? r.gallery.map(p => String(p)) : []
    };
  }

  function fact(label, val){
    if (val === null || val === undefined || val === "") return "";
    return `<span class="fact"><span>${esc(label)}</span><strong>${esc(String(val))}</strong></span>`;
  }

  function renderList(){
    if (!$list) return false;
    if (!ALL.length){
      $list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      return true;
    }
    $list.innerHTML = ALL.map(r => `
<article class="card recipe">
  <div class="thumb" style="${r.hero ? `background-image:url('${esc(r.hero)}')` : ""}">${r.hero?"":"🍽"}</div>
  <div class="meta">
    <div class="title">${esc(r.title)}</div>
    <div class="sub">${esc(r.desc || "")}</div>
    <div class="tags">
      ${r.tags.slice(0,3).map(t => `<span class="pill">${esc(t)}</span>`).join("")}
    </div>
  </div>
  <div class="go"><a class="btn" href="?id=${encodeURIComponent(r.id)}">開く</a></div>
</article>`).join("");
    return true;
  }

  function drawOne(r){
    // タイトル
    if ($title) $title.textContent = r.title || "";

    // ヒーロー
    if ($hero){
      if ($hero.tagName === "IMG"){
        $hero.src = r.hero || "";
        $hero.alt = r.title || "料理画像";
      } else {
        $hero.style.backgroundImage = r.hero ? `url("${r.hero}")` : "none";
      }
    }

    // 説明
    if ($desc) $desc.textContent = r.desc || "";

    // タグ
    if ($tags){
      $tags.innerHTML = r.tags.map(t => `<span class="pill">${esc(t)}</span>`).join("");
    }

    // ファクト
    if ($facts){
      $facts.innerHTML =
        fact("所要", r.time_min ? `${r.time_min}分` : "") +
        fact("人数", r.servings ? `${r.servings}人` : "");
    }

    // 材料
    if ($ings){
      if (!r.ingredients.length){
        $ings.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      } else {
        $ings.innerHTML = r.ingredients.map(i => `
<div class="row">
  <div class="name">${esc(i.name)}</div>
  <div class="qty">${esc(i.qty)}</div>
</div>`).join("");
      }
    }

    // 手順
    if ($steps){
      if (!r.steps.length){
        $steps.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      } else {
        $steps.innerHTML = r.steps.map(s => `<div class="step"><p>${esc(s)}</p></div>`).join("");
      }
    }

    // 備考
    if ($note){
      $note.textContent = r.note || "";
      $note.style.display = r.note ? "" : "none";
    }

    // ギャラリー
    if ($gallery){
      if (!r.gallery.length){
        $gallery.innerHTML = "";
        $gallery.style.display = "none";
      } else {
        $gallery.style.display = "";
        $gallery.innerHTML = r.gallery.map(p => `<div class="shot" style="background-image:url('${esc(p)}')"></div>`).join("");
      }
    }
  }

  function getIdFromQuery(){
    const p = new URLSearchParams(location.search);
    return p.get("id");
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadJSON(FILE)
      .then(json => {
        ALL = Array.isArray(json) ? json.map(normalize) : [];
        // 一覧 or 単品
        const id = getIdFromQuery();
        if (id){
          const r = ALL.find(x => x.id === id);
          if (r) {
            drawOne(r);
          } else {
            // 見つからなければ一覧にフォールバック
            if (!renderList() && $root){
              $root.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
            }
          }
        } else {
          if (!renderList() && $root){
            // 一覧用コンテナが無いページは、簡易一覧を自前で出す
            $root.innerHTML = `
<div class="recipes">
  ${ALL.map(r => `
  <article class="card recipe">
    <div class="thumb" style="${r.hero ? `background-image:url('${esc(r.hero)}')` : ""}">${r.hero?"":"🍽"}</div>
    <div class="meta">
      <div class="title">${esc(r.title)}</div>
      <div class="sub">${esc(r.desc || "")}</div>
      <div class="tags">${r.tags.slice(0,3).map(t => `<span class="pill">${esc(t)}</span>`).join("")}</div>
    </div>
    <div class="go"><a class="btn" href="?id=${encodeURIComponent(r.id)}">開く</a></div>
  </article>`).join("")}
</div>`;
          }
        }
      })
      .catch(() => {
        if ($list) $list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
        if ($root && !$list) $root.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      });
  });
})();
