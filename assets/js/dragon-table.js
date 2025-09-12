(function () {
  'use strict';

  const SC = window.SiteCore || {};
  const esc = typeof SC.esc === "function"
    ? SC.esc
    : (s) => String(s ?? "").replace(/[&<>"']/g, m => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[m]
    ));

  const JSON_PATH = "./assets/data/recipe.json";

  // DOM操作ユーティリティ
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ハッシュと擬似乱数関数
  const hashStr = (s) => { 
    let h = 2166136261 >>> 0; 
    for (let i = 0; i < s.length; i++) { 
      h ^= s.charCodeAt(i); 
      h = Math.imul(h, 16777619); 
    } 
    return h >>> 0; 
  };

  const mulberry32 = (a) => () => ((a += 0x6D2B79F5, a = Math.imul(a ^ (a >>> 15), a | 1), a ^= a + Math.imul(a ^ (a >>> 7), 61), (a ^= a >>> 14) >>> 0) / 4294967296);
  
  const todaySeed = () => { 
    const d = new Date(); 
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; 
  };
  
  const pickOneDet = (arr, seedStr) => { 
    if (!arr.length) return null; 
    const rng = mulberry32(hashStr(seedStr)); 
    return arr[Math.floor(rng() * arr.length)]; 
  };

  // アバター生成関数
  function avatarHTML(name, avatarUrl) {
    const Avatar = SC.Avatar;
    
    if (Avatar && typeof Avatar.render === "function") {
      const el = Avatar.render({ 
        name, 
        art: avatarUrl, 
        initials: (name || "食").slice(0, 2) || "食" 
      });
      return el.outerHTML;
    } else {
      // フォールバック処理
      const initials = esc((name || "食").slice(0, 2));
      
      if (avatarUrl) {
        return `
          <div class="avatar-wrap">
            <img class="avatar-img" 
                 src="${esc(avatarUrl)}" 
                 alt="${esc(name || 'avatar')}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <span class="avatar-fallback" style="display:none;">${initials}</span>
          </div>`;
      } else {
        return `
          <div class="avatar-wrap">
            <span class="avatar-fallback">${initials}</span>
          </div>`;
      }
    }
  }

  // エラー表示関数
  function showError(element, message) {
    if (!element) return;
    
    element.classList.remove('loading');
    element.innerHTML = `<div class="error-message">${esc(message)}</div>`;
  }

  // 成功時のローディング状態解除
  function clearLoading(element) {
    if (element) {
      element.classList.remove('loading');
    }
  }

  // 今日の料理レンダリング
  function renderToday(dish) {
    const host = $("#todayDish");
    if (!host) return;
    
    clearLoading(host);
    
    if (!dish) {
      showError(host, "料理が見つかりませんでした。後ほど再度お試しください。");
      return;
    }
    
    const av = avatarHTML(dish.character, dish.avatar);
    const introText = dish.intro ? `<p class="lead">${esc(dish.intro)}</p>` : "";
    const commentText = dish.comment ? `<div class="sep"></div><p class="meta">${esc(dish.comment)}</p>` : "";
    
    const ingredients = (dish.ingredients || [])
      .map(i => `<li>${esc(i)}</li>`)
      .join("");
      
    const steps = (dish.steps || [])
      .map(s => `<li>${esc(s)}</li>`)
      .join("");
    
    host.innerHTML = `
      <div class="article-head">
        ${av}
        <div>
          <div class="title">${esc(dish.title)}</div>
          <div class="meta">${dish.character ? `語り手：${esc(dish.character)}` : ""}</div>
        </div>
      </div>
      ${introText}
      <div class="sep"></div>
      <div class="body">
        <h3>材料</h3>
        <ul>${ingredients}</ul>
        <h3>作り方</h3>
        <ol>${steps}</ol>
      </div>
      ${commentText}
    `;
  }

  // キャラクター設定
  const CHAR_ORDER = ["アラン", "ドレイク", "ライラ", "ネスター"];
  const CHAR_DESCRIPTIONS = {
    "アラン": "道具は最小限、手順は明確に",
    "ドレイク": "香ばしく、豪快に",
    "ライラ": "寓話の情景を一匙",
    "ネスター": "静けさに調和する皿"
  };
  const CHAR_LINK = {
    "アラン": "./dragon-table-alan.html",
    "ドレイク": "./dragon-table-drake.html",
    "ライラ": "./dragon-table-laila.html",
    "ネスター": "./dragon-table-nester.html"
  };

  // キャラクターリンクレンダリング
  function renderCharLinks(recipes) {
    const host = $("#charLinks");
    if (!host) return;
    
    clearLoading(host);
    
    // キャラクター別にレシピをグループ化
    const byChar = {};
    recipes.forEach(r => { 
      const c = r.character || "その他"; 
      (byChar[c] ||= []).push(r); 
    });

    const charCards = CHAR_ORDER.map(c => {
      const arr = byChar[c] || [];
      const rep = arr.find(x => x.avatar) || {};
      const av = avatarHTML(c, rep.avatar);
      const preview = arr.slice(0, 2).map(x => x.title).join("・");
      const link = CHAR_LINK[c] || "#";
      const description = CHAR_DESCRIPTIONS[c] || "準備中";
      
      return `
        <a class="item" href="${esc(link)}" aria-label="${esc(c)}の食卓へ">
          ${av}
          <div class="name">${esc(c)}の食卓</div>
          <div class="role">${arr.length}品 / ${esc(preview || description)}</div>
        </a>`;
    }).join("");

    host.innerHTML = charCards;
  }

  // キャラクター別一覧レンダリング
  function renderList(items) {
    const listEl = $("#list");
    if (!listEl) return;
    
    clearLoading(listEl);
    
    if (!items.length) {
      listEl.innerHTML = '<div class="meta">レシピは準備中です。recipe.json をご確認ください。</div>';
      return;
    }
    
    const clip = (t, n) => { 
      if (!t) return ""; 
      const s = String(t); 
      return s.length > n ? s.slice(0, n - 1) + "…" : s; 
    };

    const recipeItems = items.map(r => {
      const av = avatarHTML(r.character, r.avatar);
      const id = r.id != null ? String(r.id) : String(Math.abs(hashStr(r.title || "")));
      const subtitle = clip(r.intro || r.comment || "", 46);
      
      return `
        <a class="item" role="listitem" href="./recipe.html?id=${encodeURIComponent(id)}" aria-label="${esc(r.title)}の詳細へ">
          ${av}
          <div>
            <div class="name">${esc(r.title)}</div>
            <div class="sub">${esc(subtitle)}</div>
          </div>
          <span class="pill">詳しく →</span>
        </a>`;
    }).join("");

    listEl.innerHTML = recipeItems;
  }

  // データ取得とエラーハンドリング
  async function fetchRecipeData() {
    try {
      console.log('レシピデータを取得中...');
      
      const response = await fetch(JSON_PATH, { 
        cache: "no-cache",
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      const recipes = Array.isArray(data) ? data : (Array.isArray(data.items) ? data.items : []);
      
      if (!recipes.length) {
        throw new Error("レシピデータが空です");
      }
      
      console.log(`${recipes.length}件のレシピを読み込みました`);
      return recipes;
      
    } catch (error) {
      console.error('データ取得エラー:', error);
      throw error;
    }
  }

  // メイン初期化関数
  async function init() {
    const todayHost = $("#todayDish");
    const charHost = $("#charLinks");
    const listHost = $("#list");

    try {
      const recipes = await fetchRecipeData();
      
      const mode = document.body.getAttribute('data-mode');
      const character = document.body.getAttribute('data-character');

      if (mode === "index") {
        // トップページ処理
        const todayDish = pickOneDet(recipes, "food|" + todaySeed());
        renderToday(todayDish);
        renderCharLinks(recipes);
        
      } else if (mode === "char" && character) {
        // キャラクター別ページ処理
        const characterRecipes = recipes
          .filter(r => (r.character || "") === character)
          .sort((a, b) => (a.title || "").localeCompare(b.title || "", 'ja'));
        
        renderList(characterRecipes);
      }
      
    } catch (error) {
      console.error("初期化エラー:", error);
      
      const errorMessage = `データの読み込みに失敗しました: ${error.message}`;
      
      if (todayHost) {
        showError(todayHost, errorMessage);
      }
      if (charHost) {
        showError(charHost, "キャラクター別の食卓は、データが読み込め次第表示します。");
      }
      if (listHost) {
        showError(listHost, errorMessage);
      }
    }
  }

  // DOM準備完了時の初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // すでにDOMが読み込まれている場合
    setTimeout(init, 0);
  }

})();