// recipe.js — 修正版：アバター表示問題を解決
(() => {
  'use strict';

  const FILE = "./assets/data/recipe.json";
  
  // キャラクター別ページのリンク設定
  const CHAR_LINKS = {
    "アラン": "./dragon-table-alan.html",
    "ドレイク": "./dragon-table-drake.html", 
    "ライラ": "./dragon-table-laila.html",
    "ネスター": "./dragon-table-nester.html"
  };

  // キャラクター別デフォルトアバター（他ページと統一）
  const CHAR_AVATARS = {
    "アラン": "./assets/char-alan.jpg",
    "ドレイク": "./assets/char-drake.jpg",
    "ライラ": "./assets/char-laila.jpg",
    "ネスター": "./assets/char-nester.jpg"
  };

  // DOM要素取得
  const $title = document.getElementById("title");
  const $subtitle = document.getElementById("subtitle"); 
  const $avatar = document.getElementById("avatar");
  const $content = document.getElementById("content");
  const $charLink = document.getElementById("charLink");

  let ALL = [];

  // HTMLエスケープ関数
  const esc = (s) => String(s || "").replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));

  // アバター生成関数（修正版）
  function avatarHTML(name, avatarUrl) {
    const initials = esc((name || "食").slice(0, 2));
    
    // キャラクター名からデフォルトアバターを取得
    const defaultAvatar = name ? CHAR_AVATARS[name] : null;
    const finalAvatarUrl = avatarUrl || defaultAvatar;
    
    if (finalAvatarUrl) {
      return `
        <img src="${esc(finalAvatarUrl)}" 
             alt="${esc(name || 'avatar')}"
             style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;"
             onerror="this.style.display='none'; this.parentElement.querySelector('.avatar-fallback').style.display='flex';">
        <span class="avatar-fallback" 
              style="display: none; width: 48px; height: 48px; border-radius: 50%; background: var(--accent-2, #f0f0f0); color: var(--accent, #333); align-items: center; justify-content: center; font-weight: bold; font-size: 14px; position: absolute; top: 0; left: 0;">
          ${initials}
        </span>`;
    } else {
      return `
        <span class="avatar-fallback" 
              style="display: flex; width: 48px; height: 48px; border-radius: 50%; background: var(--accent-2, #f0f0f0); color: var(--accent, #333); align-items: center; justify-content: center; font-weight: bold; font-size: 14px;">
          ${initials}
        </span>`;
    }
  }

  // JSON読み込み
  function loadJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  // データ正規化（実際のJSONデータ構造に対応）
  function normalize(r) {
    return {
      id: String(r.id || ""),
      character: String(r.character || ""),
      title: String(r.title || ""),
      intro: String(r.intro || ""),
      comment: String(r.comment || ""),
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.map(i => String(i)) : [],
      steps: Array.isArray(r.steps) ? r.steps.map(s => String(s)) : [],
      point: String(r.point || ""),
      avatar: String(r.avatar || "")
    };
  }

  // レシピ一覧表示（フォールバック用）
  function renderList() {
    if (!$content) return false;
    
    if (!ALL.length) {
      $content.innerHTML = `<div class="muted">わかりません／情報が不足しています</div>`;
      return true;
    }

    const recipesHTML = ALL.map(r => `
      <article class="card recipe" style="margin-bottom: 1rem;">
        <div style="display: grid; grid-template-columns: auto 1fr auto; gap: .75rem; align-items: center; padding: 1rem;">
          <div class="avatar" style="position: relative; width: 48px; height: 48px;">
            ${avatarHTML(r.character, r.avatar)}
          </div>
          <div style="min-width: 0;">
            <div style="font-weight: 700; margin-bottom: .25rem;">${esc(r.title)}</div>
            <div style="color: var(--muted); font-size: .85rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${esc(r.intro || r.comment || "")}
            </div>
            ${r.character ? `<div style="color: var(--muted); font-size: .75rem; margin-top: .15rem;">語り手：${esc(r.character)}</div>` : ""}
          </div>
          <a class="btn" href="?id=${encodeURIComponent(r.id)}" style="padding: .5rem .75rem; background: var(--accent-2); color: var(--accent); text-decoration: none; border-radius: .5rem; font-weight: 600;">詳しく →</a>
        </div>
      </article>
    `).join("");

    $content.innerHTML = recipesHTML;
    return true;
  }

  // 単品レシピ表示
  function drawOne(r) {
    // タイトル設定
    if ($title) {
      $title.textContent = r.title || "レシピ";
      document.title = `運命の銀竜暦｜${r.title || "レシピ"}`;
    }

    // サブタイトル設定
    if ($subtitle) {
      $subtitle.textContent = r.intro || "エテルナリアの食卓から一皿";
    }

    // アバター設定（修正版）
    if ($avatar) {
      $avatar.innerHTML = avatarHTML(r.character, r.avatar);
      // position: relative を追加してフォールバックの位置調整を可能にする
      $avatar.style.position = "relative";
      $avatar.style.width = "48px";
      $avatar.style.height = "48px";
      $avatar.style.margin = "0 auto .5rem";
    }

    // キャラクター別ページリンク設定
    if ($charLink && r.character && CHAR_LINKS[r.character]) {
      $charLink.href = CHAR_LINKS[r.character];
      $charLink.textContent = `${r.character}の食卓へ`;
      $charLink.style.display = "";
    } else if ($charLink) {
      $charLink.style.display = "none";
    }

    // メインコンテンツ
    if ($content) {
      const ingredientsHTML = r.ingredients.length 
        ? r.ingredients.map(ing => `<li>${esc(ing)}</li>`).join("")
        : '<li class="muted">わかりません／情報が不足しています</li>';

      const stepsHTML = r.steps.length 
        ? r.steps.map((step, index) => `<li><strong>手順${index + 1}：</strong>${esc(step)}</li>`).join("")
        : '<li class="muted">わかりません／情報が不足しています</li>';

      const commentHTML = r.comment 
        ? `<div class="sep"></div><div class="label">語り手から</div><p style="color: var(--muted); font-style: italic; line-height: 1.6;">${esc(r.comment)}</p>` 
        : "";

      const pointHTML = r.point 
        ? `<div class="sep"></div><div class="label">調理のコツ</div><p style="background: var(--accent-2); color: var(--accent); padding: .75rem; border-radius: .5rem; font-weight: 500;">${esc(r.point)}</p>` 
        : "";

      $content.innerHTML = `
        <div class="label">材料</div>
        <ul style="margin: .5rem 0 1rem 1.5rem; line-height: 1.5;">
          ${ingredientsHTML}
        </ul>
        
        <div class="sep"></div>
        
        <div class="label">作り方</div>
        <ol style="margin: .5rem 0 1rem 1.5rem; line-height: 1.6;">
          ${stepsHTML}
        </ol>
        
        ${pointHTML}
        ${commentHTML}
      `;
    }
  }

  // URLからIDを取得
  function getIdFromQuery() {
    const params = new URLSearchParams(location.search);
    return params.get("id");
  }

  // 初期化処理
  document.addEventListener("DOMContentLoaded", () => {
    loadJSON(FILE)
      .then(json => {
        ALL = Array.isArray(json) ? json.map(normalize) : [];
        
        const id = getIdFromQuery();
        if (id) {
          // 単品表示
          const recipe = ALL.find(x => x.id === id);
          if (recipe) {
            drawOne(recipe);
          } else {
            // レシピが見つからない場合
            if ($content) {
              $content.innerHTML = `
                <div class="muted" style="text-align: center; padding: 2rem;">
                  <p>指定されたレシピが見つかりませんでした。</p>
                  <a class="btn" href="./dragon-table.html" style="margin-top: 1rem; padding: .75rem 1.5rem; background: var(--accent-2); color: var(--accent); text-decoration: none; border-radius: .5rem; font-weight: 600;">食卓トップへ戻る</a>
                </div>
              `;
            }
          }
        } else {
          // IDが指定されていない場合は一覧表示
          renderList();
        }
      })
      .catch(err => {
        console.error("データ読み込みエラー:", err);
        
        // エラー表示
        const errorMessage = `
          <div class="muted" style="text-align: center; padding: 2rem;">
            <p>わかりません／情報が不足しています</p>
            <p style="font-size: .85rem; margin-top: .5rem;">データの読み込みに失敗しました。</p>
            <a class="btn" href="./dragon-table.html" style="margin-top: 1rem; padding: .75rem 1.5rem; background: var(--accent-2); color: var(--accent); text-decoration: none; border-radius: .5rem; font-weight: 600;">食卓トップへ戻る</a>
          </div>
        `;

        if ($content) {
          $content.innerHTML = errorMessage;
        }
      });
  });
})();