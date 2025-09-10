// novel.js — assets/data/novel.json を読み込み（no-cache）
// 期待JSON: [{ id, title, author, sections[] }]

(() => {
  const FILE = "./assets/data/novel.json";

  // 既存DOM（あれば活用）
  const $list   = document.getElementById("novel-list");   // 一覧表示用 <div id="novel-list">
  const $title  = document.getElementById("novel-title");  // 単品表示タイトル
  const $author = document.getElementById("novel-author"); // 単品表示著者
  const $body   = document.getElementById("novel-body");   // 単品本文の親
  const $root   = document.getElementById("novel");        // 全体ラッパ（無ければ body に描画）

  // 進捗UI（任意・存在すれば更新）
  const $progressBar = document.querySelector(".progress-top .bar");
  const $resumeBtn   = document.querySelector(".resume-btn");

  let ALL = [];

  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  function loadJSON(url){
    return fetch(url, { cache: "no-cache" }).then(r => {
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  function getId(){
    const p = new URLSearchParams(location.search);
    return p.get("id");
  }

  function drawList(){
    const host = $list || $root || document.body;
    if (!ALL.length){
      host.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      return;
    }
    host.innerHTML = `
<div class="grid">
  ${ALL.map(n => `
  <article class="card">
    <div class="label">短編</div>
    <div class="title">${esc(n.title)}</div>
    <div class="meta">${esc(n.author || "語り部")}</div>
    <div class="actions" style="margin-top:.5rem">
      <a class="btn" href="?id=${encodeURIComponent(n.id)}">読む</a>
      <a class="btn ghost" href="#list">あとで</a>
    </div>
  </article>`).join("")}
</div>`;
  }

  function drawOne(novel){
    // 既存要素があればそこに、無ければ自前で
    if ($title)  $title.textContent  = novel.title || "";
    if ($author) $author.textContent = novel.author || "語り部";

    const paragraphs = Array.isArray(novel.sections) ? novel.sections.map(String) : [];

    if ($body){
      $body.innerHTML = paragraphs.map(p => `<p>${esc(p)}</p>`).join("");
    } else {
      const host = $root || document.body;
      host.innerHTML = `
<article class="card">
  <div class="article-head">
    <div class="avatar-serial" data-name="${esc(novel.author || "語り部")}"></div>
    <div class="byline"><span class="pill">${esc(novel.author || "語り部")}</span></div>
  </div>
  <div class="title">${esc(novel.title || "")}</div>
  <div class="sep"></div>
  <div class="body">
    ${paragraphs.map(p => `<p>${esc(p)}</p>`).join("")}
  </div>
</article>`;
    }

    // 進捗バー（任意）
    if ($progressBar || $resumeBtn){
      const onScroll = () => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        const h = (document.documentElement.scrollHeight - window.innerHeight) || 1;
        const p = Math.max(0, Math.min(1, y / h));
        if ($progressBar) $progressBar.style.width = `${p * 100}%`;
        if ($resumeBtn) $resumeBtn.style.display = y > 800 ? "inline-flex" : "none";
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      $resumeBtn && $resumeBtn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
    }

    // GA4（任意）
    try{ window.gtagEvent && window.gtagEvent("view_novel", { id: novel.id || "" }); }catch(_){}
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadJSON(FILE)
      .then(json => {
        ALL = Array.isArray(json) ? json.map(n => ({
          id: String(n.id || ""),
          title: String(n.title || ""),
          author: String(n.author || "語り部"),
          sections: Array.isArray(n.sections) ? n.sections.map(String) : []
        })) : [];

        const id = getId();
        if (id){
          const novel = ALL.find(n => n.id === id);
          if (novel) drawOne(novel);
          else drawList();
        } else {
          drawList();
        }
      })
      .catch(() => {
        const host = $list || $root || document.body;
        host.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      });
  });
})();
