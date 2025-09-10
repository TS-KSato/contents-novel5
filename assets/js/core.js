// core.js (ESM) — 共有ユーティリティ & ストア & アバター
export const $  = (sel,root=document)=>root.querySelector(sel);
export const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
export const esc = (s)=>String(s ?? "").replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));

// ===== Storage（最小保存：archetype_id のみ） =====
export const ArchetypeStore = (() => {
  const KEY = "archetype_id";

  // 旧キー(userArchetype)から id を一度だけ移行して削除（あれば）
  try{
    const legacy = localStorage.getItem("userArchetype");
    if (legacy && !localStorage.getItem(KEY)) {
      const obj = JSON.parse(legacy);
      if (obj && typeof obj.id === "string") localStorage.setItem(KEY, obj.id);
    }
    localStorage.removeItem("userArchetype");
  }catch(_){/* ignore */ }

  return Object.freeze({
    get(){ return localStorage.getItem(KEY); },
    set(id){ if (typeof id === "string" && id) localStorage.setItem(KEY, id); },
    clear(){ localStorage.removeItem(KEY); }
  });
})();

// ===== Avatar（画像があれば <img>、無ければ丸アイコン） =====
// 既定の画像マップ（必要に応じて拡張）
const AVATAR_BY_ID = Object.freeze({
  alan:"assets/char-alan.jpg",
  drake:"assets/char-drake.jpg",
  nester:"assets/char-nester.jpg",
  lilia:"assets/char-lilia.jpg",
  laila:"assets/char-laila.jpg",
  lunal:"assets/char-lunal.jpg",
  magnus:"assets/char-magnus.jpg",
  king:"assets/char-king.jpg",
  mireia:"assets/char-mireia.jpg"
});
const AVATAR_BY_NAME = Object.freeze({
  "アラン":"assets/char-alan.jpg",
  "ドレイク":"assets/char-drake.jpg",
  "ネスター":"assets/char-nester.jpg",
  "リリア":"assets/char-lilia.jpg",
  "ライラ":"assets/char-laila.jpg",
  "ルナル":"assets/char-lunal.jpg",
  "マグナス":"assets/char-magnus.jpg",
  "ネクサート":"assets/char-king.jpg",
  "ミレイア":"assets/char-mireia.jpg"
});

export const Avatar = Object.freeze({
  /**
   * @param {Object} a { id, name, initials, av, art? }
   * @returns HTMLElement
   */
  render(a={}){
    const wrap = document.createElement("span");
    wrap.className = "avatar-wrap";

    // 画像ソースを解決（優先: a.art → id → name）
    const byId = a.id ? AVATAR_BY_ID[String(a.id).trim()] : null;
    const plainName = String(a.name||"").replace(/の魂.*$/,"").trim();
    const byName = AVATAR_BY_NAME[plainName];
    const src = a.art || byId || byName || null;

    if (src){
      const img = document.createElement("img");
      img.className = "avatar-img";
      img.src = src;
      img.alt = ""; // 装飾扱い（隣のテキストで識別）
      img.decoding = "async";
      img.loading = "lazy";
      wrap.appendChild(img);
      return wrap;
    }
    // fallback: 丸アイコン
    const span = document.createElement("span");
    span.className = "avatar avatar-fallback " + esc(a.av||"");
    span.setAttribute("aria-hidden","true");
    span.textContent = a.initials || "？";
    wrap.appendChild(span);
    return wrap;
  }
});
