// novel.js — デバッグ版：詳細ログとエラーハンドリング
(() => {
  const FILE = "./assets/data/novel.json";
  const DEBUG = true; // デバッグモード

  function log(...args) {
    if (DEBUG) console.log('[Novel.js]', ...args);
  }

  function error(...args) {
    console.error('[Novel.js ERROR]', ...args);
  }

  // DOM要素取得と検証
  function getElements() {
    const elements = {
      chapterSelector: document.getElementById("chapterSelector"),
      chapterContent: document.getElementById("chapterContent"),
      currentChapterTitle: document.getElementById("currentChapterTitle"),
      endcap: document.getElementById("endcap"),
      nextPreview: document.getElementById("nextPreview"),
      prevChapter: document.getElementById("prevChapter"),
      nextChapter: document.getElementById("nextChapter"),
      endcapPrevBtn: document.getElementById("endcapPrevBtn"),
      endcapNextBtn: document.getElementById("endcapNextBtn"),
      endcapTocBtn: document.getElementById("endcapTocBtn"),
      progressBar: document.getElementById("progressBar"),
      resumeBtn: document.getElementById("resumeBtn")
    };

    // 存在確認
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
  let novelData = null;
  let currentChapterIndex = 0;

  // ローカルストレージ関連
  const STORAGE_KEY = 'novel_reading_position';
  
  function saveReadingPosition(chapterIndex, scrollPosition = 0) {
    try {
      const position = {
        chapterIndex,
        scrollPosition,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
      log('Reading position saved:', position);
    } catch (err) {
      error('Failed to save reading position:', err);
    }
  }

  function loadReadingPosition() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const position = saved ? JSON.parse(saved) : null;
      log('Reading position loaded:', position);
      return position;
    } catch (err) {
      error('Failed to load reading position:', err);
      return null;
    }
  }

  // JSON読み込み
  async function loadNovelData() {
    log('Loading novel data from:', FILE);
    
    try {
      const response = await fetch(FILE, { 
        cache: "no-cache",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      log('Fetch response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      log('Novel data loaded:', data);
      
      // データ構造検証
      if (!data) {
        throw new Error('Novel data is null or undefined');
      }
      
      if (!data.chapters) {
        throw new Error('Novel data missing chapters property');
      }
      
      if (!Array.isArray(data.chapters)) {
        throw new Error('Chapters is not an array');
      }
      
      if (data.chapters.length === 0) {
        throw new Error('No chapters found');
      }

      // 各章の構造確認
      data.chapters.forEach((chapter, index) => {
        if (!chapter.title) {
          error(`Chapter ${index} missing title`);
        }
        if (!chapter.content) {
          error(`Chapter ${index} missing content`);
        }
      });
      
      log(`Successfully loaded ${data.chapters.length} chapters`);
      return data;
      
    } catch (err) {
      error('Failed to load novel data:', err);
      
      // より詳細なエラー情報
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        error('Network error - check if the JSON file exists and is accessible');
      } else if (err.name === 'SyntaxError') {
        error('JSON parsing error - check if the JSON file is valid');
      }
      
      return null;
    }
  }

  // 章セレクター初期化
  function initChapterSelector() {
    log('Initializing chapter selector');
    
    if (!novelData) {
      error('Cannot initialize selector: no novel data');
      return;
    }
    
    if (!elements.chapterSelector) {
      error('Cannot initialize selector: element not found');
      return;
    }

    const options = novelData.chapters
      .map((chapter, index) => 
        `<option value="${index}">${escapeHtml(chapter.title)}</option>`
      ).join('');

    elements.chapterSelector.innerHTML = options;
    log('Chapter selector populated with', novelData.chapters.length, 'options');

    elements.chapterSelector.addEventListener('change', (e) => {
      const chapterIndex = parseInt(e.target.value, 10);
      log('Chapter selector changed to index:', chapterIndex);
      displayChapter(chapterIndex);
    });
  }

  // HTML エスケープ
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 章表示
  function displayChapter(chapterIndex) {
    log('Displaying chapter:', chapterIndex);
    
    if (!novelData) {
      error('Cannot display chapter: no novel data');
      showError('小説データが読み込まれていません');
      return;
    }
    
    if (chapterIndex < 0 || chapterIndex >= novelData.chapters.length) {
      error('Invalid chapter index:', chapterIndex, 'Total chapters:', novelData.chapters.length);
      showError('指定された章が見つかりません');
      return;
    }

    const chapter = novelData.chapters[chapterIndex];
    currentChapterIndex = chapterIndex;
    log('Chapter data:', { title: chapter.title, contentLength: chapter.content?.length });

    // 章タイトル更新
    if (elements.currentChapterTitle) {
      elements.currentChapterTitle.textContent = chapter.title;
      elements.currentChapterTitle.classList.remove('visually-hidden');
      log('Chapter title updated');
    }

    // 章内容表示
    if (elements.chapterContent) {
      if (chapter.content) {
        elements.chapterContent.innerHTML = chapter.content;
        log('Chapter content displayed');
      } else {
        elements.chapterContent.innerHTML = '<p class="muted">この章の内容が見つかりません</p>';
        error('Chapter content is empty');
      }
      
      // スクロール位置調整
      elements.chapterContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // セレクター更新
    if (elements.chapterSelector) {
      elements.chapterSelector.value = chapterIndex;
      log('Chapter selector updated');
    }

    // ナビゲーションボタン更新
    updateNavigationButtons();

    // エンドキャップ更新
    updateEndcap();

    // 読了位置保存
    saveReadingPosition(chapterIndex);

    // 進捗バー初期化
    initProgressBar();

    // ページトップへスクロール
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);

    log('Chapter display completed');
  }

  // ナビゲーションボタン更新
  function updateNavigationButtons() {
    const isFirst = currentChapterIndex === 0;
    const isLast = currentChapterIndex === novelData.chapters.length - 1;

    log('Updating navigation buttons - isFirst:', isFirst, 'isLast:', isLast);

    const buttons = [
      { element: elements.prevChapter, disabled: isFirst },
      { element: elements.nextChapter, disabled: isLast },
      { element: elements.endcapPrevBtn, disabled: isFirst },
      { element: elements.endcapNextBtn, disabled: isLast }
    ];

    buttons.forEach(({ element, disabled }) => {
      if (element) {
        element.disabled = disabled;
        element.style.opacity = disabled ? '0.5' : '1';
      }
    });
  }

  // エンドキャップ更新
  function updateEndcap() {
    log('Updating endcap');
    
    if (!elements.endcap) return;

    const nextChapter = novelData.chapters[currentChapterIndex + 1];
    
    if (nextChapter) {
      elements.endcap.hidden = false;
      
      if (elements.nextPreview) {
        try {
          // 次章の最初のテキストを取得（HTMLタグを除去）
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = nextChapter.content || '';
          const plainText = tempDiv.textContent || tempDiv.innerText || '';
          const preview = plainText.substring(0, 120).trim() + '…';
          elements.nextPreview.textContent = preview;
          log('Next chapter preview set');
        } catch (err) {
          error('Failed to generate preview:', err);
          elements.nextPreview.textContent = '次章のプレビューを読み込めませんでした';
        }
      }
    } else {
      elements.endcap.hidden = true;
      log('Endcap hidden (no next chapter)');
    }
  }

  // 進捗バー初期化
  function initProgressBar() {
    log('Initializing progress bar');
    
    if (!elements.progressBar) return;

    const updateProgress = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      
      elements.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
      
      // 読了位置保存（適度な頻度で）
      if (Math.random() < 0.1) { // 10%の確率で保存（負荷軽減）
        saveReadingPosition(currentChapterIndex, scrollTop);
      }
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
    log('Progress bar listener attached');
  }

  // エラー表示
  function showError(message = 'わかりません／情報が不足しています') {
    log('Showing error:', message);
    
    if (elements.chapterContent) {
      elements.chapterContent.innerHTML = `<div class="muted" style="text-align:center;padding:2rem;">${escapeHtml(message)}</div>`;
    }

    if (elements.chapterSelector) {
      elements.chapterSelector.innerHTML = '<option>読み込みエラー</option>';
    }
  }

  // イベントリスナー設定
  function setupEventListeners() {
    log('Setting up event listeners');

    // 章ナビゲーション
    const navigationEvents = [
      {
        element: elements.prevChapter,
        action: () => currentChapterIndex > 0 ? displayChapter(currentChapterIndex - 1) : null,
        name: 'prevChapter'
      },
      {
        element: elements.nextChapter,
        action: () => currentChapterIndex < novelData.chapters.length - 1 ? displayChapter(currentChapterIndex + 1) : null,
        name: 'nextChapter'
      },
      {
        element: elements.endcapPrevBtn,
        action: () => currentChapterIndex > 0 ? displayChapter(currentChapterIndex - 1) : null,
        name: 'endcapPrev'
      },
      {
        element: elements.endcapNextBtn,
        action: () => currentChapterIndex < novelData.chapters.length - 1 ? displayChapter(currentChapterIndex + 1) : null,
        name: 'endcapNext'
      }
    ];

    navigationEvents.forEach(({ element, action, name }) => {
      if (element) {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          log(`${name} button clicked`);
          action();
        });
        log(`${name} listener attached`);
      }
    });

    // 目次へ移動
    if (elements.endcapTocBtn) {
      elements.endcapTocBtn.addEventListener('click', (e) => {
        e.preventDefault();
        log('TOC button clicked');
        
        if (elements.chapterSelector) {
          elements.chapterSelector.focus();
          elements.chapterSelector.scrollIntoView({ behavior: 'smooth' });
        }
      });
      log('TOC button listener attached');
    }

    // 再開ボタン
    if (elements.resumeBtn) {
      elements.resumeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        log('Resume button clicked');
        
        const savedPosition = loadReadingPosition();
        if (savedPosition) {
          if (savedPosition.chapterIndex !== currentChapterIndex) {
            displayChapter(savedPosition.chapterIndex);
          }
          setTimeout(() => {
            window.scrollTo({ 
              top: savedPosition.scrollPosition || 0, 
              behavior: 'smooth' 
            });
          }, 300);
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });

      // スクロールで再開ボタン表示制御
      const toggleResumeButton = () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const show = scrollTop > 300;
        elements.resumeBtn.style.display = show ? 'block' : 'none';
      };

      window.addEventListener('scroll', toggleResumeButton, { passive: true });
      toggleResumeButton();
      log('Resume button listeners attached');
    }

    // キーボードナビゲーション
    document.addEventListener('keydown', (e) => {
      // 入力フィールド内では無効
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
      }

      switch(e.key) {
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          if (currentChapterIndex > 0) {
            log('Keyboard navigation: previous chapter');
            displayChapter(currentChapterIndex - 1);
          }
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          if (currentChapterIndex < novelData.chapters.length - 1) {
            log('Keyboard navigation: next chapter');
            displayChapter(currentChapterIndex + 1);
          }
          break;
      }
    });

    log('All event listeners attached');
  }

  // 初期化
  async function init() {
    log('Initializing novel reader');
    
    try {
      // DOM要素取得
      elements = getElements();
      
      // JSON読み込み
      novelData = await loadNovelData();
      
      if (!novelData) {
        showError('小説データを読み込めませんでした');
        return;
      }

      // UI初期化
      initChapterSelector();
      setupEventListeners();

      // 保存された読了位置を復元、または最初の章を表示
      const savedPosition = loadReadingPosition();
      let initialChapterIndex = 0;
      
      if (savedPosition && savedPosition.chapterIndex >= 0 && savedPosition.chapterIndex < novelData.chapters.length) {
        initialChapterIndex = savedPosition.chapterIndex;
        log('Restoring saved position:', savedPosition);
      } else {
        log('Starting from first chapter');
      }
      
      displayChapter(initialChapterIndex);

      // 保存されたスクロール位置を復元
      if (savedPosition && savedPosition.scrollPosition > 0) {
        setTimeout(() => {
          window.scrollTo({ 
            top: savedPosition.scrollPosition, 
            behavior: 'smooth' 
          });
          log('Scroll position restored:', savedPosition.scrollPosition);
        }, 500);
      }

      log('Initialization completed successfully');
      
    } catch (err) {
      error('Initialization failed:', err);
      showError('初期化中にエラーが発生しました');
    }
  }

  // DOMContentLoaded イベントで初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
    log('Waiting for DOMContentLoaded');
  } else {
    init();
    log('DOM already loaded, initializing immediately');
  }
})();