// 修正版 index.js
(() => {
  const $ = (sel) => document.querySelector(sel);
  
  // DOM要素
  const ctaBtn = $('#ctaGet');
  const resultSection = $('#result');
  const resultBox = $('#resultBox');
  const charButtons = document.querySelectorAll('[data-char]');
  const calDate = $('#calDate');
  const quoteText = $('#quoteText');
  const quoteAuthor = $('#quoteAuthor');
  
  // 現在の日付表示
  const updateCalendar = () => {
    const today = new Date();
    if (calDate) {
      calDate.textContent = `${today.getMonth() + 1}月${today.getDate()}日`;
    }
  };
  
  // 占い結果表示
  const showFortune = (character = 'デフォルト') => {
    if (resultSection && resultBox) {
      resultSection.style.display = 'block';
      resultBox.innerHTML = `
        <h3>${character}からの今日の言葉</h3>
        <p>総合運：今日は新しい挑戦に適した日です。</p>
        <div class="paywall">
          <p>9カテゴリの詳細は有料会員限定です</p>
        </div>
      `;
    }
  };
  
  // イベントリスナー設定
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => showFortune());
  }
  
  charButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const charName = btn.dataset.char;
      showFortune(charName);
    });
  });
  
  // 初期化
  document.addEventListener('DOMContentLoaded', () => {
    updateCalendar();
    // デフォルトの格言表示
    if (quoteText) quoteText.textContent = '銀竜の智慧は永遠なり';
    if (quoteAuthor) quoteAuthor.textContent = '— 古の書より';
  });
})();