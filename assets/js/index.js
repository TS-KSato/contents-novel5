(function() {
  'use strict';

  // Optional SiteCore
  let SiteCoreSafe = (typeof window !== 'undefined' && window.SiteCore && typeof window.SiteCore.Security === 'object')
    ? window.SiteCore
    : null;

  // ---------- Utilities ----------
  function formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function formatMMDD(date) {
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}-${dd}`;
  }
  // deterministic RNG helpers (date-based)
  function seededRandom(seed) {
    let x = seed | 0;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    const t = (x >>> 0) / 4294967296;
    return t < 0 ? (t + 1) : t;
  }
  function hashString(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function pickByWeights(weightsObj, rnd01) {
    const entries = Object.entries(weightsObj).sort((a,b)=>Number(b[0])-Number(a[0])); // score 5→1
    const total = entries.reduce((s, [,w])=>s+Number(w||0), 0) || 1;
    let acc = 0;
    const target = rnd01 * total;
    for (const [score, w] of entries) {
      acc += Number(w||0);
      if (target <= acc) return Number(score);
    }
    return Number(entries.at(-1)[0] || 3);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ---------- Boot ----------
  document.addEventListener('DOMContentLoaded', () => {
    const app = new SilverDragonApp({
      preload: {
        fortune: './assets/data/fortune_messages.json',
        quotes: './assets/data/quotes.json'
      }
    });
    app.init();
  });

  // ==============================
  // SilverDragonApp
  // ==============================
  class SilverDragonApp {
    constructor(options = {}) {
      this.preload = options.preload || {};
      this.core = SiteCoreSafe || { Security: null, Analytics: null };

      this.offsetDays = 0;
      this.selectedCharacter = null;

      this._fortuneCache = null;
      this._quotesCache = null;

      this.elements = {
        dateText: document.getElementById('calDate'),
        prevBtn: document.getElementById('btnPrevDay'),
        nextBtn: document.getElementById('btnNextDay'),

        quoteText: document.getElementById('quoteText'),
        quoteAuthor: document.getElementById('quoteAuthor'),

        fortuneSummary: document.getElementById('fortuneSummary'),
        fortuneDetails: document.getElementById('fortuneDetails'),

        // 占い師選択関連
        charButtons: document.getElementById('charButtons'),
        ctaButton: document.getElementById('ctaGet'),
        resultSection: document.getElementById('result'),
        resultBox: document.getElementById('resultBox')
      };
    }

    async init() {
      this._bindEvents();
      this._updateCalendar();

      const base = new Date();
      const today = new Date(base.getFullYear(), base.getMonth(), base.getDate() + this.offsetDays);

      await this._updateQuote(today);
      await this._updateFortune(today);
    }

    _bindEvents() {
      // カレンダーナビゲーション
      if (this.elements.prevBtn) {
        this.elements.prevBtn.addEventListener('click', () => this.handleCalendarNavigation('prev'));
      }
      if (this.elements.nextBtn) {
        this.elements.nextBtn.addEventListener('click', () => this.handleCalendarNavigation('next'));
      }

      // 占い師選択ボタン
      if (this.elements.charButtons) {
        this.elements.charButtons.addEventListener('click', (e) => {
          const button = e.target.closest('.character-button');
          if (button) {
            const character = button.dataset.char;
            const archId = button.dataset.archid;
            this.handleCharacterSelection(character, archId, button);
          }
        });
      }

      // CTAボタン
      if (this.elements.ctaButton) {
        this.elements.ctaButton.addEventListener('click', () => {
          this.handleCtaClick();
        });
      }
    }

    _updateCalendar() {
      const base = new Date();
      const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + this.offsetDays);
      const ymd = formatDateYYYYMMDD(target);

      if (this.elements.dateText) {
        if (this.core.Security?.updateContent) {
          this.core.Security.updateContent(this.elements.dateText, ymd);
        } else {
          this.elements.dateText.textContent = ymd;
        }
      }
    }

    handleCalendarNavigation(direction) {
      if (direction === 'prev') this.offsetDays -= 1;
      if (direction === 'next') this.offsetDays += 1;

      this._updateCalendar();

      const base = new Date();
      const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + this.offsetDays);

      this._updateQuote(target);
      this._updateFortune(target);

      // 占い師が選択されている場合は結果も更新
      if (this.selectedCharacter) {
        this._updateCharacterFortune(target, this.selectedCharacter);
      }

      this.core.Analytics?.track?.('nav_calendar', { direction, offsetDays: this.offsetDays });
    }

    handleCharacterSelection(character, archId, buttonElement) {
      this.selectedCharacter = character;
      
      // 選択状態の視覚的フィードバック
      this._updateCharacterButtonStates(buttonElement);
      
      // 占い師選択をストレージに保存
      if (SiteCoreSafe?.ArchetypeStore) {
        SiteCoreSafe.ArchetypeStore.set(archId);
      }
      
      // 現在の日付で占い結果を表示
      const base = new Date();
      const target = new Date(base.getFullYear(), base.getMonth(), base.getDate() + this.offsetDays);
      this._updateCharacterFortune(target, character);
      
      // アナリティクス
      this.core.Analytics?.track?.('character_selected', { 
        character, 
        archId,
        offsetDays: this.offsetDays 
      });
    }

    handleCtaClick() {
      // 占い師が選択されていない場合は促す
      if (!this.selectedCharacter) {
        const charSection = document.querySelector('#chooseCharacter');
        if (charSection) {
          charSection.scrollIntoView({ behavior: 'smooth' });
          this._showMessage('まず占い師を選択してください', 'info');
        }
        return;
      }

      // 結果セクションにスクロール
      if (this.elements.resultSection) {
        this.elements.resultSection.scrollIntoView({ behavior: 'smooth' });
      }

      this.core.Analytics?.track?.('cta_clicked', { 
        hasCharacter: !!this.selectedCharacter 
      });
    }

    _updateCharacterButtonStates(selectedButton) {
      if (!this.elements.charButtons) return;

      // 全てのボタンから選択状態を削除
      const allButtons = this.elements.charButtons.querySelectorAll('.character-button');
      allButtons.forEach(btn => {
        btn.classList.remove('selected');
        btn.setAttribute('aria-pressed', 'false');
      });

      // 選択されたボタンに状態を追加
      if (selectedButton) {
        selectedButton.classList.add('selected');
        selectedButton.setAttribute('aria-pressed', 'true');
      }
    }

    // ---------- Quotes (quotes.json) ----------
    async _loadQuotesIfNeeded() {
      if (this._quotesCache) return;
      const url = this.preload.quotes || './assets/data/quotes.json';
      const res = await fetch(url, { cache: 'no-cache', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`quotes.json HTTP ${res.status}`);
      this._quotesCache = await res.json();
    }

    async _updateQuote(date = new Date()) {
      try {
        await this._loadQuotesIfNeeded();
      } catch (e) {
        console.error('quotes loading failed:', e);
        this._applyQuoteToDOM({
          text: '静かな観察が、次の一手を照らす。',
          author: '— 銀竜の記録より'
        });
        return;
      }

      const key = formatMMDD(date);
      const list = this._quotesCache?.[key];

      let text = '静かな観察が、次の一手を照らす。';
      let author = '— 銀竜の記録より';

      if (Array.isArray(list) && list.length) {
        const pick = list[Math.floor(Math.random() * list.length)];
        if (pick && typeof pick === 'object') {
          if (typeof pick.text === 'string' && pick.text.trim()) text = pick.text;
          if (typeof pick.author === 'string' && pick.author.trim()) author = pick.author;
        }
      }

      this._applyQuoteToDOM({ text, author });
    }

    _applyQuoteToDOM({ text, author }) {
      if (this.elements.quoteText) {
        if (this.core.Security?.updateContent) {
          this.core.Security.updateContent(this.elements.quoteText, text);
        } else {
          this.elements.quoteText.textContent = text;
        }
      }
      if (this.elements.quoteAuthor) {
        if (this.core.Security?.updateContent) {
          this.core.Security.updateContent(this.elements.quoteAuthor, author);
        } else {
          this.elements.quoteAuthor.textContent = author;
        }
      }
    }

    // ---------- Fortune (fortune_messages.json) ----------
    async _loadFortuneIfNeeded() {
      if (this._fortuneCache) return;
      const url = this.preload.fortune || './assets/data/fortune_messages.json';
      const res = await fetch(url, { cache: 'no-cache', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`fortune_messages.json HTTP ${res.status}`);
      this._fortuneCache = await res.json();
    }

    /**
     * カレンダーセクションの占い表示（総合的な内容）
     */
    async _updateFortune(date = new Date()) {
      try {
        await this._loadFortuneIfNeeded();
      } catch (e) {
        console.error('fortune loading failed:', e);
        this._applyFortuneToDOM({
          summary: '今日は足元を整えると良い兆し。焦らず、一歩ずつ。',
          details: []
        });
        return;
      }

      const f = this._fortuneCache;
      const meta = f?.meta || {};
      const weights = f?.weights || {};
      const categories = Array.isArray(f?.categories) ? f.categories : [];
      const messages = f?.messages || {};

      const ymd = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const seed = hashString(ymd);

      const score = pickByWeights(weights, seededRandom(seed + 11));
      const chars = Array.isArray(meta.characters) ? meta.characters : [];
      const char = chars.length ? chars[Math.floor(seededRandom(seed + 23) * chars.length)] : null;

      const summary =
        messages?.['総合']?.[String(score)]?.[char] ||
        '静かな巡りの中に、確かな兆しがある。';

      const freeCats = new Set(Array.isArray(meta.free_categories) ? meta.free_categories : []);
      const details = [];

      for (const c of categories) {
        const key = c.key;
        const paid = !!c.paid;

        const text = messages?.[key]?.[String(score)]?.[char] || '';
        if (!text) continue;

        if (paid && !freeCats.has(key)) {
          details.push({
            title: key,
            message: '🔒 この項目は会員限定です。ログイン/ご登録で表示されます。'
          });
        } else {
          details.push({ title: key, message: text });
        }
      }

      this._applyFortuneToDOM({ summary, details });
    }

    /**
     * 占い師選択時の個別結果表示
     */
    async _updateCharacterFortune(date = new Date(), character) {
      try {
        await this._loadFortuneIfNeeded();
      } catch (e) {
        console.error('fortune loading failed:', e);
        this._showCharacterResult({
          character,
          summary: '今日はあなたにとって穏やかな一日となりそうです。',
          details: [],
          score: 3
        });
        return;
      }

      const f = this._fortuneCache;
      const weights = f?.weights || {};
      const categories = Array.isArray(f?.categories) ? f.categories : [];
      const messages = f?.messages || {};

      const ymd = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const seed = hashString(ymd + character); // キャラクター別にシードを変える

      const score = pickByWeights(weights, seededRandom(seed));

      // 指定キャラクターのメッセージを取得
      const summary = messages?.['総合']?.[String(score)]?.[character] || 
                     '今日はあなたにとって穏やかな一日となりそうです。';

      const freeCats = new Set(Array.isArray(f?.meta?.free_categories) ? f.meta.free_categories : []);
      const details = [];

      for (const c of categories) {
        const key = c.key;
        const paid = !!c.paid;

        const text = messages?.[key]?.[String(score)]?.[character] || '';
        if (!text) continue;

        if (paid && !freeCats.has(key)) {
          details.push({
            title: key,
            message: '🔒 この項目は会員限定です。'
          });
        } else {
          details.push({ title: key, message: text });
        }
      }

      this._showCharacterResult({
        character,
        summary,
        details,
        score
      });
    }

    _applyFortuneToDOM({ summary, details }) {
      if (this.elements.fortuneSummary) {
        if (this.core.Security?.updateContent) {
          this.core.Security.updateContent(this.elements.fortuneSummary, summary);
        } else {
          this.elements.fortuneSummary.textContent = summary;
        }
      }

      if (this.elements.fortuneDetails) {
        this.elements.fortuneDetails.innerHTML = '';

        if (Array.isArray(details) && details.length) {
          for (const item of details) {
            const row = document.createElement('div');
            row.className = 'fortune-row';

            const h = document.createElement('div');
            h.className = 'fortune-title';
            h.textContent = item.title || '';

            const p = document.createElement('div');
            p.className = 'fortune-message';
            p.textContent = item.message || '';

            row.appendChild(h);
            row.appendChild(p);
            this.elements.fortuneDetails.appendChild(row);
          }
        } else {
          const empty = document.createElement('div');
          empty.className = 'fortune-empty';
          empty.textContent = '詳細メッセージは準備中です。';
          this.elements.fortuneDetails.appendChild(empty);
        }
      }
    }

    _showCharacterResult({ character, summary, details, score }) {
      if (!this.elements.resultSection || !this.elements.resultBox) return;

      // スコアに応じたクラス
      const scoreClass = this._getScoreClass(score);
      const scoreName = this._getScoreName(score);

      // 結果HTMLの構築
      let html = `
        <div class="fortune-character">
          <div class="fortune-character-info">
            <strong>${escapeHtml(character)}からのメッセージ</strong>
            <span class="score ${scoreClass}">${scoreName}</span>
          </div>
        </div>
        <div class="fortune-summary">
          <p>${escapeHtml(summary)}</p>
        </div>
      `;

      if (details.length > 0) {
        html += '<div class="fortune-details">';
        for (const item of details) {
          html += `
            <div class="fortune-detail-item">
              <h4>${escapeHtml(item.title)}</h4>
              <p>${escapeHtml(item.message)}</p>
            </div>
          `;
        }
        html += '</div>';
      }

      this.elements.resultBox.innerHTML = html;
      this.elements.resultSection.style.display = 'block';
      
      // 結果セクションにスクロール（少し遅延させる）
      setTimeout(() => {
        this.elements.resultSection.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }

    _getScoreClass(score) {
      const classMap = {
        5: 'excellent',
        4: 'good', 
        3: 'normal',
        2: 'caution',
        1: 'rest'
      };
      return classMap[score] || 'normal';
    }

    _getScoreName(score) {
      const nameMap = {
        5: '最高運',
        4: '好調',
        3: '普通',
        2: '注意',
        1: '休息'
      };
      return nameMap[score] || '普通';
    }

    _showMessage(message, type = 'info') {
      // 簡単なメッセージ表示（エラーシステムを活用）
      const errorEl = document.getElementById('errorNotification');
      const msgEl = document.getElementById('errorMessage');
      
      if (errorEl && msgEl) {
        msgEl.textContent = message;
        errorEl.hidden = false;
        
        setTimeout(() => {
          errorEl.hidden = true;
        }, 3000);
      }
    }
  }

  window.SilverDragonApp = SilverDragonApp;
})();