(function() {
  'use strict';

  // SiteCoreの利用可能性確認
  let core = null;
  
  // フォールバック用の基本関数
  const fallback = {
    $: (s) => document.querySelector(s),
    $$: (s) => Array.from(document.querySelectorAll(s)),
    esc: (s) => String(s || '').replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]))
  };

  class FortuneApp {
    constructor() {
      this.core = window.SiteCore || fallback;
      this.offsetDays = 0;
      this.elements = {};
      this.isInitialized = false;
      
      // バインディング
      this.handleGetFortune = this.handleGetFortune.bind(this);
      this.handleCharacterSelect = this.handleCharacterSelect.bind(this);
      this.handleCalendarNavigation = this.handleCalendarNavigation.bind(this);
    }

    async init() {
      if (this.isInitialized) return;
      
      try {
        this._cacheElements();
        this._setupEventListeners();
        this._updateCalendar();
        await this._updateQuote();
        
        this.isInitialized = true;
        console.log('FortuneApp initialized successfully');
      } catch (error) {
        console.error('FortuneApp initialization failed:', error);
      }
    }

    _cacheElements() {
      const queries = {
        ctaButton: '#ctaGet',
        resultSection: '#result',
        resultBox: '#resultBox',
        characterButtons: '#charButtons button, #charButtons [data-char]',
        calendarDate: '#calDate',
        calendarQuote: '#calQuote',
        quoteText: '#quoteText',
        quoteAuthor: '#quoteAuthor',
        prevButton: '#btnPrevDay',
        nextButton: '#btnNextDay'
      };

      Object.entries(queries).forEach(([key, selector]) => {
        if (selector.includes(',')) {
          this.elements[key] = this.core.$$?.(selector.split(',')[0]) || 
                               Array.from(document.querySelectorAll(selector));
        } else {
          this.elements[key] = this.core.$?.(selector) || document.querySelector(selector);
        }
      });
    }

    _setupEventListeners() {
      // メインCTAボタン
      if (this.elements.ctaButton) {
        this.elements.ctaButton.addEventListener('click', this.handleGetFortune);
      }

      // キャラクター選択ボタン
      if (this.elements.characterButtons) {
        this.elements.characterButtons.forEach(button => {
          button.addEventListener('click', (event) => {
            this.handleCharacterSelect(event.currentTarget);
          });
        });
      }

      // カレンダーナビゲーション
      if (this.elements.prevButton) {
        this.elements.prevButton.addEventListener('click', () => {
          this.handleCalendarNavigation('prev');
        });
      }

      if (this.elements.nextButton) {
        this.elements.nextButton.addEventListener('click', () => {
          this.handleCalendarNavigation('next');
        });
      }
    }

    // ===== イベントハンドラー =====
    async handleGetFortune() {
      try {
        let fortuneData;
        
        if (this.core.Fortune) {
          // 新しいFortune APIを使用
          fortuneData = await this.core.Fortune.getTodaysMessage();
        } else {
          // フォールバック: 旧来の方式
          fortuneData = await this._loadFortuneDataFallback();
        }
        
        this._renderResult({
          character: null,
          message: fortuneData.message || 'お疲れ様でした。今日も一日、お疲れ様でした。',
          score: fortuneData.score
        });

        // アナリティクス
        if (this.core.Analytics) {
          this.core.Analytics.track('view_today_overall', { page: 'index' });
        }
      } catch (error) {
        console.error('Fortune loading failed:', error);
        this._renderError('占い結果の取得に失敗しました。しばらく後にお試しください。');
      }
    }

    async handleCharacterSelect(button) {
      if (!button) return;

      try {
        const characterName = button.getAttribute('data-char') || button.textContent.trim();
        const archetypeId = button.getAttribute('data-archid');

        // アーキタイプIDの保存
        if (archetypeId) {
          if (this.core.Storage) {
            this.core.Storage.set(this.core.Storage.KEYS.ARCHETYPE_ID, archetypeId);
          } else if (this.core.ArchetypeStore) {
            this.core.ArchetypeStore.set(archetypeId);
          }
        }

        let fortuneData;
        
        if (this.core.Fortune) {
          // キャラクター指定で占い取得
          fortuneData = await this.core.Fortune.getTodaysMessage(characterName);
        } else {
          // フォールバック
          fortuneData = await this._loadFortuneDataFallback();
        }

        this._renderResult({
          character: characterName,
          message: fortuneData.message || 'お疲れ様でした。今日も一日、お疲れ様でした。',
          score: fortuneData.score
        });

        // アナリティクス
        if (this.core.Analytics) {
          this.core.Analytics.track('character_select', {
            character: characterName,
            archetype_id: archetypeId
          });
        }
      } catch (error) {
        console.error('Character selection failed:', error);
        this._renderError('キャラクター選択に失敗しました。');
      }
    }

    handleCalendarNavigation(direction) {
      switch (direction) {
        case 'prev':
          this.offsetDays -= 1;
          break;
        case 'next':
          this.offsetDays += 1;
          break;
      }

      this._updateCalendar();
      
      if (this.core.Analytics) {
        this.core.Analytics.track('nav_calendar', { direction });
      }
    }

    // ===== データ取得 =====
    async _loadFortuneDataFallback() {
      try {
        const response = await fetch('./assets/data/fortune_messages.json', {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // 簡単な今日のメッセージ取得（総合運の平均スコア）
        const messages = data.messages?.["総合"]?.["3"];
        if (messages) {
          const messageList = Object.values(messages);
          const randomIndex = Math.floor(Math.random() * messageList.length);
          return {
            message: messageList[randomIndex],
            score: 3
          };
        }

        return {
          message: 'お疲れ様でした。今日も一日、お疲れ様でした。',
          score: 3
        };
      } catch (error) {
        console.error('Fortune data loading failed:', error);
        throw error;
      }
    }

    // ===== UI更新 =====
    _renderResult({ character, message, score }) {
      if (!this.elements.resultSection || !this.elements.resultBox) {
        console.error('Result elements not found');
        return;
      }

      // スコアに応じた表示調整
      const scoreText = this._getScoreText(score);
      const scoreClass = this._getScoreClass(score);

      let resultHTML = '';
      
      if (this.core.DOM && this.core.DOM.createElement) {
        // 新しいDOM操作を使用
        this._renderResultWithDOM({ character, message, score, scoreText, scoreClass });
      } else {
        // フォールバック: innerHTML使用
        const escapedMessage = this.core.esc ? this.core.esc(message) : this._escapeHtml(message);
        const escapedCharacter = character ? (this.core.esc ? this.core.esc(character) : this._escapeHtml(character)) : null;
        
        resultHTML = `
          <h3>${escapedCharacter ? `${escapedCharacter} からの今日の言葉` : '今日の言葉'}</h3>
          ${scoreText ? `<div class="score ${scoreClass}">${scoreText}</div>` : ''}
          <p>${escapedMessage}</p>
          <div class="paywall">
            <p class="lead">9カテゴリの詳細は有料会員限定です。</p>
            <div class="actions">
              <button class="btn">会員登録</button>
              <button class="btn ghost">詳細</button>
            </div>
          </div>
        `;
        
        this.elements.resultBox.innerHTML = resultHTML;
      }

      this.elements.resultSection.style.display = 'block';
      this.elements.resultSection.setAttribute('aria-live', 'polite');
    }

    _renderResultWithDOM({ character, message, score, scoreText, scoreClass }) {
      const heading = this.core.DOM.createElement('h3', {}, [
        character ? `${character} からの今日の言葉` : '今日の言葉'
      ]);

      const messageP = this.core.DOM.createElement('p', {}, [message]);

      const paywall = this.core.DOM.createElement('div', { className: 'paywall' });
      const paywallText = this.core.DOM.createElement('p', { className: 'lead' }, [
        '9カテゴリの詳細は有料会員限定です。'
      ]);
      paywall.appendChild(paywallText);

      this.elements.resultBox.innerHTML = '';
      this.elements.resultBox.appendChild(heading);
      
      if (scoreText) {
        const scoreDiv = this.core.DOM.createElement('div', {
          className: `score ${scoreClass}`
        }, [scoreText]);
        this.elements.resultBox.appendChild(scoreDiv);
      }
      
      this.elements.resultBox.appendChild(messageP);
      this.elements.resultBox.appendChild(paywall);
    }

    _renderError(errorMessage) {
      if (!this.elements.resultSection || !this.elements.resultBox) return;

      const escapedMessage = this.core.esc ? this.core.esc(errorMessage) : this._escapeHtml(errorMessage);
      
      this.elements.resultBox.innerHTML = `
        <div class="error-message" style="color: #ff6b6b; font-weight: bold; padding: 1rem; border: 1px solid #ff6b6b; border-radius: 0.5rem;">
          ${escapedMessage}
        </div>
      `;
      
      this.elements.resultSection.style.display = 'block';
    }

    _updateCalendar() {
      if (!this.elements.calendarDate) return;

      const baseDate = new Date();
      const targetDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate() + this.offsetDays
      );

      const formattedDate = this._formatDate(targetDate);
      
      if (this.core.Security) {
        this.core.Security.updateContent(this.elements.calendarDate, formattedDate);
      } else {
        this.elements.calendarDate.textContent = formattedDate;
      }
    }

    async _updateQuote() {
      const quoteData = {
        text: '静かな観察が、次の一手を照らす。',
        author: '— 銀竜の記録より'
      };

      if (this.elements.quoteText) {
        if (this.core.Security) {
          this.core.Security.updateContent(this.elements.quoteText, quoteData.text);
        } else {
          this.elements.quoteText.textContent = quoteData.text;
        }
      }

      if (this.elements.quoteAuthor) {
        if (this.core.Security) {
          this.core.Security.updateContent(this.elements.quoteAuthor, quoteData.author);
        } else {
          this.elements.quoteAuthor.textContent = quoteData.author;
        }
      }
    }

    // ===== ユーティリティ =====
    _formatDate(date) {
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}月${day}日`;
    }

    _getScoreText(score) {
      const scoreMap = {
        '5': '絶好調',
        '4': '好調',
        '3': '普通',
        '2': '注意',
        '1': '休息'
      };
      return scoreMap[String(score)] || '';
    }

    _getScoreClass(score) {
      const classMap = {
        '5': 'excellent',
        '4': 'good', 
        '3': 'normal',
        '2': 'caution',
        '1': 'rest'
      };
      return classMap[String(score)] || 'normal';
    }

    _escapeHtml(text) {
      return String(text || '').replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }

    // ===== クリーンアップ =====
    destroy() {
      if (this.core && this.core.EventManager) {
        this.core.EventManager.removeAll();
      }
      this.isInitialized = false;
    }
  }

  // ===== ナビゲーション管理（元の機能を維持） =====
  function updateNavigation() {
    const path = location.pathname.split('/').pop() || 'index.html';
    
    // 下部ナビゲーション
    document.querySelectorAll('.bottom-nav a, nav.gnav a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const active = href.endsWith(path);
      if (active) {
        a.classList.add('bn-accent');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('bn-accent');
        a.removeAttribute('aria-current');
      }
    });

    // タブバー
    document.querySelectorAll('.tabbar .tabbar-item').forEach(a => {
      const href = (a.getAttribute('href') || '').split('/').pop();
      if (href === path) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'page');
      } else {
        a.classList.remove('is-active');
        a.removeAttribute('aria-current');
      }
    });
  }

  // ===== アプリケーション初期化 =====
  let app = null;

  async function initializeApp() {
    try {
      // SiteCoreの準備完了を待つ（最大3秒）
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!window.SiteCore && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (window.SiteCore) {
        console.log('SiteCore detected, using enhanced features');
        core = window.SiteCore;
      } else {
        console.log('SiteCore not available, using fallback functionality');
        core = fallback;
      }

      app = new FortuneApp();
      await app.init();
      updateNavigation();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('App initialization failed:', error);
      
      // 基本的な機能だけでも動作させる
      try {
        updateNavigation();
        console.log('Basic navigation initialized');
      } catch (navError) {
        console.error('Navigation initialization failed:', navError);
      }
    }
  }

  // ===== DOM準備完了時の初期化 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    // すでにDOMが読み込まれている場合
    setTimeout(initializeApp, 0);
  }

  // クリーンアップ
  window.addEventListener('beforeunload', () => {
    if (app && app.destroy) {
      app.destroy();
    }
  });

})();