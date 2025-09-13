// partner.js — 今日の導き手（月・日・性別から診断）
(() => {
  // DOM参照
  const $month = document.getElementById("month");
  const $day = document.getElementById("day");
  const $genderRadios = document.querySelectorAll('input[name="gender"]');
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
    
    $day.innerHTML = '<option value="" hidden>日を選ぶ</option>';
    
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
      const json = await fetchJSON("./assets/data/archetype_fortune.json");
      const arr = Array.isArray(json?.characters) ? json.characters : [];
      CHARACTERS = arr.map(c => ({
        id: String(c.id || ""),
        name: String(c.name || ""),
        icon: String(c.icon || ""),
        role: String(c.role || ""),
        archetype: String(c.archetype || c.arch || ""),
        gender: String(c.gender || "")
      }));
      return CHARACTERS;
    } catch (error) {
      console.error('キャラクターデータの読み込みに失敗:', error);
      return [];
    }
  }

  // 診断ロジック
  function pickPartner(month, day, gender) {
    if (!CHARACTERS.length) return null;

    let pool = CHARACTERS.slice();

    // 性別でフィルタリング（キャラクターデータに gender フィールドがある場合）
    if (gender && gender !== "回答しない") {
      const filtered = pool.filter(c => 
        c.gender === gender || c.gender === "" || c.gender === "中性"
      );
      if (filtered.length > 0) pool = filtered;
    }

    // 月・日による選択（疑似ランダム）
    const seed = month * 100 + day;
    const index = seed % pool.length;
    
    return pool[index] || null;
  }

  // アバター表示
  function applyAvatar(el, name, icon) {
    if (!el) return;
    
    if (icon) {
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

    $result.innerHTML = `
      <section class="card">
        <div id="p-lab" class="label">今日の導き手</div>
        <div class="partner fadein">
          <div class="avatar" id="partner-avatar" aria-hidden="true"></div>
          <div>
            <div class="pname">${esc(partner.name)}</div>
            <div class="prole">${esc(partner.role || "案内役")}</div>
            <div class="line">今日はこの導き手が、あなたの進み方を静かに整えます。</div>
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

  // フォームの値を取得
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

    return { month, day, gender };
  }

  // バリデーション
  function validateForm(month, day, gender) {
    if (!month || month < 1 || month > 12) {
      return "月を選択してください";
    }
    if (!day || day < 1 || day > 31) {
      return "日を選択してください";
    }
    if (!gender) {
      return "性別を選択してください";
    }
    return null;
  }

  // 診断実行
  async function runDiagnosis() {
    setError("");

    const { month, day, gender } = getFormValues();
    const error = validateForm(month, day, gender);
    
    if (error) {
      setError(error);
      return;
    }

    // ローディング表示
    if ($result) {
      $result.innerHTML = `
        <section class="card">
          <div class="label">診断中...</div>
          <div>あなたの導き手を探しています...</div>
        </section>
      `;
    }

    try {
      await loadCharacters();
      const partner = pickPartner(month, day, gender);
      showResult(partner);

      // アナリティクス
      if (window.gtag) {
        window.gtag('event', 'partner_diagnosis', {
          'custom_parameter': 'partner_selected'
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
      await loadGuides();
    } catch (error) {
      console.error('初期化エラー:', error);
    }
  });
})();