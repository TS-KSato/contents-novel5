/**
 * Service Worker - エテルナリア音楽館
 * 
 * 機能:
 * 1. 静的アセット（HTML/CSS/JS）のキャッシュ
 * 2. 音楽ファイルの選択的キャッシュ
 * 3. オフライン時のフォールバック
 */

const CACHE_VERSION = 'eternaria-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const AUDIO_CACHE = `${CACHE_VERSION}-audio`;
const MAX_AUDIO_CACHE = 10; // 最大10曲までキャッシュ

// キャッシュするファイルリスト
const STATIC_ASSETS = [
  '/index.html',
  '/music.html',
  '/assets/css/app.css',
  '/assets/css/components.css',
  '/assets/css/music.css',
  '/assets/js/core.js',
  '/assets/js/music.js',
  '/assets/data/music.json'
];

// ========================================
// インストール時
// ========================================
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      // 新しいService Workerを即座に有効化
      return self.skipWaiting();
    })
  );
});

// ========================================
// アクティベーション時（古いキャッシュ削除）
// ========================================
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // 現在のバージョンでないキャッシュを削除
            return !cacheName.startsWith(CACHE_VERSION);
          })
          .map((cacheName) => {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      // 全てのクライアントで即座に有効化
      return self.clients.claim();
    })
  );
});

// ========================================
// フェッチ時（キャッシュ戦略）
// ========================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 外部リソースはスキップ
  if (url.origin !== location.origin) {
    return;
  }
  
  // MP3ファイル: 音楽キャッシュ戦略
  if (request.url.includes('.mp3')) {
    event.respondWith(handleAudioRequest(request));
    return;
  }
  
  // 静的アセット: Cache First戦略
  if (STATIC_ASSETS.some(asset => request.url.includes(asset))) {
    event.respondWith(handleStaticAsset(request));
    return;
  }
  
  // API: Network First戦略
  if (request.url.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }
  
  // その他: Network First
  event.respondWith(
    fetch(request).catch(() => {
      return caches.match(request);
    })
  );
});

// ========================================
// 音楽ファイル処理（Cache First + LRU）
// ========================================
async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE);
  const cached = await cache.match(request);
  
  // キャッシュがあれば返す
  if (cached) {
    console.log('Serving audio from cache:', request.url);
    return cached;
  }
  
  // なければネットワークから取得してキャッシュ
  try {
    const response = await fetch(request);
    
    // 成功したレスポンスのみキャッシュ
    if (response.ok) {
      // キャッシュサイズ制限チェック
      await manageCacheSize(cache);
      
      // クローンしてキャッシュに保存
      cache.put(request, response.clone());
      console.log('Cached audio:', request.url);
    }
    
    return response;
  } catch (error) {
    console.error('Audio fetch failed:', error);
    
    // オフライン時のフォールバック
    return new Response('Audio unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// ========================================
// キャッシュサイズ管理（LRU方式）
// ========================================
async function manageCacheSize(cache) {
  const keys = await cache.keys();
  
  if (keys.length >= MAX_AUDIO_CACHE) {
    // 最も古いエントリを削除
    console.log('Cache limit reached, removing oldest entry');
    await cache.delete(keys[0]);
  }
}

// ========================================
// 静的アセット処理（Cache First）
// ========================================
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    // キャッシュがある場合は返し、バックグラウンドで更新
    fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response);
      }
    }).catch(() => {
      // ネットワークエラーは無視
    });
    
    return cached;
  }
  
  // キャッシュがない場合はネットワークから取得
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return new Response('Offline', { status: 503 });
  }
}

// ========================================
// API処理（Network First）
// ========================================
async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // オフライン時のフォールバック
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ========================================
// メッセージ受信（キャッシュ削除など）
// ========================================
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
