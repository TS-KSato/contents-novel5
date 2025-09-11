// serial.js — 連載データを assets/data/ から読み込み（no-cache）
// 注意：ts（世界内日時）は JSON の値をそのまま表示。生成・改変しない。

(() => {
  // ====== 設定（四半期で差し替え）======
  // Q3は7-9月なので、articles_007.json, articles_008.json, articles_009.json を使用
  const DATA_FILES = [
    "./assets/data/articles_007.json",
    "./assets/data/articles_008.json", 
    "./assets/data/articles_009.json"
  ];

  // ====== 参照 ======
  const $list  = document.getElementById("articles"); // 一覧の親（<div id="articles">）
  const $head  = document.getElementById("serial-head"); // ヘッダーやメタ表示（任意）
  let ENTRIES = [];

  // ====== utils ======
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  function loadJSON(url){
    return fetch(url, { cache: "no-cache" }).then(r => {
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  // アバター適用（AKがあればAKに任せる／なければ簡易）
  function applyAvatar(el, name, icon){
    if (!el) return;
    if (window.AK && typeof window.AK.applyAvatar === "function" && name){
      return window.AK.applyAvatar(el, name);
    }
    if (icon) {
      el.style.backgroundImage = `url("${icon}")`;
      el.textContent = "";
      el.classList.remove("fallback");
    } else {
      el.style.backgroundImage = "none";
      el.textContent = (String(name||"?").trim() || "?").slice(0,1);
      el.classList.add("fallback");
    }
  }

  // 既存のarticlesファイル形式を新形式に変換
  function convertArticleData(articleData) {
    const entries = [];
    
    if (articleData.語り巻 && Array.isArray(articleData.語り巻)) {
      articleData.語り巻.forEach((article, index) => {
        const entry = {
          id: `${articleData.月度}_${index + 1}`,
          ts: articleData.月度 || "",
          title: article.題名 || "",
          body: Array.isArray(article.body) ? article.body : [article.lead || ""],
          author: article.語り手 || "",
          who: article.語り手 || "",
          role: article.語り手の肩書 || "",
          lead: article.lead || "",
          tags: Array.isArray(article.tags) ? article.tags : [],
          free_paragraphs: article.free_paragraphs || 0
        };
        entries.push(entry);
      });
    }
    
    return entries;
  }

  // ====== 描画 ======
  function itemHTML(e){
    const title = esc(e.title || "");
    const lead = esc(e.lead || "");
    const preview = lead || (Array.isArray(e.body) ? esc(e.body[0] || "") : "");
    const by = esc(e.author || e.by || "語り部");
    const role = esc(e.role || "");
    const ts = esc(e.ts || "");
    const icon = esc(e.icon || "");
    const who = esc(e.who || by);
    const tags = Array.isArray(e.tags) ? e.tags.map(tag => `<span class="pill">${esc(tag)}</span>`).join("") : "";

    return `
<article class="card">
  <div class="article-head">
    <div class="avatar-serial" data-name="${who}" ${icon ? `style="background-image:url('${icon}')"` : ""}></div>
    <div class="byline">
      <span class="badge">語り巻</span>
      <span class="pill">${who}</span>
      ${role ? `<span class="meta">${role}</span>` : ""}
    </div>
  </div>
  <div class="title">${title}</div>
  ${preview ? `<p class="lead">${preview}</p>` : ""}
  <div class="sep"></div>
  <div class="body">
    ${(Array.isArray(e.body) ? e.body.map(p=>`<p>${esc(p)}</p>`).join("") : "")}
  </div>
  ${tags ? `<div style="margin-top:0.75rem;">${tags}</div>` : ""}
</article>`;
  }

  function render(){
    if (!Array.isArray(ENTRIES) || !ENTRIES.length){
      $list && ($list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`);
      return;
    }
    $list.innerHTML = ENTRIES.map(itemHTML).join("");

    // avatar適用
    $list.querySelectorAll(".avatar-serial").forEach(el=>{
      const name = el.getAttribute("data-name");
      const icon = "";
      applyAvatar(el, name, icon);
    });

    try { window.gtagEvent && window.gtagEvent("view_serial", { count: ENTRIES.length }); } catch(_){}
  }

  // ====== 起動 ======
  document.addEventListener("DOMContentLoaded", () => {
    // 複数のarticlesファイルを並行して読み込み
    Promise.all(DATA_FILES.map(file => 
      loadJSON(file).catch(err => {
        console.warn(`Failed to load ${file}:`, err);
        return null;
      })
    ))
    .then(results => {
      const allEntries = [];
      
      results.forEach(data => {
        if (data) {
          const entries = convertArticleData(data);
          allEntries.push(...entries);
        }
      });
      
      ENTRIES = allEntries;
      
      // メタ表示（任意）
      if ($head) {
        $head.innerHTML = `<div class="meta">収録期間：第7月〜第9月（2025年第3四半期）</div>`;
      }
      
      render();
    })
    .catch(err => {
      console.error("Failed to load articles:", err);
      $list && ($list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`);
    });
  });
})();