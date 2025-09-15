// teachings.js — 相談者一覧表示専用（全書き換え版）
(() => {
  'use strict';

  const DATA_FILE = "./assets/data/teachings_unified.json";
  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log('[Teachings]', ...args);
  }

  function error(...args) {
    console.error('[Teachings ERROR]', ...args);
  }

  // DOM要素
  const elements = {
    consultantsGrid: document.getElementById('consultants-grid')
  };

  // HTMLエスケープ
  const esc = (str) => String(str || '').replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  // データ読み込み
  async function loadData() {
    log('Loading data from:', DATA_FILE);
    
    try {
      const response = await fetch(DATA_FILE, {
        cache: 'no-cache',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      log('Data loaded successfully:', {
        version: data.version,
        itemCount: data.items?.length
      });

      return data;
    } catch (err) {
      error('Failed to load data:', err);
      throw err;
    }
  }

  // 相談者カード作成
  function createConsultantCard(consultant) {
    const card = document.createElement('div');
    card.className = 'consultant-card';
    card.setAttribute('data-id', consultant.id);
    
    // メッセージ数計算
    const messageCount = consultant.messages?.length || 0;
    const messageText = messageCount > 0 ? `${messageCount}件の対話` : '対話なし';

    card.innerHTML = `
      <div class="card-avatar" data-name="${esc(consultant.name)}"></div>
      <div class="card-content">
        <h3 class="card-name">${esc(consultant.name)}</h3>
        <p class="card-role">${esc(consultant.role)}</p>
        <p class="card-summary">${esc(consultant.summary)}</p>
        <div class="card-meta">
          <span class="message-count">${messageText}</span>
          ${consultant.meta?.era ? `<span class="era-tag">${esc(consultant.meta.era)}</span>` : ''}
        </div>
      </div>
      <div class="card-arrow">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
        </svg>
      </div>
    `;

    // クリックイベント
    card.addEventListener('click', () => {
      log('Consultant card clicked:', consultant.id, consultant.name);
      
      // room.htmlに遷移
      window.location.href = `room.html?id=${encodeURIComponent(consultant.id)}`;
      
      // アナリティクス
      if (window.SiteCore?.Analytics?.track) {
        window.SiteCore.Analytics.track('select_consultant', {
          consultant_id: consultant.id,
          consultant_name: consultant.name
        });
      }
    });

    // アバター適用
    const avatar = card.querySelector('.card-avatar');
    applyAvatar(avatar, consultant.name);

    return card;
  }

  // アバター適用
  function applyAvatar(element, name) {
    if (!element) return;

    // SiteCore.Avatarが利用可能な場合は使用
    if (window.SiteCore?.Avatar?.create) {
      const avatar = window.SiteCore.Avatar.create({ name });
      avatar.className = 'card-avatar-img';
      element.appendChild(avatar);
      return;
    }

    // フォールバック処理
    const initial = String(name || '?').trim().slice(0, 1).toUpperCase();
    element.textContent = initial;
    element.classList.add('fallback');
    log('Applied fallback avatar for:', name, '→', initial);
  }

  // 相談者一覧描画
  function renderConsultants(consultants) {
    log('Rendering consultants:', consultants.length);

    if (!elements.consultantsGrid) {
      error('Consultants grid element not found');
      return;
    }

    if (consultants.length === 0) {
      elements.consultantsGrid.innerHTML = `
        <div class="empty-message">相談者データが見つかりません。</div>
      `;
      return;
    }

    // カード作成
    const cards = consultants.map(consultant => createConsultantCard(consultant));
    
    // グリッドクリア & 追加
    elements.consultantsGrid.innerHTML = '';
    cards.forEach(card => elements.consultantsGrid.appendChild(card));

    log('Consultants rendered successfully');
  }

  // エラー表示
  function showError(message) {
    error('Showing error:', message);

    if (elements.consultantsGrid) {
      elements.consultantsGrid.innerHTML = `
        <div class="error-message">
          <h3>エラーが発生しました</h3>
          <p>${esc(message)}</p>
          <button onclick="location.reload()" class="btn">再読み込み</button>
        </div>
      `;
    }
  }

  // メイン初期化関数
  async function init() {
    log('Initializing teachings page');

    try {
      // データ読み込み
      const data = await loadData();
      
      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid data structure');
      }

      // 相談者一覧描画
      renderConsultants(data.items);

      // アナリティクス
      if (window.SiteCore?.Analytics?.track) {
        window.SiteCore.Analytics.track('view_consultants_list', {
          consultant_count: data.items.length
        });
      }

      log('Initialization completed successfully');

    } catch (err) {
      error('Initialization failed:', err);
      showError(err.message || 'データの読み込みに失敗しました。');
    }
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // デバッグ用グローバル関数
  if (DEBUG) {
    window.TeachingsDebug = {
      elements,
      loadData,
      renderConsultants
    };
  }
})();