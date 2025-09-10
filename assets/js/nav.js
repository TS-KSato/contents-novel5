// nav.js — bottom-nav の現在地ハイライト
(function(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.bottom-nav a, nav.gnav a').forEach(a=>{
    const href = a.getAttribute('href') || '';
    const active = href.endsWith(path);
    if (active){
      a.classList.add('bn-accent');
      a.setAttribute('aria-current','page');
    }else{
      a.classList.remove('bn-accent');
      a.removeAttribute('aria-current');
    }
  });
})();
// 現在のパスに基づき、.tabbar 内リンクのアクティブ状態を更新
(function(){
const path = location.pathname.split('/').pop();
document.querySelectorAll('.tabbar .tabbar-item').forEach(a=>{
const href = (a.getAttribute('href')||'').split('/').pop();
if(href === path){ a.classList.add('is-active'); a.setAttribute('aria-current','page'); }
else { a.classList.remove('is-active'); a.removeAttribute('aria-current'); }
});
})();