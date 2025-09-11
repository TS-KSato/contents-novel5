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

/**
 * nav.js - ナビゲーションの現在地ハイライト（統合版）
 * bottom-nav と gnav の両方に対応
 */

(function() {
  'use strict';

  function updateNavigation() {
    const currentPath = getCurrentPath();
    
    // 下部ナビゲーション（.bottom-nav）
    updateBottomNav(currentPath);
    
    // 一般ナビゲーション（.gnav）
    updateGNav(currentPath);
    
    // タブバー（.tabbar）
    updateTabBar(currentPath);
  }

  function getCurrentPath() {
    const path = location.pathname.split('/').pop();
    return path || 'index.html';
  }

  function updateBottomNav(currentPath) {
    const selectors = ['.bottom-nav a', 'nav.gnav a'];
    
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(link => {
        const href = link.getAttribute('href') || '';
        const linkPath = href.split('/').pop() || '';
        const isActive = isActiveLink(linkPath, currentPath);
        
        updateLinkState(link, isActive, 'bn-accent');
      });
    });
  }

  function updateGNav(currentPath) {
    // .gnav 専用の処理
    document.querySelectorAll('nav.gnav a').forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkPath = href.split('/').pop() || '';
      const isActive = isActiveLink(linkPath, currentPath);
      
      // .gnav では背景色変更のためのクラスが異なる場合がある
      updateLinkState(link, isActive, 'active');
    });
  }

  function updateTabBar(currentPath) {
    document.querySelectorAll('.tabbar .tabbar-item').forEach(link => {
      const href = link.getAttribute('href') || '';
      const linkPath = href.split('/').pop() || '';
      const isActive = isActiveLink(linkPath, currentPath);
      
      updateLinkState(link, isActive, 'is-active');
    });
  }

  function isActiveLink(linkPath, currentPath) {
    // 完全一致
    if (linkPath === currentPath) {
      return true;
    }
    
    // index.html の特殊処理
    if (currentPath === 'index.html' && (linkPath === '' || linkPath === 'index.html')) {
      return true;
    }
    
    // 空文字の場合のindex.html扱い
    if (linkPath === '' && currentPath === 'index.html') {
      return true;
    }
    
    return false;
  }

  function updateLinkState(link, isActive, activeClass) {
    if (isActive) {
      link.classList.add(activeClass);
      link.setAttribute('aria-current', 'page');
    } else {
      link.classList.remove(activeClass);
      link.removeAttribute('aria-current');
    }
  }

  // 初期化関数
  function initNavigation() {
    try {
      updateNavigation();
      console.log('Navigation initialized successfully');
    } catch (error) {
      console.error('Navigation initialization failed:', error);
    }
  }

  // DOM準備完了時の初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    // すでにDOMが読み込まれている場合
    setTimeout(initNavigation, 0);
  }

  // 履歴変更時の更新（SPA対応）
  window.addEventListener('popstate', updateNavigation);

  // グローバルエクスポート（他のスクリプトから使用可能）
  if (typeof window !== 'undefined') {
    window.NavigationUtils = {
      updateNavigation,
      getCurrentPath
    };
  }

})();