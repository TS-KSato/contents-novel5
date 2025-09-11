
(function() {
  'use strict';

  class MusicApp {
    constructor() {
      this.core = window.SiteCore;
      this.tracks = [];
      this.currentTrack = null;
      this.activeFilter = "all";
      this.audio = null;
      this.elements = {};
      
      this.init();
    }

    async init() {
      try {
        this._setupAudio();
        this._cacheElements();
        await this._loadTracks();
        this._setupEventListeners();
        this._buildFilterTabs();
        this._render();
        
        console.log('MusicApp initialized successfully');
      } catch (error) {
        console.error('MusicApp initialization failed:', error);
        this._renderError('音楽データの読み込みに失敗しました。');
      }
    }

    _setupAudio() {
      // 既存のaudio要素があるかチェック
      this.audio = document.querySelector('audio');
      
      if (!this.audio) {
        this.audio = document.createElement('audio');
        this.audio.preload = 'metadata';
        this.audio.style.display = 'none';
        document.body.appendChild(this.audio);
      }

      // オーディオイベントリスナー
      this.audio.addEventListener('ended', () => {
        this._onTrackEnded();
      });

      this.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        this._showNotification('音楽の再生に失敗しました。');
      });
    }

    _cacheElements() {
      this.elements = {
        grid: document.getElementById('list'),  // music.htmlでは id="list"
        tabs: document.getElementById('tabs')
      };

      // 要素が見つからない場合のフォールバック
      if (!this.elements.grid) {
        console.warn('Grid element not found, creating fallback');
        this.elements.grid = document.querySelector('main') || document.body;
      }
    }

    async _loadTracks() {
      try {
        const response = await fetch('./assets/data/tracks.json', {
          cache: 'no-cache',
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        this.tracks = (Array.isArray(data) ? data : []).map(this._normalizeTrack);
        
        if (this.tracks.length === 0) {
          throw new Error('トラックデータが見つかりませんでした');
        }
      } catch (error) {
        console.error('Tracks loading failed:', error);
        this.tracks = this._getFallbackTracks();
      }
    }

    _normalizeTrack(track) {
      return {
        id: String(track.id || ''),
        name: String(track.name || ''),
        url: String(track.url || ''),
        art: String(track.art || ''),
        scene: String(track.scene || ''),
        bpm: Number.isFinite(track.bpm) ? track.bpm : null,
        duration: Number.isFinite(track.duration) ? track.duration : null,
        mood: String(track.mood || ''),
        theme: String(track.theme || ''),
        paid: Boolean(track.paid)
      };
    }

    _getFallbackTracks() {
      return [
        {
          id: 'f01',
          name: '銀翼の遺産',
          scene: '神聖な場所',
          mood: '壮大',
          theme: '守護',
          bpm: 70,
          duration: 210,
          url: '#',
          art: '',
          paid: false
        },
        {
          id: 'f02',
          name: '最後の守護者',
          scene: '古の伝承',
          mood: '荘厳',
          theme: '叡智',
          bpm: 60,
          duration: 240,
          url: '#',
          art: '',
          paid: false
        }
      ];
    }

    _setupEventListeners() {
      if (!this.elements.grid) return;

      // 再生ボタンのクリック処理
      this.elements.grid.addEventListener('click', (event) => {
        const button = event.target.closest('button.btn, a.btn');
        if (!button) return;

        const card = event.target.closest('.card, .item');
        if (!card) return;

        const trackId = card.getAttribute('data-id');
        const track = this.tracks.find(t => t.id === trackId);
        
        if (!track) return;

        this._handleTrackAction(track, button);
      });
    }

    _handleTrackAction(track, button) {
      if (track.paid) {
        this._showNotification('この楽曲は購入後にお楽しみいただけます。');
        return;
      }

      const action = button.dataset.action || 'play';
      
      switch (action) {
        case 'play':
          this._playTrack(track);
          break;
        case 'pause':
          this._pauseTrack();
          break;
        default:
          this._playTrack(track);
      }
    }

    _playTrack(track) {
      if (!track.url || track.url === '#') {
        this._showNotification('音楽ファイルが見つかりません。');
        return;
      }

      this.currentTrack = track.id;
      this.audio.src = track.url;
      
      this.audio.play().catch(error => {
        console.error('Play failed:', error);
        this._showNotification('音楽の再生に失敗しました。');
      });

      this._updatePlayButtons();
      
      // アナリティクス（日本語値に対応）
      if (this.core && this.core.Analytics) {
        this.core.Analytics.track('music_play', {
          track_id: track.id,
          track_name: track.name,
          mood: track.mood,           // 日本語値
          theme: track.theme          // theme フィールドを追加
        });
      }
    }

    _pauseTrack() {
      this.audio.pause();
      this._updatePlayButtons();
    }

    _onTrackEnded() {
      this.currentTrack = null;
      this._updatePlayButtons();
    }

    _updatePlayButtons() {
      if (!this.elements.grid) return;

      this.elements.grid.querySelectorAll('.card, .item').forEach(card => {
        const trackId = card.getAttribute('data-id');
        const button = card.querySelector('button.btn, a.btn');
        
        if (!button) return;

        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        if (track.paid) {
          button.textContent = '購入後再生';
          button.dataset.action = 'purchase';
          return;
        }

        if (trackId === this.currentTrack && !this.audio.paused) {
          button.textContent = '一時停止';
          button.dataset.action = 'pause';
        } else {
          button.textContent = '再生';
          button.dataset.action = 'play';
        }
      });
    }

    _buildFilterTabs() {
      if (!this.elements.tabs) return;

      // ユニークなmoodとthemeを抽出（変更: archetype → theme）
      const moods = [...new Set(this.tracks.map(t => t.mood).filter(Boolean))];
      const themes = [...new Set(this.tracks.map(t => t.theme).filter(Boolean))];

      const tabs = [
        { label: 'すべて', value: 'all' },
        ...moods.map(mood => ({ label: `${mood}`, value: `mood:${mood}` })),      // 変更: # を削除（日本語用）
        ...themes.map(theme => ({ label: `◆${theme}`, value: `theme:${theme}` })) // 変更: archetype → theme, @ → ◆
      ];

      this.elements.tabs.innerHTML = tabs.map(tab => 
        `<button class="tab ${tab.value === this.activeFilter ? 'active' : ''}" 
                 role="tab" 
                 aria-selected="${tab.value === this.activeFilter}"
                 data-filter="${this._escapeHtml(tab.value)}">
          ${this._escapeHtml(tab.label)}
         </button>`
      ).join('');

      // タブクリックイベント
      this.elements.tabs.addEventListener('click', (event) => {
        const tab = event.target.closest('.tab');
        if (!tab) return;

        this.activeFilter = tab.dataset.filter || 'all';
        this._updateActiveTab();
        this._render();
      });
    }

    _updateActiveTab() {
      if (!this.elements.tabs) return;

      this.elements.tabs.querySelectorAll('.tab').forEach(tab => {
        const isActive = tab.dataset.filter === this.activeFilter;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive);
      });
    }

    _render() {
      if (!this.elements.grid) return;

      const filteredTracks = this._filterTracks();
      
      if (filteredTracks.length === 0) {
        this.elements.grid.innerHTML = `
          <div class="muted" style="text-align: center; padding: 2rem; color: var(--muted);">
            該当する楽曲が見つかりませんでした。
          </div>
        `;
        return;
      }

      this.elements.grid.innerHTML = filteredTracks.map(track => 
        this._createTrackCard(track)
      ).join('');

      this._updatePlayButtons();
    }

    _filterTracks() {
      return this.tracks.filter(track => {
        if (this.activeFilter === 'all') return true;
        if (this.activeFilter.startsWith('mood:')) {
          return track.mood === this.activeFilter.slice(5);
        }
        if (this.activeFilter.startsWith('theme:')) {           // 変更: arch: → theme:
          return track.theme === this.activeFilter.slice(6);    // 変更: slice(5) → slice(6)
        }
        return true;
      });
    }

    _createTrackCard(track) {
      const artElement = track.art 
        ? `<div class="art" style="background-image:url('${this._escapeHtml(track.art)}')"></div>`
        : `<div class="art fallback" aria-label="アート未設定">${this._escapeHtml(track.name).slice(0,1)}</div>`;

      const duration = this._formatDuration(track.duration);
      
      // サブ情報の表示改善（sceneを追加）
      const subInfo = [
        track.scene ? `${track.scene}` : '',               // sceneを表示
        track.bpm ? `${track.bpm} bpm` : '',
        duration ? `${duration}` : ''
      ].filter(Boolean).join(' • ');

      return `
        <article class="card" data-id="${this._escapeHtml(track.id)}">
          ${artElement}
          <div class="meta">
            <div class="name" title="${this._escapeHtml(track.name)}">
              ${this._escapeHtml(track.name)}
            </div>
            <div class="sub" title="${this._escapeHtml(subInfo)}">${this._escapeHtml(subInfo)}</div>
            <div class="pill">${this._escapeHtml(track.mood || 'mood')}</div>
          </div>
          <div class="go">
            <button class="btn" data-action="play" ${track.paid ? 'aria-disabled="true"' : ''}>
              ${track.paid ? '購入後再生' : '再生'}
            </button>
          </div>
        </article>
      `;
    }

    _formatDuration(seconds) {
      if (!Number.isFinite(seconds)) return '';
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    _renderError(message) {
      if (!this.elements.grid) return;

      this.elements.grid.innerHTML = `
        <div class="error-message" style="
          text-align: center; 
          padding: 2rem; 
          color: #ff6b6b; 
          border: 1px solid #ff6b6b; 
          border-radius: 0.5rem; 
          background: rgba(255, 107, 107, 0.1);
        ">
          ${this._escapeHtml(message)}
        </div>
      `;
    }

    _showNotification(message) {
      // 簡易通知システム
      const notification = document.createElement('div');
      notification.className = 'music-notification';
      notification.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 1000;
        background: var(--card);
        color: var(--ink);
        border: 1px solid var(--line);
        border-radius: 0.5rem;
        padding: 1rem;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        transform: translateX(100%);
        transition: transform 0.3s ease;
      `;
      notification.textContent = message;

      document.body.appendChild(notification);

      // アニメーション
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);

      // 3秒後に削除
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }

    _escapeHtml(text) {
      if (this.core && this.core.Security) {
        return this.core.Security.escapeHtml(text);
      }
      
      return String(text || '').replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }

    // クリーンアップ
    destroy() {
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }
      this.currentTrack = null;
    }
  }

  // グローバル初期化
  let musicApp = null;

  function initializeMusicApp() {
    try {
      musicApp = new MusicApp();
    } catch (error) {
      console.error('Music app initialization failed:', error);
      
      // フォールバック表示
      const grid = document.getElementById('list') || document.querySelector('main');
      if (grid) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--muted);">
            音楽アプリの初期化に失敗しました。ページをリロードしてください。
          </div>
        `;
      }
    }
  }

  // DOM準備完了時の初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMusicApp);
  } else {
    setTimeout(initializeMusicApp, 0);
  }

  // クリーンアップ
  window.addEventListener('beforeunload', () => {
    if (musicApp && musicApp.destroy) {
      musicApp.destroy();
    }
  });

})();