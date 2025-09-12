// teachings.js — デバッグ版：詳細ログとエラーハンドリング
(() => {
  const FILE = "./assets/data/teachings_unified.json";
  const DEBUG = true;
  
  function log(...args) {
    if (DEBUG) console.log('[Teachings]', ...args);
  }
  
  function error(...args) {
    console.error('[Teachings ERROR]', ...args);
  }
  
  // DOM要素取得
  function getElements() {
    const elements = {
      rooms: document.getElementById("rooms"),
      thread: document.getElementById("thread"),
      search: document.getElementById("q")
    };
    
    Object.entries(elements).forEach(([key, element]) => {
      if (!element) {
        error(`Element not found: ${key}`);
      } else {
        log(`Element found: ${key}`);
      }
    });
    
    return elements;
  }

  let elements = {};
  let ROOMS = [];
  let activeId = null;

  // HTML エスケープ
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  // JSON読み込み
  async function loadJSON(url) {
    log('Loading JSON from:', url);
    
    try {
      const response = await fetch(url, { 
        cache: "no-cache",
        headers: {
          'Accept': 'application/json'
        }
      });
      
      log('Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      log('JSON loaded, structure:', {
        hasItems: !!data.items,
        itemsLength: data.items?.length,
        version: data.version,
        sampleItem: data.items?.[0]
      });
      
      return data;
      
    } catch (err) {
      error('Failed to load JSON:', err);
      throw err;
    }
  }

  // アバター適用
  function applyAvatar(el, name, icon) {
    if (!el) return;
    
    if (window.AK && typeof window.AK.applyAvatar === "function") {
      if (name) {
        log('Using AK.applyAvatar for:', name);
        return window.AK.applyAvatar(el, name);
      }
    }
    
    // フォールバック処理
    if (icon) {
      el.style.backgroundImage = `url("${icon}")`;
      el.textContent = "";
      el.classList.remove("fallback");
      log('Applied icon for:', name);
    } else {
      el.style.backgroundImage = "none";
      const initial = (String(name || "?").trim() || "?").slice(0, 1).toUpperCase();
      el.textContent = initial;
      el.classList.add("fallback");
      log('Applied fallback initial for:', name, '→', initial);
    }
  }

  // ルーム一覧描画
  function renderRooms(filter = "") {
    log('Rendering rooms with filter:', filter);
    
    if (!elements.rooms) {
      error('Cannot render rooms: element not found');
      return;
    }
    
    const q = filter.trim().toLowerCase();
    const filteredRooms = ROOMS.filter(room => {
      if (!q) return true;
      return room.name.toLowerCase().includes(q) || 
             room.summary.toLowerCase().includes(q) ||
             room.role.toLowerCase().includes(q);
    });
    
    log('Filtered rooms:', filteredRooms.length, '/', ROOMS.length);

    if (!filteredRooms.length) {
      elements.rooms.innerHTML = `<div class="empty">該当する相談者が見つかりません</div>`;
      return;
    }

    const html = filteredRooms.map(room => `
      <button class="room-item${room.id === activeId ? " active" : ""}" data-id="${esc(room.id)}">
        <div class="avatar" data-name="${esc(room.name)}"></div>
        <div class="meta">
          <div class="r-name">${esc(room.name)}</div>
          <div class="r-meta">${esc(room.role)} · ${esc(room.summary)}</div>
        </div>
      </button>
    `).join("");
    
    elements.rooms.innerHTML = html;
    log('Rooms HTML rendered');

    // アバター適用
    elements.rooms.querySelectorAll(".room-item").forEach(btn => {
      const roomId = btn.dataset.id;
      const room = filteredRooms.find(r => r.id === roomId);
      const avatar = btn.querySelector(".avatar");
      if (avatar && room) {
        applyAvatar(avatar, room.name, room.icon || "");
      }
    });
    
    log('Avatars applied');
  }

  // メッセージスレッド描画
  function renderThread(room) {
    log('Rendering thread for room:', room?.id);
    
    if (!elements.thread) {
      error('Cannot render thread: element not found');
      return;
    }
    
    if (!room) {
      elements.thread.innerHTML = `<div class="empty">左の一覧から相談者を選んでください。</div>`;
      return;
    }

    const messages = Array.isArray(room.messages) ? room.messages : [];
    log('Messages count:', messages.length);
    
    if (!messages.length) {
      elements.thread.innerHTML = `
        <div class="msg-header">
          <div class="name">${esc(room.name)} (${esc(room.role)})</div>
          <div class="summary">${esc(room.summary)}</div>
        </div>
        <div class="empty">このルームにはまだメッセージがありません。</div>
      `;
      return;
    }

    let output = [];
    let lastDate = "";

    // ルーム情報ヘッダー
    output.push(`
      <div class="msg-header">
        <div class="name">${esc(room.name)} (${esc(room.role)})</div>
        <div class="summary">${esc(room.summary)}</div>
        ${room.meta ? `<div class="meta-info">
          <span>${esc(room.meta.era || "")}</span>
          <span>${esc(room.meta.locale || "")}</span>
          <span>${esc(room.meta.species || "")}</span>
        </div>` : ''}
      </div>
    `);

    // メッセージ処理
    messages.forEach((msg, index) => {
      const ts = String(msg.ts || "");
      const datePart = ts.substring(0, 10);
      
      log(`Processing message ${index}:`, { ts, datePart, speaker: msg.speaker });
      
      // 日付区切り
      if (datePart && datePart !== lastDate) {
        output.push(`<div class="section-date">${esc(datePart)}</div>`);
        lastDate = datePart;
      }

      const speaker = String(msg.speaker || "");
      const text = String(msg.text || "");
      const isLaila = speaker === "ライラ";

      output.push(`
        <div class="msg${isLaila ? " laila" : ""}">
          <div class="who">${esc(speaker)}</div>
          <div class="text">${esc(text)}</div>
          <div class="meta">${esc(ts)}</div>
        </div>
      `);
    });

    elements.thread.innerHTML = output.join("");
    elements.thread.scrollTop = 0;
    
    log('Thread rendered successfully');

    // GA4イベント
    try {
      window.gtagEvent && window.gtagEvent("view_teachings", { room: room.id });
    } catch (_) {}
  }

  // イベントリスナー設定
  function setupEventListeners() {
    log('Setting up event listeners');

    // ルームクリックイベント
    if (elements.rooms) {
      elements.rooms.addEventListener("click", (e) => {
        const btn = e.target.closest(".room-item");
        if (!btn) return;

        const roomId = btn.dataset.id;
        const room = ROOMS.find(r => r.id === roomId);
        
        log('Room clicked:', roomId, room?.name);
        
        if (!room) {
          error('Room not found for id:', roomId);
          return;
        }

        // アクティブ状態更新
        activeId = roomId;
        elements.rooms.querySelectorAll(".room-item").forEach(x => 
          x.classList.toggle("active", x === btn)
        );

        // スレッド表示
        renderThread(room);
      });
      log('Room click listener attached');
    }

    // 検索イベント
    if (elements.search) {
      elements.search.addEventListener("input", (e) => {
        const query = e.target.value || "";
        log('Search input:', query);
        renderRooms(query);
        
        // 検索後にアクティブなアイテムがなくなった場合の処理
        if (activeId && !elements.rooms.querySelector(".room-item.active")) {
          activeId = null;
          elements.thread.innerHTML = `<div class="empty">左の一覧から相談者を選んでください。</div>`;
        }
      });
      log('Search listener attached');
    }
  }

  // データ変換
  function transformData(jsonData) {
    log('Transforming data...');
    
    if (!jsonData) {
      throw new Error("JSON data is null");
    }
    
    if (!jsonData.items) {
      throw new Error("JSON data missing 'items' property");
    }
    
    if (!Array.isArray(jsonData.items)) {
      throw new Error("'items' is not an array");
    }

    const transformed = jsonData.items.map((item, index) => {
      const room = {
        id: String(item.id || `room_${index}`),
        name: String(item.name || `相談者 ${index + 1}`),
        role: String(item.role || ""),
        summary: String(item.summary || ""),
        icon: "",
        meta: item.meta || {},
        participants: item.participants || [],
        messages: Array.isArray(item.messages) ? item.messages.map(msg => ({
          ts: String(msg.ts || ""),
          speaker: String(msg.speaker || ""),
          text: String(msg.text || "")
        })) : []
      };
      
      log(`Transformed item ${index}:`, {
        id: room.id,
        name: room.name,
        messagesCount: room.messages.length
      });
      
      return room;
    });
    
    log('Data transformation completed:', transformed.length, 'rooms');
    return transformed;
  }

  // 初期化
  async function init() {
    log('Initializing teachings page');
    
    try {
      // DOM要素取得
      elements = getElements();
      
      // 必須要素チェック
      if (!elements.rooms || !elements.thread) {
        throw new Error('Required DOM elements not found');
      }
      
      // JSONデータ読み込み
      const jsonData = await loadJSON(FILE);
      
      // データ変換
      ROOMS = transformData(jsonData);
      
      if (ROOMS.length === 0) {
        throw new Error('No rooms found after transformation');
      }
      
      // イベントリスナー設定
      setupEventListeners();
      
      // 初期描画
      renderRooms();

      // 最初のルームを自動選択
      activeId = ROOMS[0].id;
      renderThread(ROOMS[0]);
      
      // UI更新
      setTimeout(() => {
        const firstBtn = elements.rooms.querySelector('.room-item');
        if (firstBtn) {
          firstBtn.classList.add('active');
          log('First room auto-selected');
        }
      }, 100);

      log(`Initialization completed successfully: ${ROOMS.length} rooms loaded`);
      
    } catch (err) {
      error('Initialization failed:', err);
      
      // エラー表示
      if (elements.rooms) {
        elements.rooms.innerHTML = `<div class="empty">データの読み込みに失敗しました<br><small>${esc(err.message)}</small></div>`;
      }
      if (elements.thread) {
        elements.thread.innerHTML = `<div class="empty">データの読み込みに失敗しました</div>`;
      }
      
      // デバッグ情報をコンソールに出力
      console.group('[Teachings Debug Info]');
      console.log('DOM elements:', elements);
      console.log('File URL:', FILE);
      console.log('Error details:', err);
      console.groupEnd();
    }
  }

  // DOM読み込み完了後に初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    log('Waiting for DOMContentLoaded');
  } else {
    init();
    log('DOM already loaded, initializing immediately');
  }
})();