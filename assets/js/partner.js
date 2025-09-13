// partner.js — 今日の導き手（月・日・性別・時間帯・曜日から診断）
(() => {
  // DOM参照
  const $month = document.getElementById("month");
  const $day = document.getElementById("day");
  const $genderRadios = document.querySelectorAll('input[name="gender"]');
  const $timeOfDayRadios = document.querySelectorAll('input[name="timeOfDay"]');
  const $dayTypeRadios = document.querySelectorAll('input[name="dayType"]');
  const $btnGo = document.getElementById("btnGo");
  const $result = document.getElementById("result");
  const $formErr = document.getElementById("formErr");

  let CHARACTERS = [];

  // ユーティリティ
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[m]));

  const fetchJSON = (url) => fetch(url, { cache: "no-cache" }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

  // 現在の季節を取得
  function getSeason(month) {
    if (month >= 3 && month <= 5) return 'spring';
    if (month >= 6 && month <= 8) return 'summer';
    if (month >= 9 && month <= 11) return 'autumn';
    return 'winter';
  }

  // 月・日のオプションを生成
  function populateSelects() {
    // 月のオプション
    for (let i = 1; i <= 12; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${i}月`;
      $month.appendChild(option);
    }

    // 日のオプション（月が選択されたときに動的に更新）
    $month.addEventListener('change', updateDays);
    updateDays(); // 初期化
  }

  function updateDays() {
    if (!$day) return;
    
    $day.innerHTML = '<option value="" hidden>日を選んでください</option>';
    
    const month = parseInt($month.value);
    if (!month) return;

    // 各月の日数
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const maxDay = daysInMonth[month - 1];

    for (let i = 1; i <= maxDay; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = `${i}日`;
      $day.appendChild(option);
    }
  }

  // データ読み込み
  async function loadCharacters() {
    try {
      const json = await fetchJSON("./assets/data/partner.json");
      const arr = Array.isArray(json?.guides) ? json.guides : [];
      CHARACTERS = arr.map(c => ({
        id: String(c.id || ""),
        name: String(c.name || ""),
        icon: String(c.icon || ""),
        role: String(c.role || ""),
        description: String(c.description || ""),
        element: String(c.element || ""),
        personality: String(c.personality || ""),
        messages: c.messages || {}
      }));
      console.log('キャラクターデータ読み込み完了:', CHARACTERS.length, '件');
      return CHARACTERS;
    } catch (error) {
      console.error('キャラクターデータの読み込みに失敗:', error);
      return [];
    }
  }

  // 改良された診断ロジック
  function pickPartner(month, day, gender, timeOfDay, dayType) {
    if (!CHARACTERS.length) return null;

    let pool = CHARACTERS.slice();

    // より複雑な選択アルゴリズム
    // 基本seed値に新しい要素を組み込み
    const timeSeed = timeOfDay === '昼' ? 1 : 2;
    const dayTypeSeed = dayType === '平日' ? 10 : 20;
    const genderSeed = gender === '男性' ? 100 : 200;
    
    const complexSeed = (month * 100 + day * 10 + timeSeed + dayTypeSeed + genderSeed) % 97;
    const index = complexSeed % pool.length;
    
    const selectedPartner = pool[index];
    
    // 選択したキャラクターにコンテキスト情報を追加
    if (selectedPartner) {
      selectedPartner.currentContext = {
        season: getSeason(month),
        timeOfDay: timeOfDay,
        dayType: dayType,
        gender: gender
      };
    }
    
    return selectedPartner;
  }

  // メッセージ生成機能
  function generateContextualMessage(partner) {
    if (!partner.messages || !partner.currentContext) {
      return partner.description || "今日はこの導き手が、あなたの進み方を静かに整えます。";
    }

    const context = partner.currentContext;
    const messages = partner.messages;
    
    // レアメッセージ（5%の確率）
    if (Math.random() < 0.05 && messages.rare_encounters?.length > 0) {
      const rareIndex = Math.floor(Math.random() * messages.rare_encounters.length);
      return messages.rare_encounters[rareIndex];
    }

    // 季節メッセージ
    if (messages.seasonal && messages.seasonal[context.season]) {
      return messages.seasonal[context.season];
    }

    // 気分・性別レスポンス
    if (messages.mood_responses && messages.mood_responses[context.gender]) {
      return messages.mood_responses[context.gender];
    }

    // 日々のバリエーション
    if (messages.daily_variations?.length > 0) {
      const dailyIndex = (context.timeOfDay === '昼' ? 0 : 1) + (context.dayType === '平日' ? 0 : 2);
      const messageIndex = dailyIndex % messages.daily_variations.length;
      return messages.daily_variations[messageIndex];
    }

    // デフォルト
    return partner.description || "今日はこの導き手が、あなたの進み方を静かに整えます。";
  }

  // アバター表示
  function applyAvatar(el, name, icon) {
    if (!el) return;
    
    if (icon && icon !== '') {
      el.style.backgroundImage = `url("${icon}")`;
      el.textContent = "";
      el.classList.remove("fallback");
    } else {
      el.style.backgroundImage = "none";
      el.textContent = (String(name || "?").trim() || "?").slice(0, 1);
      el.classList.add("fallback");
    }
  }

  // 結果表示
  function showResult(partner) {
    if (!$result) return;

    if (!partner) {
      $result.innerHTML = `
        <section class="card">
          <div class="label">診断結果</div>
          <div class="muted">申し訳ございません。現在、診断結果を表示できません。</div>
        </section>
      `;
      return;
    }

    const contextualMessage = generateContextualMessage(partner);
    const context = partner.currentContext;
    const timeEmoji = context?.timeOfDay === '昼' ? '☀️' : '🌙';
    const dayEmoji = context?.dayType === '平日' ? '💼' : '🏠';

    $result.innerHTML = `
      <section class="card">
        <div id="p-lab" class="label">
          今日の導き手 ${timeEmoji} ${dayEmoji}
        </div>
        <div class="partner fadein">
          <div class="avatar" id="partner-avatar" aria-hidden="true"></div>
          <div>
            <div class="pname">${esc(partner.name)}</div>
            <div class="prole">${esc(partner.role || "案内役")}</div>
            ${partner.element ? `<div class="element">${esc(partner.element)}の導き</div>` : ''}
            <div class="line">${esc(contextualMessage)}</div>
            ${context ? `<div class="meta">
              ${context.season === 'spring' ? '春' : 
                context.season === 'summer' ? '夏' : 
                context.season === 'autumn' ? '秋' : '冬'}の
              ${context.timeOfDay}、${context.dayType}のあなたへ
            </div>` : ''}
          </div>
        </div>
      </section>
    `;

    // アバターを設定
    const avatarEl = document.getElementById("partner-avatar");
    applyAvatar(avatarEl, partner.name, partner.icon);

    // 結果セクションにスクロール
    $result.scrollIntoView({ behavior: 'smooth' });
  }

  // エラー表示
  function setError(msg) {
    if ($formErr) {
      $formErr.textContent = msg || "";
      $formErr.style.display = msg ? "block" : "none";
    }
  }

  // フォームの値を取得（新しい項目対応）
  function getFormValues() {
    const month = parseInt($month?.value || "0");
    const day = parseInt($day?.value || "0");
    
    let gender = "";
    for (const radio of $genderRadios) {
      if (radio.checked) {
        gender = radio.value;
        break;
      }
    }

    let timeOfDay = "";
    for (const radio of $timeOfDayRadios) {
      if (radio.checked) {
        timeOfDay = radio.value;
        break;
      }
    }

    let dayType = "";
    for (const radio of $dayTypeRadios) {
      if (radio.checked) {
        dayType = radio.value;
        break;
      }
    }

    return { month, day, gender, timeOfDay, dayType };
  }

  // バリデーション（新しい項目対応）
  function validateForm(month, day, gender, timeOfDay, dayType) {
    if (!month || month < 1 || month > 12) {
      return "月を選択してください";
    }
    if (!day || day < 1 || day > 31) {
      return "日を選択してください";
    }
    if (!gender) {
      return "性別を選択してください";
    }
    if (!timeOfDay) {
      return "時間帯を選択してください";
    }
    if (!dayType) {
      return "平日/休日を選択してください";
    }
    return null;
  }

  // 診断実行
  async function runDiagnosis() {
    setError("");

    const { month, day, gender, timeOfDay, dayType } = getFormValues();
    const error = validateForm(month, day, gender, timeOfDay, dayType);
    
    if (error) {
      setError(error);
      return;
    }

    // ローディング表示
    if ($result) {
      $result.innerHTML = `
        <section class="card">
          <div class="label">診断中...</div>
          <div>あなたにふさわしい導き手を探しています...</div>
        </section>
      `;
    }

    try {
      await loadCharacters();
      const partner = pickPartner(month, day, gender, timeOfDay, dayType);
      showResult(partner);

      // アナリティクス
      if (typeof gtag !== 'undefined') {
        gtag('event', 'partner_diagnosis', {
          'partner_name': partner?.name || 'unknown',
          'time_of_day': timeOfDay,
          'day_type': dayType
        });
      }
    } catch (error) {
      console.error('診断エラー:', error);
      setError("診断中にエラーが発生しました。しばらく後でお試しください。");
    }
  }

  // 初期化
  document.addEventListener("DOMContentLoaded", async () => {
    // セレクトボックスにオプションを追加
    if ($month && $day) {
      populateSelects();
    }

    // イベントリスナー
    if ($btnGo) {
      $btnGo.addEventListener("click", (e) => {
        e.preventDefault();
        runDiagnosis();
      });
    }

    // 導き手データの事前読み込み
    try {
      await loadCharacters();
      console.log('初期化完了');
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  });
})();