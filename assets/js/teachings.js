// teachings.js — teachings_unified.json を assets/data/ から読み込み（no-cache）
// 仕様: JSONの日時(ts)は生成・改変せず、そのまま表示する

(() => {
  const $rooms   = document.getElementById("rooms");   // ルーム一覧コンテナ
  const $thread  = document.getElementById("thread");  // メッセージ表示コンテナ
  const $search  = document.getElementById("search");  // <input id="search">（任意）
  let ROOMS = [];
  let activeId = null;

  // -------- utils --------
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  function loadJSON(url){
    return fetch(url, { cache: "no-cache" }).then(r => {
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  // 単一責務：アバター適用（グローバルがあればそれを使う）
  function applyAvatar(el, name, icon){
    if (window.AK && typeof window.AK.applyAvatar === "function") {
      // 名前優先（AKはname→iconのMapを持つ設計）
      if (name) return window.AK.applyAvatar(el, name);
    }
    // フォールバック：iconがあればそれを、無ければ頭文字
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

  // -------- render: rooms --------
  function renderRooms(filter=""){
    const q = filter.trim();
    const rows = ROOMS.filter(r => {
      if(!q) return true;
      return r.name.includes(q);
    });

    if (!rows.length){
      $rooms.innerHTML = `<div class="empty">わかりません／情報が不足しています</div>`;
      return;
    }

    $rooms.innerHTML = rows.map(r => `
<button class="room-item${r.id===activeId?" active":""}" data-id="${esc(r.id)}">
  <div class="avatar" data-name="${esc(r.name)}" ${r.icon?`style="background-image:url('${esc(r.icon)}')"`:""}></div>
  <div class="meta">
    <div class="r-name">${esc(r.name)}</div>
    <div class="r-meta">${esc((r.messages?.length||0) + " 件のメッセージ")}</div>
  </div>
</button>`).join("");

    // avatar適用（AKがあればAKに任せる）
    $rooms.querySelectorAll(".room-item").forEach(btn=>{
      const name = btn.querySelector(".avatar")?.getAttribute("data-name");
      const icon = rows.find(r=>r.id===btn.dataset.id)?.icon || "";
      applyAvatar(btn.querySelector(".avatar"), name, icon);
    });
  }

  // -------- render: thread --------
  // tsはJSON値をそのまま表示。日付区切りは ts の "YYYY-MM-DD" 部分をそのまま見出しに使用（変換しない）
  function renderThread(room){
    if (!room){
      $thread.innerHTML = `<div class="empty">ルームを選んでください。</div>`;
      return;
    }
    const list = Array.isArray(room.messages) ? room.messages : [];
    if (!list.length){
      $thread.innerHTML = `<div class="empty">このルームにはまだメッセージがありません。</div>`;
      return;
    }

    let out = [];
    let lastDate = "";
    for (const m of list){
      const ts = String(m.ts||"");
      const datePart = ts.slice(0,10); // "YYYY-MM-DD"（そのまま使用）
      if (datePart && datePart !== lastDate){
        out.push(`<div class="section-date">${esc(datePart)}</div>`);
        lastDate = datePart;
      }
      const who = String(m.who||"");
      const text = String(m.text||"");
      const mine = who === "ライラ"; // 右寄せ用（例：教師側を右）
      out.push(`
<div class="msg${mine?" laila":""}">
  <div class="who">${esc(who)}</div>
  <div class="text">${esc(text)}</div>
  <div class="meta">${esc(ts)}</div>
</div>`);
    }
    $thread.innerHTML = out.join("");

    try { window.gtagEvent && window.gtagEvent("view_teachings", { room: room.id }); } catch(_){}
  }

  // -------- events --------
  $rooms.addEventListener("click", (e)=>{
    const btn = e.target.closest(".room-item");
    if (!btn) return;
    activeId = btn.dataset.id;
    const room = ROOMS.find(r=>r.id===activeId);
    // active表示切替
    $rooms.querySelectorAll(".room-item").forEach(x=>x.classList.toggle("active", x===btn));
    renderThread(room);
  });

  $search?.addEventListener("input", (e)=>{
    renderRooms(e.target.value||"");
  });

  // -------- boot --------
  document.addEventListener("DOMContentLoaded", () => {
    loadJSON("./assets/data/teachings_unified.json")
      .then(json => {
        ROOMS = Array.isArray(json?.rooms) ? json.rooms.map(r => ({
          id: String(r.id||""),
          name: String(r.name||""),
          icon: String(r.icon||""),
          messages: Array.isArray(r.messages) ? r.messages.map(m => ({
            ts: String(m.ts||""),   // そのまま
            who: String(m.who||""),
            text: String(m.text||"")
          })) : []
        })) : [];
        renderRooms();
        // 初期選択（任意）：先頭を開く
        if (ROOMS.length){
          activeId = ROOMS[0].id;
          $rooms.querySelector('.room-item')?.classList.add('active');
          renderThread(ROOMS[0]);
        } else {
          $thread.innerHTML = `<div class="empty">わかりません／情報が不足しています</div>`;
        }
      })
      .catch(() => {
        $rooms.innerHTML = `<div class="empty">わかりません／情報が不足しています</div>`;
        $thread.innerHTML = `<div class="empty">わかりません／情報が不足しています</div>`;
      });
  });
})();
