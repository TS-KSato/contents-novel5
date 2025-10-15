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
      this.blobUrls = new Map(); // Blob URLのキャッシュ
      this.preloadedTracks = new Map(); // プリロードされたトラック
      this.devToolsCheckInterval = null;
      
      this.init();
    }

    async init() {
      try {
        this._setupAudio();
        this._setupWebAudio();
        this._cacheElements();
        await this._loadTracks();
        this._setupEventListeners();
        this._setupVolumeControl();
        this._setupProtection();
        this._startDevToolsDetection();
        this._buildFilterTabs();
        this._render();
        
        console.log('MusicApp initialized successfully');
      } catch (error) {
        console.error('MusicApp initialization failed:', error);
        this._renderError('音楽データの読み込みに失敗しました。');
      }
    }

    // ===== セットアップ関連 =====

    _setupAudio() {
      this.audio = document.querySelector('audio');
      
      if (!this.audio) {
        this.audio = document.createElement('audio');
        this.audio.preload = 'metadata';
        this.audio.style.display = 'none';
        document.body.appendChild(this.audio);
      }

      // オーディオイベントリスナー
      this.audio.addEventListener('ended', () => this._onTrackEnded());
      this.audio.addEventListener('error', (e) => this._onAudioError(e));
      this.audio.addEventListener('timeupdate', () => this._onTimeUpdate());
      this.audio.addEventListener('progress', () => this._onProgress());
      this.audio.addEventListener('waiting', () => this._onWaiting());
      this.audio.addEventListener('canplay', () => this._onCanPlay());
      this.audio.addEventListener('loadedmetadata', () => this._onLoadedMetadata());

      // 右クリック・ドラッグ防止
      this.audio.addEventListener('contextmenu', e => e.preventDefault());
      this.audio.addEventListener('dragstart', e => e.preventDefault());
    }

    _setupWebAudio() {
      try {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioSource = this.audioContext.createMediaElementSource(this.audio);
        this.gainNode = this.audioContext.createGain();
        this.audioSource.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
      } catch (error) {
        console.warn('Web Audio API not available:', error);
      }
    }

    _cacheElements() {
      this.elements = {
        grid: document.getElementById('list'),
        tabs: document.getElementById('tabs'),
        volumeSlider: document.getElementById('volumeSlider'),
        bufferingIndicator: document.getElementById('bufferingIndicator')
      };

      if (!this.elements.grid) {
        console.warn('Grid element not found, creating fallback');
        this.elements.grid = document.querySelector('main') || document.body;
      }
    }

    _setupVolumeControl() {
      if (!this.elements.volumeSlider) return;

      // 保存された音量を復元
      const savedVolume = localStorage.getItem('music_volume');
      if (savedVolume) {
        this.elements.volumeSlider.value = savedVolume;
        this.audio.volume = savedVolume / 100;
      } else {
        this.audio.volume = this.elements.volumeSlider.value / 100;
      }

      // 音量変更イベント
      this.elements.volumeSlider.addEventListener('input', (e) => {
        this.audio.volume = e.target.value / 100;
        localStorage.setItem('music_volume', e.target.value);
      });
    }

    _setupProtection() {
      // 右クリック防止（カード全体）
      if (this.elements.grid) {
        this.elements.grid.addEventListener('contextmenu', (e) => {
          if (e.target.closest('.card')) {
            e.preventDefault();
          }
        });

        // ドラッグ防止
        this.elements.grid.addEventListener('dragstart', (e) => {
          if (e.target.closest('.card')) {
            e.preventDefault();
          }
        });
      }
    }

    _startDevToolsDetection() {
      // Developer Tools検知（軽度の抑止力）
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
    }

    // ===== データ読み込み =====

    async _loadTracks() {
      try {
        const response = await fetch('./assets/data/music.json', {
          cache: 'no-cache',
          headers: { 
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
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
        }
      ];
    }

    // ===== セキュリティ: Blob URL方式 =====

    async _loadSecureAudio(url) {
      // 既にBlobURLがキャッシュされている場合
      if (this.blobUrls.has(url)) {
        return this.blobUrls.get(url);
      }

      try {
        const response = await fetch(url, {
          credentials: 'same-origin',
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // キャッシュに保存（メモリ管理のため最大10件）
        if (this.blobUrls.size >= 10) {
          const firstKey = this.blobUrls.keys().next().value;
          const firstValue = this.blobUrls.get(firstKey);
          URL.revokeObjectURL(firstValue);
          this.blobUrls.delete(firstKey);
        }
        
        this.blobUrls.set(url, blobUrl);
        return blobUrl;
      } catch (error) {
        console.error('Secure audio loading failed:', error);
        return url; // フォールバック
      }
    }

    // ===== 時限トークン（擬似実装） =====

    _generateToken(trackId) {
      const timestamp = Date.now();
      const expiresIn = 5 * 60 * 1000; // 5分
      return btoa(`${trackId}:${timestamp}:${expiresIn}`);
    }

    _validateToken(token, trackId) {
      try {
        const [id, timestamp, expires] = atob(token).split(':');
        return id === trackId && (Date.now() - parseInt(timestamp) < parseInt(expires));
      } catch {
        return false;
      }
    }

    // ===== イベントリスナー =====

    _setupEventListeners() {
      if (!this.elements.grid) return;

      // 再生ボタンのクリック処理
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

        // プログレスバーのクリック処理
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
      
      switch (action) {
        case 'play':
          await this._playTrackWithRetry(track);
          break;
        case 'pause':
          this._pauseTrack();
          break;
        default:
          await this._playTrackWithRetry(track);
      }
    }

    // ===== 再生制御 =====

    async _playTrackWithRetry(track, maxRetries = 3) {
      for (let i = 0; i < maxRetries; i++) {
        try {
          await this._playTrack(track);
          return;
        } catch (error) {
          console.error(`Play attempt ${i + 1} failed:`, error);
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

      // Blob URL方式で読み込み
      const secureUrl = await this._loadSecureAudio(track.url);
      
      this.currentTrack = track.id;
      this.audio.src = secureUrl;
      
      await this.audio.play();

      this._updatePlayButtons();
      this._savePlayHistory(track);
      this._preloadNextTrack();
      
      // アナリティクス
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
      console.error('Audio playback error:', e);
      this._hideBuffering();
      this._showNotification('音楽の再生に失敗しました。');
    }

    // ===== プリロード戦略 =====

    _preloadNextTrack() {
      const currentIndex = this.tracks.findIndex(t => t.id === this.currentTrack);
      if (currentIndex === -1) return;

      const nextTrack = this.tracks[currentIndex + 1];
      
      if (nextTrack && !this.preloadedTracks.has(nextTrack.id)) {
        this._loadSecureAudio(nextTrack.url).then(blobUrl => {
          this.preloadedTracks.set(nextTrack.id, blobUrl);
        }).catch(error => {
          console.warn('Preload failed:', error);
        });
      }
    }

    // ===== 再生履歴 =====

    _savePlayHistory(track) {
      try {
        const history = JSON.parse(localStorage.getItem('music_play_history') || '[]');
        history.unshift({
          id: track.id,
          name: track.name,
          playedAt: new Date().toISOString()
        });
        
        // 最新50件のみ保持
        localStorage.setItem('music_play_history', 
          JSON.stringify(history.slice(0, 50))
        );
      } catch (error) {
        console.warn('Failed to save play history:', error);
      }
    }

    // ===== オーディオイベント =====

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

    // ===== バッファリング表示 =====

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

    // ===== UI更新 =====

    _updatePlayButtons() {
      if (!this.elements.grid) return;

      this.elements.grid.querySelectorAll('.card, .item').forEach(card => {
        const trackId = card.getAttribute('data-id');
        const button = card.querySelector('button.btn, a.btn');
        
        if (!button) return;

        const track = this.tracks.find(t => t.id === trackId);
        if (!track) return;

        // data-playing属性を更新
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

    // ===== フィルタータブ =====

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

    // ===== レンダリング =====

    _render() {
      if (!this.elements.grid) return;

      const filteredTracks = this._filterTracks();
      
      if (filteredTracks.length === 0) {
        this.elements.grid.innerHTML = `
          <div class="muted">
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

    // ===== ユーティリティ =====

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
      if (this.core && this.core.Security) {
        return this.core.Security.escapeHtml(text);
      }
      
      return String(text || '').replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }

    // ===== クリーンアップ =====

    destroy() {
      if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }

      // Blob URLのクリーンアップ
      this.blobUrls.forEach(url => URL.revokeObjectURL(url));
      this.blobUrls.clear();
      this.preloadedTracks.clear();

      // Developer Tools検知の停止
      if (this.devToolsCheckInterval) {
        clearInterval(this.devToolsCheckInterval);
      }

      this.currentTrack = null;
    }
  }

  // ===== グローバル初期化 =====

  let musicApp = null;

  function initializeMusicApp() {
    try {
      musicApp = new MusicApp();
    } catch (error) {
      console.error('Music app initialization failed:', error);
      
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
