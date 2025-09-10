// partner.js — 今日の導き手（assets/data/archetype_fortune.json を参照 / no-cache）
// 仕様：フォーム未設置でも動作。localStorage は読み取りのみ（archetype_id があれば反映）。PIIは扱わない。

(() => {
  // ---- DOM参照（存在しなければ無視して安全に進む） ----
  const $form   = document.getElementById("partner-form");    // <form id="partner-form">（任意）
  const $arch   = document.getElementById("arch-select");     // <select id="arch-select">（任意）
  const $roles  = document.querySelectorAll('input[name="role"]'); // ラジオ（任意）
  const $decide = document.getElementById("decide");          // <button id="decide">（任意）
  const $wrap   = document.getElementById("partner");         // 表示枠（必須推奨）
  const $err    = document.getElementById("partner-err");     // エラー表示（任意）

  let CHARACTERS = [];

  // ---- utils ----
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  const fetchJSON = (url) => fetch(url, { cache: "no-cache" }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

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

  // ---- データ読み込み ----
  function loadCharacters(){
    return fetchJSON("./assets/data/archetype_fortune.json").then(json => {
      const arr = Array.isArray(json?.characters) ? json.characters : [];
      CHARACTERS = arr.map(c => ({
        id:   String(c.id || ""),
        name: String(c.name || ""),
        icon: String(c.icon || ""),
        role: String(c.role || ""),
        archetype: String(c.archetype || c.arch || "")
      }));
      return CHARACTERS;
    });
  }

  // ---- 選出ロジック（単純・再現性重視）----
  function pickPartner(opts){
    const { arch, role } = opts || {};
    let pool = CHARACTERS.slice();

    if (arch) pool = pool.filter(c => (c.archetype || "").toLowerCase() === String(arch).toLowerCase());
    if (role) pool = pool.filter(c => (c.role || "").toLowerCase() === String(role).toLowerCase());

    if (!pool.length) pool = CHARACTERS.slice();
    if (!pool.length) return null;

    // localStorage の archetype_id があれば先頭に寄せる（保存はしない）
    try {
      const aid = localStorage.getItem("archetype_id");
      if (aid) {
        const idx = pool.findIndex(c => c.id === aid);
        if (idx > 0) { const [hit] = pool.splice(idx,1); pool.unshift(hit); }
      }
    } catch(_){/* 読み取り失敗は無視 */}

    // 最終的に先頭を採用（乱数にしない：表示の再現性/キャッシュ性重視）
    return pool[0] || null;
  }

  // ---- 表示 ----
  function showPartner(p){
    if (!$wrap) return;
    if (!p){
      $wrap.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      return;
    }
    $wrap.innerHTML = `
<div class="partner fadein">
  <div class="avatar" id="partner-avatar" aria-hidden="true"></div>
  <div>
    <div class="pname">${esc(p.name)}</div>
    <div class="prole">${esc(p.role || "Guide")}</div>
    <div class="line">今日はこの導き手が、あなたの進み方を静かに整えます。</div>
  </div>
</div>`;
    applyAvatar(document.getElementById("partner-avatar"), p.name, p.icon);

    try { window.gtagEvent && window.gtagEvent("view_partner", { id: p.id || "" }); } catch(_){}
  }

  // ---- 入力の読み取り ----
  function getFormChoice(){
    const arch = $arch ? $arch.value : "";
    let role = "";
    if ($roles && $roles.length){
      const r = Array.from($roles).find(x => x.checked);
      role = r ? r.value : "";
    }
    return { arch, role };
  }

  function setError(msg){
    if ($err){ $err.textContent = msg || ""; $err.style.display = msg ? "" : "none"; }
  }

  // ---- 起動 ----
  document.addEventListener("DOMContentLoaded", () => {
    loadCharacters()
      .then(() => {
        // 初期描画（フォームが無ければデフォルト選出）
        const p0 = pickPartner(getFormChoice());
        showPartner(p0);

        // イベント接続（任意要素があれば）
        $form && $form.addEventListener("change", () => {
          setError("");
          const p = pickPartner(getFormChoice());
          showPartner(p);
        });

        $decide && $decide.addEventListener("click", (e) => {
          e.preventDefault();
          setError("");
          const p = pickPartner(getFormChoice());
          showPartner(p);
        });
      })
      .catch(() => {
        showPartner(null);
        setError("わかりません／情報が不足しています");
      });
  });
})();
