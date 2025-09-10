// notice.js — 見出しタップで開閉 + 現在地ハイライト(nav.jsで付与)
document.querySelectorAll('.notice .title').forEach(btn=>{
  btn.addEventListener('click',()=> btn.parentElement.classList.toggle('open'));
});
