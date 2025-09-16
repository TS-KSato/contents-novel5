// room.js — 対話記録表示専用JavaScript（アバター改善版）
(() => {
  'use strict';

  const DATA_FILE = "./assets/data/teachings.json";
  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log('[Room]', ...args);
  }

  function error(...args) {
    console.error('[Room ERROR]', ...args);
  }

  // DOM要素
  const elements = {
    consultantInfo: document.getElementById('consultant-info'),
    consultantAvatar: document.getElementById('consultant-avatar'),
    consultantName: document.getElementById('consultant-name'),
    consultantRole: document.getElementById('consultant-role'),
    consultantSummary: document.getElementById('consultant-summary'),
    consultantMeta: document.getElementById('consultant-meta'),
    conversationThread: document.getElementById('conversation-thread'),
    roomTitle: document.getElementById('room-title'),
    roomSubtitle: document.getElementById('room-subtitle'),
    errorSection: document.getElementById('error-section'),
    errorMessage: document.getElementById('error-message')
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

  // URLパラメータ取得
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      id: params.get('id'),
      debug: params.has('debug')
    };
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

  // 相談者データ検索
  function findConsultant(data, consultantId) {
    if (!data.items || !Array.isArray(data.items)) {
      throw new Error('Invalid data structure');
    }

    const consultant = data.items.find(item => item.id === consultantId);
    
    if (!consultant) {
      log('Available consultant IDs:', data.items.map(item => item.id));
      throw new Error(`Consultant not found: ${consultantId}`);
    }

    log('Consultant found:', {
      id: consultant.id,
      name: consultant.name,
      messageCount: consultant.messages?.length || 0
    });

    return consultant;
  }

  // アバター適用（改善版）
  function applyAvatar(element, name) {
    if (!element) return;

    const colors = generateColorFromName(name);
    const initials = getInitials(name);
    
    // 美しいグラデーションアバターを作成（CSS変数を使用）
    element.style.setProperty('--avatar-bg', colors.bg);
    element.style.setProperty('--avatar-bg-light', adjustBrightness(colors.bg, 20));
    element.style.setProperty('--avatar-text', colors.text);
    
    element.innerHTML = `
      <div class="generated-avatar">
        ${esc(initials)}
      </div>
    `;
    
    log('Applied generated avatar for:', name, '→', initials, 'with color:', colors.bg);
  }

  // 相談者情報表示
  function renderConsultantInfo(consultant) {
    log('Rendering consultant info for:', consultant.name);

    // 基本情報
    elements.consultantName.textContent = consultant.name || '相談者';
    elements.consultantRole.textContent = consultant.role || '';
    elements.consultantSummary.textContent = consultant.summary || '';

    // ヘッダー更新
    elements.roomTitle.textContent = `${consultant.name}との対話`;
    elements.roomSubtitle.textContent = consultant.role || '相談者';

    // アバター適用
    applyAvatar(elements.consultantAvatar, consultant.name);

    // メタ情報
    if (consultant.meta && elements.consultantMeta) {
      const metaTags = [];
      
      if (consultant.meta.era) {
        metaTags.push(`<span class="meta-tag">${esc(consultant.meta.era)}</span>`);
      }
      if (consultant.meta.locale) {
        metaTags.push(`<span class="meta-tag">${esc(consultant.meta.locale)}</span>`);
      }
      if (consultant.meta.species) {
        metaTags.push(`<span class="meta-tag">${esc(consultant.meta.species)}</span>`);
      }

      elements.consultantMeta.innerHTML = metaTags.join('');
    }

    // 表示
    elements.consultantInfo.style.display = 'block';
  }

  // 対話スレッド表示
  function renderConversation(consultant) {
    log('Rendering conversation for:', consultant.name);

    const messages = consultant.messages || [];
    if (messages.length === 0) {
      elements.conversationThread.innerHTML = `
        <div class="loading-message">この相談者との対話記録はまだありません。</div>
      `;
      return;
    }

    const html = [];
    let lastDate = '';

    messages.forEach((message, index) => {
      const timestamp = String(message.ts || '');
      const datePart = timestamp.substring(0, 10);

      // 日付区切り
      if (datePart && datePart !== lastDate) {
        html.push(`<div class="date-divider">${esc(datePart)}</div>`);
        lastDate = datePart;
      }

      const speaker = String(message.speaker || '');
      const text = String(message.text || '');
      const isLaila = speaker === 'ライラ';

      html.push(`
        <div class="message${isLaila ? ' laila' : ''}">
          <div class="speaker">${esc(speaker)}</div>
          <div class="text">${esc(text)}</div>
          <div class="timestamp">${esc(timestamp)}</div>
        </div>
      `);
    });

    elements.conversationThread.innerHTML = html.join('');
    elements.conversationThread.scrollTop = 0;

    log('Conversation rendered:', messages.length, 'messages');
  }

  // エラー表示
  function showError(message, details = null) {
    error('Showing error:', message, details);

    elements.errorMessage.textContent = message;
    elements.errorSection.style.display = 'block';
    
    // 他のセクションを非表示
    elements.consultantInfo.style.display = 'none';
    elements.conversationThread.innerHTML = '';

    // ヘッダー更新
    elements.roomTitle.textContent = 'エラー';
    elements.roomSubtitle.textContent = '読み込みに失敗しました';
  }

  // メイン初期化関数
  async function init() {
    log('Initializing room page');

    try {
      // URLパラメータ取得
      const params = getUrlParams();
      log('URL params:', params);

      if (!params.id) {
        showError('相談者IDが指定されていません。');
        return;
      }

      // 特別なID処理（将来のAI相談用）
      if (params.id === 'user') {
        log('User consultation mode detected');
        showError('AIとの相談機能は準備中です。', 'Coming soon...');
        return;
      }

      // データ読み込み
      const data = await loadData();
      
      // 相談者検索
      const consultant = findConsultant(data, params.id);

      // 表示
      renderConsultantInfo(consultant);
      renderConversation(consultant);

      // アナリティクス
      if (window.SiteCore?.Analytics?.track) {
        window.SiteCore.Analytics.track('view_consultation', {
          consultant_id: consultant.id,
          consultant_name: consultant.name
        });
      }

      log('Initialization completed successfully');

    } catch (err) {
      error('Initialization failed:', err);
      showError(
        err.message || 'データの読み込みに失敗しました。',
        err.stack
      );
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
    window.RoomDebug = {
      elements,
      getUrlParams,
      loadData,
      findConsultant,
      generateColorFromName,
      getInitials,
      applyAvatar
    };
  }
})();