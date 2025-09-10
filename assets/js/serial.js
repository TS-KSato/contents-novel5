// serial.js — 連載データを assets/data/ から読み込み（no-cache）
// 注意：ts（世界内日時）は JSON の値をそのまま表示。生成・改変しない。

(() => {
  // ====== 設定（四半期で差し替え）======
  const DATA_FILE = "./assets/data/serial_2025q3.json"; // 例：次期は serial_2025q4.json に変更

  // ====== 参照 ======
  const $list  = document.getElementById("serial-list"); // 一覧の親（<div id="serial-list">）
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

  // ====== 描画 ======
  function itemHTML(e){
    const title = esc(e.title || "");
    const preview = Array.isArray(e.body) ? esc(e.body[0] || "") : "";
    const by = esc(e.author || e.by || "語り部");
    const ts = esc(e.ts || ""); // そのまま表示
    const icon = esc(e.icon || ""); // 任意（無い場合は頭文字）
    const who  = esc(e.who  || by);

    return `
<article class="card">
  <div class="article-head">
    <div class="avatar-serial" data-name="${who}" ${icon ? `style="background-image:url('${icon}')"` : ""}></div>
    <div class="byline">
      <span class="badge">連載</span>
      <span class="pill">${who}</span>
      <span class="meta">${ts}</span>
    </div>
  </div>
  <div class="title">${title}</div>
  ${preview ? `<p class="lead">${preview}</p>` : ""}
  <div class="sep"></div>
  <div class="body">
    ${(Array.isArray(e.body) ? e.body.map(p=>`<p>${esc(p)}</p>`).join("") : "")}
  </div>
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
      const icon = ""; // e.icon を使いたい場合は dataset に埋め込んで取得してもOK
      applyAvatar(el, name, icon);
    });

    try { window.gtagEvent && window.gtagEvent("view_serial", { count: ENTRIES.length }); } catch(_){}
  }

  // ====== 起動 ======
  document.addEventListener("DOMContentLoaded", () => {
    loadJSON(DATA_FILE)
      .then(json => {
        const arr = Array.isArray(json?.entries) ? json.entries : [];
        ENTRIES = arr.map(e => ({
          id: String(e.id || ""),
          ts: String(e.ts || ""),            // そのまま表示
          title: String(e.title || ""),
          body: Array.isArray(e.body) ? e.body.map(String) : [],
          author: String(e.author || ""),
          who: String(e.who || ""),          // 任意：表示名
          icon: String(e.icon || "")         // 任意：著者アイコン
        }));
        // メタ表示（任意）
        if ($head && json?.meta){
          const period = esc(String(json.meta.period || ""));
          $head.innerHTML = period ? `<div class="meta">収録期間：${period}</div>` : "";
        }
        render();
      })
      .catch(()=>{
        $list && ($list.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`);
      });
  });
})();
