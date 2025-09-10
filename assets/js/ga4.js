// ga4.js (ESM) — 同意後のみ送信する gtag ラッパ
let consent = false;

export function acceptAnalytics(){ consent = true; }

export function gtagEvent(name, params={}){
  if (!consent) return;                 // 同意前は送らない
  if (params && typeof params === "object") {
    const s = JSON.stringify(params);
    if (/(mail|name|tel|address|card)/i.test(s)) return; // 簡易PIIガード
  }
  // gtag が未定義でも落とさない
  if (typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
}

// 命名規約に沿った薄いヘルパ
export const Events = Object.freeze({
  eval_path: (phase) => gtagEvent("eval_path", { phase }), // "phase1_init" | ... | "result_view"
  view: (which) => gtagEvent(`view_${which}`),             // "music" 等
  open_paid_category: (which) => gtagEvent("open_paid_category", { which }),
  start_checkout: () => gtagEvent("start_checkout"),
  complete_checkout: () => gtagEvent("complete_checkout")
});
