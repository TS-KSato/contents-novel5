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
      this.blobUrls = new Map();
      this.preloadedTracks = new Map();
      this.devToolsCheckInterval = null;
      
      this.init();
    }

    async init() {
      try {
        console.log('[MusicApp] Initialization started');
        
        this._setupAudio();
        console.log('[MusicApp] Audio setup complete');
        
        this._setupWebAudio();
        console.log('[MusicApp] Web Audio setup complete');
        
        this._cacheElements();
        console.log('[MusicApp] Elements cached');
        
        await this._loadTracks();
        console.log('[MusicApp] Tracks loaded:', this.tracks.length);
        
        this._setupEventListeners();
        console.log('[MusicApp] Event listeners setup');
        
        this._setupVolumeControl();
        console.log('[MusicApp] Volume control setup');
        
        this._setupProtection();
        console.log('[MusicApp] Protection setup');
        
        this._startDevToolsDetection();
        console.log('[MusicApp] DevTools detection started');
        
        this._buildFilterTabs();
        console.log('[MusicApp] Filter tabs built');
        
        this._render();
        console.log('[MusicApp] Initial render complete');
        
        console.log('[MusicApp] Initialization successful');
      } catch (error) {
        console.error('[MusicApp] Initialization failed:', error);
        this._renderError('音楽データの読み込みに失敗しました: ' + error.message);
      }
    }

    _setupAudio() {
      this.audio = document.querySelector('audio#musicPlayer');
      
      if (!this.audio) {
        console.warn('[MusicApp] Audio element not found, creating new one');
        this.audio = document.createElement('audio');
        this.audio.id = 'musicPlayer';
        this.audio.preload = 'metadata';
        this.audio.style.display = 'none';
        document.body.appendChild(this.audio);
      }

      this.audio.addEventListener('ended', () => this._onTrackEnded());
      this.audio.addEventListener('error', (e) => this._onAudioError(e));
      this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
      this.audio.addEventListener('progress', () => this._onProgress());
      this.audio.addEventListener('waiting', () => this._onWaiting());
      this.audio.addEventListener('canplay', () => this._onCanPlay());
      this.audio.addEventListener('loadedmetadata', () => this._onLoadedMetadata());
      this.audio.addEventListener('contextmenu', e => e.preventDefault());
      this.audio.addEventListener('dragstart', e => e.preventDefault());
    }

    _setupWebAudio() {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) {
          console.warn('[MusicApp] Web Audio API not supported');
          return;
        }
        
        this.audioContext = new AudioContext();
        this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        this.gainNode = this.audioContext.createGain();
        this.audioSource.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
        console.log('[MusicApp] Web Audio API initialized');
      } catch (error) {
        console.warn('[MusicApp] Web Audio API setup failed:', error);
      }
    }

    _cacheElements() {
      this.elements = {
        grid: document.getElementById('list'),
        tabs: document.getElementById('tabs'),
        volumeSlider: document.getElementById('volumeSlider'),
        bufferingIndicator: document.getElementById('bufferingIndicator')
      };

      console.log('[MusicApp] Elements found:', {
        grid: !!this.elements.grid,
        tabs: !!this.elements.tabs,
        volumeSlider: !!this.elements.volumeSlider,
        bufferingIndicator: !!this.elements.bufferingIndicator
      });

      if (!this.elements.grid) {
        throw new Error('Grid element (#list) not found');
      }
    }

    _setupVolumeControl() {
      if (!this.elements.volumeSlider) {
        console.warn('[MusicApp] Volume slider not found');
        return;
      }

      try {
        const savedVolume = localStorage.getItem('music_volume');
        if (savedVolume) {
          this.elements.volumeSlider.value = savedVolume;
          this.audio.volume = savedVolume / 100;
        } else {
          this.audio.volume = this.elements.volumeSlider.value / 100;
        }

        this.elements.volumeSlider.addEventListener('input', (e) => {
          this.audio.volume = e.target.value / 100;
          localStorage.setItem('music_volume', e.target.value);
        });
      } catch (error) {
        console.warn('[MusicApp] Volume control setup failed:', error);
      }
    }

    _setupProtection() {
      if (!this.elements.grid) return;

      this.elements.grid.addEventListener('contextmenu', (e) => {
        if (e.target.closest('.card')) {
          e.preventDefault();
        }
      });

      this.elements.grid.addEventListener('dragstart', (e) => {
        if (e.target.closest('.card')) {
          e.preventDefault();
        }
      });
    }

    _startDevToolsDetection() {
      try {
        const threshold = 160;
        this.devToolsCheckInterval = setInterval(() => {
          if (window.outerWidth - window.innerWidth > threshold ||
              window.outerHeight - window.innerHeight > threshold) {
            if (this.currentTrack && !this.audio.paused) {
              this._pauseTrack();
              this._showNotification('開発者ツールが検出されました');
            }
          }
        }, 2000);
      } catch (error) {
        console.warn('[MusicApp] DevTools detection setup failed:', error);
      }
    }

    async _loadTracks() {
      try {
        console.log('[MusicApp] Fetching music.json...');
        const response = await fetch('./assets/data/music.json', {
          cache: 'no-cache',
          headers: { 
            'Accept': 'application/json'
          }
        });

        console.log('[MusicApp] Response status:', response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('[MusicApp] JSON parsed, tracks count:', data.length);
        
        this.tracks = (Array.isArray(data) ? data : []).map(t => this._normalizeTrack(t));
        
        if (this.tracks.length === 0) {
          throw new Error('トラックデータが見つかりませんでした');
        }

        console.log('[MusicApp] Normalized tracks:', this.tracks.length);
      } catch (error) {
        console.error('[MusicApp] Track loading failed:', error);
        this.tracks = this._getFallbackTracks();
        console.log('[MusicApp] Using fallback tracks:', this.tracks.length);
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

    async _loadSecureAudio(url) {
      if (this.blobUrls.has(url)) {
        return this.blobUrls.get(url);
      }

      try {
        const response = await fetch(url, {
          credentials: 'same-origin'
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        if (this.blobUrls.size >= 10) {
          const firstKey = this.blobUrls.keys().next().value;
          const firstValue = this.blobUrls.get(firstKey);
          URL.revokeObjectURL(firstValue);
          this.blobUrls.delete(firstKey);
        }
        
        this.blobUrls.set(url, blobUrl);
        return blobUrl;
      } catch (error) {
        console.error('[MusicApp] Secure audio loading failed:', error);
        return url;
      }
    }

    _setupEventListeners() {
      if (!this.elements.grid) return;

      this.elements.grid.addEventListener('click', async (event) => {
        const button = event.target.closest('button.btn, a.btn');
        if (button) {
          const card = event.target.closest('.card, .item');
          if (card) {
            const trackId = card.getAttribute('data-id');
            const track = this.tracks.find(t => t.id === trackId);
            if (track) {
              await this._handleTrackAction(track, button);
            }
          }
          return;
        }

        const progressBar = event.target.closest('.progress-bar');
        if (progressBar && this.currentTrack) {
          const rect = progressBar.getBoundingClientRect();
          const percent = (event.clientX - rect.left) / rect.width;
          this.audio.currentTime = this.audio.duration * percent;
        }
      });
    }

    async _handleTrackAction(track, button) {
      if (track.paid) {
        this._showNotification('この楽曲は購入後にお楽しみいただけます。');
        return;
      }

      const action = button.dataset.action || 'play';
      
      if (action === 'pause') {
        this._pauseTrack();
      } else {
        await this._playTrackWithRetry(track);
      }
    }

    async _playTrackWithRetry(track, maxRetries = 3) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this._playTrack(track);
          return;
        } catch (error) {
          console.error(`[MusicApp] Play attempt ${i + 1} failed:`, error);
          if (i === maxRetries - 1) {
            this._showNotification('音楽の再生に失敗しました。');
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        }
      }
    }

    async _playTrack(track) {
      if (!track.url || track.url === '#') {
        this._showNotification('音楽ファイルが見つかりません。');
        return;
      }

      const secureUrl = await this._loadSecureAudio(track.url);
      
      this.currentTrack = track.id;
      this.audio.src = secureUrl;
      
      await this.audio.play();

      this._updatePlayButtons();
      this._savePlayHistory(track);
      this._preloadNextTrack();
      
      if (this.core && this.core.Analytics) {
        this.core.Analytics.track('music_play', {
          track_id: track.id,
          track_name: track.name,
          mood: track.mood,
          theme: track.theme
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

    _onAudioError(e) {
      console.error('[MusicApp] Audio error:', e);
      this._hideBuffering();
      this._showNotification('音楽の再生に失敗しました。');
    }

    _preloadNextTrack() {
      const currentIndex = this.tracks.findIndex(t => t.id === this.currentTrack);
      if (currentIndex === -1) return;

      const nextTrack = this.tracks[currentIndex + 1];
      
      if (nextTrack && !this.preloadedTracks.has(nextTrack.id)) {
        this._loadSecureAudio(nextTrack.url).then(blobUrl => {
          this.preloadedTracks.set(nextTrack.id, blobUrl);
        }).catch(error => {
          console.warn('[MusicApp] Preload failed:', error);
        });
      }
    }

    _savePlayHistory(track) {
      try {
        const history = JSON.parse(localStorage.getItem('music_play_history') || '[]');
        history.unshift({
          id: track.id,
          name: track.name,
          playedAt: new Date().toISOString()
        });
        localStorage.setItem('music_play_history', JSON.stringify(history.slice(0, 50)));
      } catch (error) {
        console.warn('[MusicApp] Failed to save play history:', error);
      }
    }

    _onTimeUpdate() {
      if (!this.currentTrack) return;

      const card = this.elements.grid.querySelector(`[data-id="${this.currentTrack}"]`);
      if (!card) return;

      const progressFill = card.querySelector('.progress-fill');
      const currentTimeEl = card.querySelector('.current-time');

      if (progressFill && this.audio.duration) {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        progressFill.style.width = `${percent}%`;
      }

      if (currentTimeEl) {
        currentTimeEl.textContent = this._formatDuration(this.audio.currentTime);
      }
    }

    _onProgress() {
      if (!this.currentTrack) return;

      const card = this.elements.grid.querySelector(`[data-id="${this.currentTrack}"]`);
      if (!card) return;

      const progressBuffer = card.querySelector('.progress-buffer');

      if (progressBuffer && this.audio.buffered.length > 0 && this.audio.duration) {
        const bufferedPercent = (this.audio.buffered.end(0) / this.audio.duration) * 100;
        progressBuffer.style.width = `${bufferedPercent}%`;
      }
    }

    _onWaiting() {
      this._showBuffering();
    }

    _onCanPlay() {
      this._hideBuffering();
    }

    _onLoadedMetadata() {
      if (!this.currentTrack) return;

      const card = this.elements.grid.querySelector(`[data-id="${this.currentTrack}"]`);
      if (!card) return;

      const totalTimeEl = card.querySelector('.total-time');
      if (totalTimeEl) {
        totalTimeEl.textContent = this._formatDuration(this.audio.duration);
      }
    }

    _showBuffering() {
      if (this.elements.bufferingIndicator) {
        this.elements.bufferingIndicator.hidden = false;
      }
    }

    _hideBuffering() {
      if (this.elements.bufferingIndicator) {
        this.elements.bufferingIndicator.hidden = true;
      }
    }

    _updatePlayButtons() {
      if (!this.elements.grid) return;

      this.elements.grid.querySelectorAll('.card, .item').forEach(card => {
        const trackId = card.getAttribute('data-id');
        const button = card.querySelector('button.btn, a.btn');
        
        if (!button) return;

        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        if (trackId === this.currentTrack && !this.audio.paused) {
          card.setAttribute('data-playing', 'true');
        } else {
          card.removeAttribute('data-playing');
        }

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

      const moods = [...new Set(this.tracks.map(t => t.mood).filter(Boolean))];
      const themes = [...new Set(this.tracks.map(t => t.theme).filter(Boolean))];

      const tabs = [
        { label: 'すべて', value: 'all' },
        ...moods.map(mood => ({ label: `${mood}`, value: `mood:${mood}` })),
        ...themes.map(theme => ({ label: `◆${theme}`, value: `theme:${theme}` }))
      ];

      this.elements.tabs.innerHTML = tabs.map(tab => 
        `<button class="tab ${tab.value === this.activeFilter ? 'active' : ''}" 
                 role="tab" 
                 aria-selected="${tab.value === this.activeFilter}"
                 data-filter="${this._escapeHtml(tab.value)}">
          ${this._escapeHtml(tab.label)}
         </button>`
      ).join('');

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
      if (!this.elements.grid) {
        console.error('[MusicApp] Grid element not found in _render');
        return;
      }

      console.log('[MusicApp] Rendering started');
      console.log('[MusicApp] Grid current HTML length:', this.elements.grid.innerHTML.length);
      console.log('[MusicApp] Grid children count:', this.elements.grid.children.length);

      const filteredTracks = this._filterTracks();
      console.log('[MusicApp] Filtered tracks:', filteredTracks.length);
      
      // 完全にDOMをクリア
      this.elements.grid.innerHTML = '';
      console.log('[MusicApp] Grid cleared, innerHTML length:', this.elements.grid.innerHTML.length);
      
      if (filteredTracks.length === 0) {
        this.elements.grid.innerHTML = `
          <div class="muted" style="grid-column: 1/-1; text-align: center; padding: 2rem; color: #9aa3b2;">
            該当する楽曲が見つかりませんでした。
          </div>
        `;
        return;
      }

      // トラックカードを生成
      const cardsHTML = filteredTracks.map(track => {
        try {
          return this._createTrackCard(track);
        } catch (error) {
          console.error('[MusicApp] Failed to create card for track:', track.id, error);
          return '';
        }
      }).filter(html => html).join('');

      console.log('[MusicApp] Cards HTML generated, length:', cardsHTML.length);

      // DOMに挿入
      this.elements.grid.innerHTML = cardsHTML;

      // ボタン状態を更新
      this._updatePlayButtons();
      
      const cardCount = this.elements.grid.querySelectorAll('.card').length;
      console.log('[MusicApp] Render complete, cards inserted:', cardCount);
      
      // 検証
      setTimeout(() => {
        const cards = this.elements.grid.querySelectorAll('.card');
        console.log('[MusicApp] Post-render verification:');
        console.log('  - Card count:', cards.length);
        console.log('  - Grid innerHTML length:', this.elements.grid.innerHTML.length);
        
        if (cards.length > 0) {
          const firstCard = cards[0];
          const rect = firstCard.getBoundingClientRect();
          console.log('  - First card rect:', {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          });
          
          const computed = window.getComputedStyle(firstCard);
          console.log('  - First card computed:', {
            display: computed.display,
            visibility: computed.visibility,
            opacity: computed.opacity
          });
        }
      }, 200);
    }

    _filterTracks() {
      return this.tracks.filter(track => {
        if (this.activeFilter === 'all') return true;
        if (this.activeFilter.startsWith('mood:')) {
          return track.mood === this.activeFilter.slice(5);
        }
        if (this.activeFilter.startsWith('theme:')) {
          return track.theme === this.activeFilter.slice(6);
        }
        return true;
      });
    }

    _createTrackCard(track) {
      const artElement = track.art 
        ? `<div class="art" style="background-image:url('${this._escapeHtml(track.art)}')"></div>`
        : `<div class="art fallback" aria-label="アート未設定">${this._escapeHtml(track.name).slice(0,1)}</div>`;

      const duration = this._formatDuration(track.duration);
      const tempo = this._formatTempo(track.bpm);
      
      const subInfo = [
        track.scene ? `${track.scene}` : '',
        tempo ? `${tempo}` : '',
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
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-buffer"></div>
              <div class="progress-fill"></div>
            </div>
            <div class="time-display">
              <span class="current-time">0:00</span>
              <span class="total-time">${duration}</span>
            </div>
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

    _formatTempo(bpm) {
      if (!Number.isFinite(bpm)) return '';
      
      if (bpm <= 60) return 'ゆったりと';
      if (bpm <= 70) return '静寂に';
      if (bpm <= 80) return '心地よく';
      if (bpm <= 90) return '軽やかに';
      if (bpm <= 100) return '躍動的に';
      return 'エネルギッシュに';
    }

    _renderError(message) {
      if (!this.elements.grid) return;

      this.elements.grid.innerHTML = `
        <div class="error-message">
          ${this._escapeHtml(message)}
        </div>
      `;
    }

    _showNotification(message) {
      const notification = document.createElement('div');
      notification.className = 'music-notification';
      notification.textContent = message;

      document.body.appendChild(notification);

      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    }

    _escapeHtml(text) {
      if (this.core && this.core.Security && this.core.Security.escapeHtml) {
        return this.core.Security.escapeHtml(text);
      }
      
      return String(text || '').replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }

    destroy() {
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }

      this.blobUrls.forEach(url => URL.revokeObjectURL(url));
      this.blobUrls.clear();
      this.preloadedTracks.clear();

      if (this.devToolsCheckInterval) {
        clearInterval(this.devToolsCheckInterval);
      }

      this.currentTrack = null;
    }
  }

  let musicApp = null;

  function initializeMusicApp() {
    try {
      console.log('[MusicApp] Starting initialization...');
      musicApp = new MusicApp();
    } catch (error) {
      console.error('[MusicApp] Initialization failed:', error);
      
      const grid = document.getElementById('list') || document.querySelector('main');
      if (grid) {
        grid.innerHTML = `
          <div style="text-align: center; padding: 2rem; color: #9aa3b2;">
            音楽アプリの初期化に失敗しました。<br>
            ブラウザのコンソールでエラーを確認してください。<br><br>
            エラー: ${error.message}
          </div>
        `;
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMusicApp);
  } else {
    setTimeout(initializeMusicApp, 0);
  }

  window.addEventListener('beforeunload', () => {
    if (musicApp && musicApp.destroy) {
      musicApp.destroy();
    }
  });

})();
