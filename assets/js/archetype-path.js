// archetype-path.js — fortune / archetype の参照先を assets/data/ に統一（no-cache）
// 役割：1) JSONを読み込む 2) アイコン画像の単一責務ヘルパを提供 3) 既存UIに無理なく接続

(() => {
  const STATE = {
    fortune: null,          // fortune_messages.json の中身
    characters: [],         // archetype_fortune.json の characters 配列
    charByName: new Map(),  // name → icon パス
  };

  // ========== 汎用: エスケープ ==========
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[m]));

  // ========== 単一責務：アイコン適用 ==========
  /**
   * 名前からアイコンURLを取得（存在しない場合は "" を返す）
   * @param {string} name 例: "ライラ"
   * @returns {string}    相対パス or ""
   */
  function getAvatarURL(name) {
    const key = String(name || "").trim();
    return STATE.charByName.get(key) || "";
  }

  /**
   * 要素 el に背景画像としてアイコンを適用。失敗時はテキスト頭文字を表示
   * 想定: <div class="avatar" data-name="ライラ"></div>
   * @param {HTMLElement} el
   * @param {string} name
   */
  function applyAvatar(el, name) {
    if (!el) return;
    const url = getAvatarURL(name);
    if (url) {
      el.style.backgroundImage = `url("${url}")`;
      el.textContent = "";           // 画像があるなら中身は不要
      el.classList.remove("fallback");
    } else {
      // 画像が無い：頭文字フォールバック（見た目は .avatar 共通スタイル）
      el.style.backgroundImage = "none";
      const first = (String(name || "").trim() || "?").slice(0, 1);
      el.textContent = first;
      el.classList.add("fallback");
    }
  }

  /**
   * data-name を持つ .avatar に一括適用
   * 例: <div class="avatar" data-name="アラン"></div>
   */
  function applyAllAvatars() {
    document.querySelectorAll(".avatar[data-name]").forEach(el => {
      applyAvatar(el, el.getAttribute("data-name"));
    });
  }

  // ========== JSON 読み込み（assets/data/ 配下・no-cache） ==========
  function loadJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  function loadAll() {
    const p1 = loadJSON("./assets/data/archetype_fortune.json")
      .then(json => {
        const chars = Array.isArray(json?.characters) ? json.characters : [];
        STATE.characters = chars;
        STATE.charByName.clear();
        // name → icon をMap化（HTML側は「日本語名」で参照しているため name をキーに）
        for (const c of chars) {
          const name = String(c?.name || "").trim();
          const icon = String(c?.icon || "").trim();
          if (name) STATE.charByName.set(name, icon);
        }
      });

    const p2 = loadJSON("./assets/data/fortune_messages.json")
      .then(json => { STATE.fortune = json || null; });

    return Promise.allSettled([p1, p2]).then((results) => {
      const failed = results.some(r => r.status === "rejected");
      if (failed) {
        console.warn("[archetype-path] JSONの読み込みに失敗しました。表示は継続します。", results);
      }
    });
  }

  // ========== 既存UIへの軽量フック ==========
  // 1) .avatar[data-name] にアイコン適用
  // 2) Fortuneの一部を window に共有（必要な箇所で参照）
  function initUI() {
    applyAllAvatars();

    // 既存コードから参照できるよう、グローバルに最低限公開
    window.AK = Object.assign(window.AK || {}, {
      getAvatarURL,
      applyAvatar,
      applyAllAvatars,
      fortuneData: STATE.fortune
    });
  }

  // ========== 起動 ==========
  document.addEventListener("DOMContentLoaded", () => {
    loadAll().then(initUI);
  });

})();
