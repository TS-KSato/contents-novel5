// ga4.js — 非モジュール版（window.GA を提供 / 同意後のみ送信）
(function(){
  const GA = (window.GA = window.GA || {});
  let consent = false;
  const queue = [];

  GA.setConsent = function(granted){
    consent = !!granted;
    if (consent){
      // 本番：ここで gtag.js を動的ロードして queue を送信
      while (queue.length){
        const [name, params] = queue.shift();
        console.debug('GA4:', name, params);
      }
    }
  };

  GA.track = function(name, params){
    if (!consent) { queue.push([name, params||{}]); return; }
    // gtag が無くても落とさない
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, params||{});
    } else {
      console.debug('GA4:', name, params||{});
    }
  };

  // 任意：同意UI (#consent) があれば紐付け
  document.addEventListener('DOMContentLoaded', ()=>{
    const root = document.getElementById('consent');
    if (!root) return;
    root.hidden = false;
    root.querySelector('#btn-accept')?.addEventListener('click', ()=>{ GA.setConsent(true); root.hidden = true; });
    root.querySelector('#btn-decline')?.addEventListener('click', ()=>{ GA.setConsent(false); root.hidden = true; });
  });
})();
