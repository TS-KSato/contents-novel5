// teachings.js — 相談者一覧表示専用（アバター改善版）
(() => {
  'use strict';

  const DATA_FILE = "./assets/data/teachings.json";
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

  // 名前から色を生成する関数
  function generateColorFromName(name) {
    if (!name) return { bg: '#1a3358', text: '#cfe1ff' };
    
    // 名前の文字コードから色を生成
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // HSLベースでバランス良い色を生成
    const hue = Math.abs(hash) % 360;
    const saturation = 60 + (Math.abs(hash) % 20); // 60-80%
    const lightness = 25 + (Math.abs(hash) % 15); // 25-40%
    
    const bgColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const textColor = lightness > 30 ? '#ffffff' : '#ffffff'; // 常に白文字で統一
    
    return { bg: bgColor, text: textColor };
  }

  // 名前から適切なイニシャルを取得
  function getInitials(name) {
    if (!name) return '人';
    
    const cleaned = name.trim();
    if (!cleaned) return '人';
    
    // 日本語の場合は最初の1-2文字
    if (/[ひらがなカタカナ漢字]/.test(cleaned)) {
      return cleaned.slice(0, 2);
    }
    
    // 英語の場合は最初の1文字
    return cleaned.slice(0, 1).toUpperCase();
  }

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

  // アバター適用（改善版）
  function applyAvatar(element, name) {
    if (!element) return;

    const colors = generateColorFromName(name);
    const initials = getInitials(name);
    
    // 美しいグラデーションアバターを作成
    element.innerHTML = `
      <div style="
        width: 100%; 
        height: 100%; 
        border-radius: 50%;
        background: linear-gradient(135deg, ${colors.bg}, ${adjustBrightness(colors.bg, 20)});
        color: ${colors.text};
        display: flex; 
        align-items: center; 
        justify-content: center; 
        font-weight: 700; 
        font-size: 1.1rem;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        border: 2px solid rgba(255,255,255,0.1);
      ">
        ${esc(initials)}
      </div>
    `;
    
    log('Applied generated avatar for:', name, '→', initials, 'with color:', colors.bg);
  }

  // 色の明度を調整する関数
  function adjustBrightness(color, percent) {
    // HSL形式の色から明度を調整
    if (color.startsWith('hsl')) {
      return color.replace(/(\d+)%\)$/, (match, lightness) => {
        const newLightness = Math.max(0, Math.min(100, parseInt(lightness) + percent));
        return `${newLightness}%)`;
      });
    }
    return color;
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
      renderConsultants,
      generateColorFromName,
      getInitials
    };
  }
})();