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
