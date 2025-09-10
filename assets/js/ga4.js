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
// グローバル名前空間に GA を提供（非モジュール対応）
// 同意UIが無いページでは送信しません（未同意＝NO-OP）。
(function(){
const GA = (window.GA = window.GA || {});
let consent = false;
const queue = [];


GA.setConsent = function(granted){
consent = !!granted;
if(consent){
// 本番ではここで gtag.js を動的ロードして queue を送信
while(queue.length){
const [name, params] = queue.shift();
console.debug('GA4:', name, params);
}
}
};


GA.track = function(name, params){
if(!consent){ queue.push([name, params||{}]); return; }
console.debug('GA4:', name, params||{});
};


// ページに同意ダイアログ（#consent）があれば紐付け
document.addEventListener('DOMContentLoaded', ()=>{
const root = document.getElementById('consent');
if(!root) return; // 同意UIが無いページでは何もしない
root.hidden = false;
root.querySelector('#btn-accept')?.addEventListener('click', ()=>{ GA.setConsent(true); root.hidden = true; });
root.querySelector('#btn-decline')?.addEventListener('click', ()=>{ GA.setConsent(false); root.hidden = true; });
});
})();