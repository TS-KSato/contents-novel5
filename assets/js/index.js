// index.js — Todayページ用：fortune_messages.json / archetype_fortune.json を assets/data/ から取得（no-cache）
// 仕様: 「無料＝総合のみ」表示。9カテゴリは有料誘導の文面だけを出す。

(() => {
  // ==== DOM参照（存在しない場合はスキップ処理で安全に） ====
  const $overallTitle = document.getElementById("today-title");    // 総合タイトル（例: <div id="today-title">）
  const $overallMsg   = document.getElementById("today-message");  // 総合本文（例: <p id="today-message">）
  const $scoreVal     = document.getElementById("today-score");    // スコア等（任意）
  const $payLead      = document.getElementById("pay-lead");       // 有料誘導文
  const $payActions   = document.getElementById("pay-actions");    // ボタン群
  const $castGrid     = document.getElementById("cast-grid");      // キャラ一覧（任意：<div id="cast-grid">）
  const $calendar     = document.getElementById("history-grid");   // 履歴カレンダー（任意）

  // ==== util ====
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  const fetchJSON = (url) => fetch(url, { cache: "no-cache" }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  // 単一責務：アバター適用（AKがあれば利用、なければ簡易）
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

  // ==== 表示系 ====
  function renderOverall(data){
    // data.today.overall.title/message を使用（存在チェック）
    const overall = data?.today?.overall || {};
    if ($overallTitle) $overallTitle.textContent = overall.title || "わかりません／情報が不足しています";
    if ($overallMsg)   $overallMsg.textContent   = overall.message || "";

    // スコア等がある設計ならここで計算／表示（現状は任意）
    if ($scoreVal) $scoreVal.textContent = overall.score != null ? String(overall.score) : "";

    // 有料誘導（固定文面 or json.teaser）
    const teaser = overall.teaser || "9カテゴリの詳しい指針は有料エリアでご案内します。";
    if ($payLead) $payLead.textContent = teaser;
    if ($payActions && !$payActions.children.length){
      $payActions.innerHTML = `
        <a class="btn" href="./mypage.html#plan">プランを見る</a>
        <a class="btn ghost" href="./notice.html#paid">詳しく知る</a>
      `;
    }
  }

  function renderCast(chars){
    if (!$castGrid) return;
    if (!Array.isArray(chars) || !chars.length){
      $castGrid.innerHTML = "";
      return;
    }
    $castGrid.innerHTML = chars.map(c => `
<button class="item" data-id="${esc(c.id)}" data-name="${esc(c.name)}">
  <div class="avatar" data-name="${esc(c.name)}"></div>
  <div class="name">${esc(c.name)}</div>
</button>`).join("");

    // アバター適用
    $castGrid.querySelectorAll(".item").forEach(el => {
      const name = el.dataset.name || "";
      // nameからAK側のアイコン解決に任せる（無ければ簡易）
      applyAvatar(el.querySelector(".avatar"), name, cIconByName(chars, name));
    });

    // 任意：クリックで人物ページへ（存在すれば）
    $castGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".item");
      if (!btn) return;
      // ルーティングは任意（例：食卓ページへ）
      // location.href = `./dragon-table-${btn.dataset.id}.html`;
    }, { once: true });
  }

  function cIconByName(chars, name){
    const c = (Array.isArray(chars) ? chars : []).find(x => (x?.name||"") === name);
    return c?.icon || "";
  }

  function renderCalendar(days=30){
    if (!$calendar) return;
    // デモ用：localStorageの履歴キー（存在すればマーキング）
    const seen = new Set();
    try{
      const raw = localStorage.getItem("seen_days");
      if (raw) JSON.parse(raw).forEach(d => seen.add(String(d)));
    }catch(_){}

    const today = new Date(); // 世界内日付に依存しないUI（現実の具体日付は出さない）
    const cells = [];
    for (let i=0; i<days; i++){
      const d = new Date(today.getTime() - i*86400000);
      const label = String(d.getDate()).padStart(2,"0");
      const key = d.toISOString().slice(0,10);
      cells.push(`<div class="cal-cell${i===0?" today":""}${seen.has(key)?" seen":""}">${label}</div>`);
    }
    $calendar.innerHTML = cells.reverse().join("");
  }

  // ==== 起動 ====
  document.addEventListener("DOMContentLoaded", () => {
    const p1 = fetchJSON("./assets/data/fortune_messages.json")
      .then(json => renderOverall(json))
      .catch(() => {
        if ($overallTitle) $overallTitle.textContent = "わかりません／情報が不足しています";
      });

    const p2 = fetchJSON("./assets/data/archetype_fortune.json")
      .then(json => renderCast(Array.isArray(json?.characters) ? json.characters : []))
      .catch(() => { if ($castGrid) $castGrid.innerHTML = ""; });

    // カレンダーはJSON不要（デモ用）
    renderCalendar(28);

    Promise.allSettled([p1, p2]).then(() => {
      try{ window.gtagEvent && window.gtagEvent("view_today", {}); }catch(_){}
    });
  });
})();
