(function() {
  'use strict';

  class MusicApp {
    constructor() {
      this.core = window.SiteCore;
      this.tracks = [];
      this.currentTrack = null;
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
        this._render();
        
        console.log('MusicApp initialized successfully');
      } catch (error) {
        console.error('MusicApp initialization failed:', error);
        this._renderError('音楽データの読み込みに失敗しました。');
      }
    }

    _setupAudio() {
      this.audio = document.querySelector('audio');
      
      if (!this.audio) {
        this.audio = document.createElement('audio');
        this.audio.preload = 'metadata';
        this.audio.style.display = 'none';
        document.body.appendChild(this.audio);
      }

      this.audio.addEventListener('ended', () => this._onTrackEnded());
      this.audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
      });
    }

    _cacheElements() {
      this.elements = {
        grid: document.getElementById('list')
      };

      if (!this.elements.grid) {
        console.warn('Grid element not found, creating fallback');
        this.elements.grid = document.querySelector('main') || document.body;
      }
    }

    async _loadTracks() {
      try {
        const response = await fetch('./assets/data/music.json', {
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
        }
      ];
    }

    _setupEventListeners() {
      if (!this.elements.grid) return;

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
        console.log('Paid content:', track.name);
        return;
      }

      const action = button.dataset.action || 'play';
      
      if (action === 'pause') {
        this._pauseTrack();
      } else {
        this._playTrack(track);
      }
    }

    _playTrack(track) {
      if (!track.url || track.url === '#') {
        console.warn('No audio file for:', track.name);
        return;
      }

      this.currentTrack = track.id;
      this.audio.src = track.url;
      
      this.audio.play().catch(error => {
        console.error('Play failed:', error);
      });

      this._updatePlayButtons();
      
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

    _render() {
      if (!this.elements.grid) return;

      if (this.tracks.length === 0) {
        this.elements.grid.innerHTML = `
          <div class="muted">
            楽曲が見つかりませんでした。
          </div>
        `;
        return;
      }

      this.elements.grid.innerHTML = this.tracks.map(track => 
        this._createTrackCard(track)
      ).join('');

      this._updatePlayButtons();
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

    _escapeHtml(text) {
      if (this.core && this.core.Security) {
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
      this.currentTrack = null;
    }
  }

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
    initializeMusicApp();
  }

  window.addEventListener('beforeunload', () => {
    if (musicApp && musicApp.destroy) {
      musicApp.destroy();
    }
  });

})();
