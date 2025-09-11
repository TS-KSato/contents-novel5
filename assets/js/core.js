(function() {
  'use strict';

  // ===== 基本ユーティリティ =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  // ===== DOM操作ユーティリティ =====
  const DOM = {
    query: $,
    queryAll: $$,
    
    createElement: (tag, props = {}, children = []) => {
      const element = document.createElement(tag);
      
      Object.entries(props).forEach(([key, value]) => {
        if (key === 'className') {
          element.className = value;
        } else if (key === 'textContent') {
          element.textContent = value;
        } else if (key.startsWith('data-') || key.startsWith('aria-')) {
          element.setAttribute(key, value);
        } else {
          element[key] = value;
        }
      });
      
      children.forEach(child => {
        if (typeof child === 'string') {
          element.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          element.appendChild(child);
        }
      });
      
      return element;
    }
  };

  // ===== セキュリティ =====
  const Security = {
    escapeHtml: esc,
    
    updateContent: (element, content, isHtml = false) => {
      if (!element) return;
      
      if (isHtml) {
        console.warn('HTML挿入は推奨されません。DOM.createElementを使用してください');
        element.innerHTML = content;
      } else {
        element.textContent = content;
      }
    }
  };

  // ===== ストレージ管理 =====
  const ArchetypeStore = (() => {
    const KEY = "archetype_id";

    // 旧キー移行処理
    try {
      const legacy = localStorage.getItem("userArchetype");
      if (legacy && !localStorage.getItem(KEY)) {
        const obj = JSON.parse(legacy);
        if (obj && typeof obj.id === "string") {
          localStorage.setItem(KEY, obj.id);
        }
      }
      localStorage.removeItem("userArchetype");
    } catch (_) {
      // ignore
    }

    return Object.freeze({
      get() { return localStorage.getItem(KEY); },
      set(id) { 
        if (typeof id === "string" && id) {
          localStorage.setItem(KEY, id);
        }
      },
      clear() { localStorage.removeItem(KEY); }
    });
  })();

  const Storage = {
    KEYS: {
      ARCHETYPE_ID: 'archetype_id',
      USER_PREFERENCES: 'user_preferences',
      CONSENT: 'analytics_consent'
    },
    
    get(key, defaultValue = null) {
      try {
        const value = localStorage.getItem(key);
        return value !== null ? JSON.parse(value) : defaultValue;
      } catch (error) {
        console.error('Storage get error:', error);
        return defaultValue;
      }
    },
    
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('Storage set error:', error);
        return false;
      }
    },
    
    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('Storage remove error:', error);
        return false;
      }
    }
  };

  // ===== アバター管理 =====
  const AVATAR_BY_ID = Object.freeze({
    alan: "assets/char-alan.jpg",
    drake: "assets/char-drake.jpg", 
    nester: "assets/char-nester.jpg",
    lilia: "assets/char-lilia.jpg",
    laila: "assets/char-laila.jpg",
    lunal: "assets/char-lunal.jpg",
    magnus: "assets/char-magnus.jpg",
    king: "assets/char-king.jpg",
    mireia: "assets/char-mireia.jpg"
  });

  const AVATAR_BY_NAME = Object.freeze({
    "アラン": "assets/char-alan.jpg",
    "ドレイク": "assets/char-drake.jpg",
    "ネスター": "assets/char-nester.jpg", 
    "リリア": "assets/char-lilia.jpg",
    "ライラ": "assets/char-laila.jpg",
    "ルナル": "assets/char-lunal.jpg",
    "マグナス": "assets/char-magnus.jpg",
    "ネクサート": "assets/char-king.jpg",
    "ミレイア": "assets/char-mireia.jpg"
  });

  const Avatar = Object.freeze({
    // 元のrender関数（互換性維持）
    render(a = {}) {
      const wrap = document.createElement("span");
      wrap.className = "avatar-wrap";

      const byId = a.id ? AVATAR_BY_ID[String(a.id).trim()] : null;
      const plainName = String(a.name || "").replace(/の魂.*$/, "").trim();
      const byName = AVATAR_BY_NAME[plainName];
      const src = a.art || byId || byName || null;

      if (src) {
        const img = document.createElement("img");
        img.className = "avatar-img";
        img.src = src;
        img.alt = "";
        img.decoding = "async";
        img.loading = "lazy";
        wrap.appendChild(img);
        return wrap;
      }

      const span = document.createElement("span");
      span.className = "avatar avatar-fallback " + esc(a.av || "");
      span.setAttribute("aria-hidden", "true");
      span.textContent = a.initials || "？";
      wrap.appendChild(span);
      return wrap;
    },

    // 新しいcreate関数
    create(options = {}) {
      const { id, name, initials = '？', className = '', art } = options;
      
      const imageSource = this._resolveImageSource(id, name, art);
      
      if (imageSource) {
        return this._createImageAvatar(imageSource, name || id);
      } else {
        return this._createFallbackAvatar(initials, className);
      }
    },
    
    _resolveImageSource(id, name, art) {
      if (art) return art;
      if (id && AVATAR_BY_ID[id]) return AVATAR_BY_ID[id];
      
      const cleanName = String(name || '').replace(/の魂.*$/, '').trim();
      if (cleanName && AVATAR_BY_NAME[cleanName]) {
        return AVATAR_BY_NAME[cleanName];
      }
      
      return null;
    },
    
    _createImageAvatar(src, alt) {
      const img = document.createElement('img');
      img.className = 'avatar avatar-image';
      img.src = src;
      img.alt = alt || '';
      img.decoding = 'async';
      img.loading = 'lazy';
      return img;
    },
    
    _createFallbackAvatar(initials, className) {
      const span = document.createElement('span');
      span.className = `avatar avatar-fallback ${className}`.trim();
      span.setAttribute('aria-hidden', 'true');
      span.textContent = initials;
      return span;
    }
  });

  // ===== イベント管理 =====
  const EventManager = {
    _listeners: new Map(),
    
    add(element, event, handler, options = {}) {
      if (!element) return;
      
      const key = `${element}-${event}`;
      this.remove(element, event);
      
      element.addEventListener(event, handler, options);
      this._listeners.set(key, { element, event, handler, options });
    },
    
    remove(element, event) {
      if (!element) return;
      
      const key = `${element}-${event}`;
      const listener = this._listeners.get(key);
      
      if (listener) {
        element.removeEventListener(event, listener.handler, listener.options);
        this._listeners.delete(key);
      }
    },
    
    removeAll() {
      this._listeners.forEach(({ element, event, handler, options }) => {
        element.removeEventListener(event, handler, options);
      });
      this._listeners.clear();
    }
  };

  // ===== アナリティクス =====
  const Analytics = {
    _initialized: false,
    _consent: false,
    _queue: [],
    
    init() {
      if (this._initialized) return;
      
      this._consent = Storage.get(Storage.KEYS.CONSENT, false);
      this._initialized = true;
      this._setupConsentUI();
      
      if (this._consent) {
        this._processQueue();
      }
    },
    
    setConsent(granted) {
      this._consent = !!granted;
      Storage.set(Storage.KEYS.CONSENT, this._consent);
      
      if (this._consent) {
        this._processQueue();
      } else {
        this._queue.length = 0;
      }
    },
    
    track(eventName, parameters = {}) {
      const event = { eventName, parameters, timestamp: Date.now() };
      
      if (!this._consent) {
        this._queue.push(event);
        return;
      }
      
      this._sendEvent(event);
    },
    
    _processQueue() {
      while (this._queue.length > 0) {
        this._sendEvent(this._queue.shift());
      }
    },
    
    _sendEvent(event) {
      if (typeof window.gtag === 'function') {
        window.gtag('event', event.eventName, event.parameters);
      } else {
        console.debug('Analytics:', event);
      }
    },
    
    _setupConsentUI() {
      const consentElement = $('#consent');
      if (!consentElement) return;
      
      const acceptButton = $('#btn-accept', consentElement);
      const declineButton = $('#btn-decline', consentElement);
      
      if (acceptButton) {
        EventManager.add(acceptButton, 'click', () => {
          this.setConsent(true);
          consentElement.hidden = true;
        });
      }
      
      if (declineButton) {
        EventManager.add(declineButton, 'click', () => {
          this.setConsent(false);
          consentElement.hidden = true;
        });
      }
      
      consentElement.hidden = false;
    }
  };

  // ===== 占いシステム =====
  const Fortune = {
    async loadMessages() {
      try {
        const response = await fetch('./assets/data/fortune_messages.json', {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Fortune messages loading failed:', error);
        return this._getFallbackData();
      }
    },

    _getFallbackData() {
      return {
        messages: {
          "総合": {
            "3": {
              "ルナル": "平常運。足場を固めておけ。",
              "アラン": "可もなく不可もなく。基本を丁寧に。",
              "リリア": "静かな日。無理せず整えて。"
            }
          }
        },
        weights: { "5": 18, "4": 32, "3": 30, "2": 15, "1": 5 }
      };
    },

    getTodaysMessage(character = null, category = "総合") {
      return this.loadMessages().then(data => {
        const messages = data.messages;
        const weights = data.weights || { "5": 18, "4": 32, "3": 30, "2": 15, "1": 5 };
        
        if (!messages[category]) {
          return { message: "お疲れ様でした。今日も一日、お疲れ様でした。", score: 3 };
        }

        // 今日の運勢スコアを決定（日付ベースの擬似ランダム）
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        const score = this._getWeightedScore(weights, seed);
        
        const categoryMessages = messages[category][score];
        if (!categoryMessages) {
          return { message: "お疲れ様でした。今日も一日、お疲れ様でした。", score: 3 };
        }

        let message;
        if (character && categoryMessages[character]) {
          message = categoryMessages[character];
        } else {
          // キャラクターが指定されていないか、該当メッセージがない場合はランダム選択
          const availableMessages = Object.values(categoryMessages);
          const messageIndex = seed % availableMessages.length;
          message = availableMessages[messageIndex];
        }

        return { message, score, character };
      });
    },

    _getWeightedScore(weights, seed) {
      const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
      let random = (seed * 9301 + 49297) % 233280;
      random = (random / 233280) * total;
      
      let cumulative = 0;
      for (const [score, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (random < cumulative) {
          return score;
        }
      }
      
      return "3"; // フォールバック
    }
  };

  // ===== グローバルエクスポート =====
  window.SiteCore = {
    // 元の関数（下位互換性）
    $, $$, esc,
    ArchetypeStore,
    Avatar,
    
    // 新しい機能
    DOM,
    Security,
    Storage,
    EventManager,
    Analytics,
    Fortune
  };

  // ===== 初期化 =====
  document.addEventListener('DOMContentLoaded', () => {
    Analytics.init();
  });

})();