// archetype-path-improved.js — 没入型表現を適用したアーキタイプ診断システム
(() => {
  const STATE = {
    archetypeData: null,     // archetype_fortune.json の中身
    currentPhase: 1,         // 1: 軸選択, 2: 質問, 3: 結果
    axisValues: {},          // 4軸の選択値
    questionAnswers: {},     // 10問の回答
    selectedArchetype: null, // 確定したアーキタイプ
    selectedRole: null       // 確定した役割
  };

  // エスケープ関数
  const esc = (s) => String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[m]));

  // JSON読み込み
  function loadJSON(url) {
    return fetch(url, { cache: "no-cache" }).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  // データ読み込み
  function loadArchetypeData() {
    return loadJSON("./assets/data/archetype_fortune.json")
      .then(json => {
        STATE.archetypeData = json;
        console.log('Loaded archetype data:', json);
      })
      .catch(err => {
        console.warn("archetype_fortune.json読み込みエラー:", err);
        STATE.archetypeData = { base_patterns: [] };
      });
  }

  // 4軸からアーキタイプを決定
  function analyzeArchetype() {
    const logic = STATE.axisValues.logic || false;     // false=調和, true=正しさ
    const spirit = STATE.axisValues.spirit || false;   // false=風の勘, true=古い地図
    const vector = STATE.axisValues.vector || false;   // false=内省, true=行動
    const social = STATE.axisValues.social || false;   // false=独り, true=仲間

    // アーキタイプ決定ロジック
    if (vector && !spirit) {
      return "Explorer";
    }
    else if (social && !logic) {
      return "Guardian"; 
    }
    else if (spirit && !vector) {
      return "Sage";
    }
    else if (!logic && vector) {
      return "Creator";
    }
    else {
      return "Seeker";
    }
  }

  // 10問の問いかけを生成
  function generateQuestions() {
    return [
      {
        id: 'q1',
        title: '新しい場所に足を踏み入れるとき',
        choices: [
          { id: 'a', text: 'まわりを静かに観察してから動く', weight: 'disciple' },
          { id: 'b', text: '心のままに歩き出してみる', weight: 'stormblade' }
        ]
      },
      {
        id: 'q2', 
        title: 'みんなといるときのあなたは',
        choices: [
          { id: 'a', text: 'そっと道を示すことが多い', weight: 'wind_guide' },
          { id: 'b', text: '大切な思い出を心に留めている', weight: 'lorekeeper' }
        ]
      },
      {
        id: 'q3',
        title: '何かを解決したいとき、大切にするのは',
        choices: [
          { id: 'a', text: '正しいことかどうか', weight: 'knight' },
          { id: 'b', text: '誰かの心が癒されるか', weight: 'healer' }
        ]
      },
      {
        id: 'q4',
        title: '新しいことを身につけるなら',
        choices: [
          { id: 'a', text: '誰かから直接教わりたい', weight: 'disciple' },
          { id: 'b', text: '自分で試しながら覚えたい', weight: 'stormblade' }
        ]
      },
      {
        id: 'q5',
        title: '困難な道に立ったとき',
        choices: [
          { id: 'a', text: 'じっくり考えて最善の道を探す', weight: 'lorekeeper' },
          { id: 'b', text: '心の声を信じて進んでみる', weight: 'stormblade' }
        ]
      },
      {
        id: 'q6',
        title: 'あなたらしい強さは',
        choices: [
          { id: 'a', text: '迷った人をそっと支えること', weight: 'wind_guide' },
          { id: 'b', text: '傷ついた心をやさしく包むこと', weight: 'healer' }
        ]
      },
      {
        id: 'q7',
        title: '理想の導き方は',
        choices: [
          { id: 'a', text: '正しい道を示し続けること', weight: 'knight' },
          { id: 'b', text: 'みんなと一緒に歩むこと', weight: 'wind_guide' }
        ]
      },
      {
        id: 'q8',
        title: 'あなたにとって価値ある時間は',
        choices: [
          { id: 'a', text: '大切な知恵を次の人に伝えること', weight: 'lorekeeper' },
          { id: 'b', text: '新しい可能性に挑戦すること', weight: 'stormblade' }
        ]
      },
      {
        id: 'q9',
        title: '心から満たされる瞬間は',
        choices: [
          { id: 'a', text: '誰かの役に立てたとき', weight: 'healer' },
          { id: 'b', text: '自分らしくいられたとき', weight: 'knight' }
        ]
      },
      {
        id: 'q10',
        title: '最終的に目指したいのは',
        choices: [
          { id: 'a', text: '深い理解と静かな知恵', weight: 'disciple' },
          { id: 'b', text: '世界により良い変化をもたらすこと', weight: 'stormblade' }
        ]
      }
    ];
  }

  // 問いかけの答えから役割を見つける
  function analyzeRole() {
    const weights = {
      disciple: 0,
      stormblade: 0,
      wind_guide: 0,
      lorekeeper: 0,
      knight: 0,
      healer: 0
    };

    // 回答を集計
    Object.values(STATE.questionAnswers).forEach(answerId => {
      const questions = generateQuestions();
      questions.forEach(q => {
        const choice = q.choices.find(c => c.id === answerId);
        if (choice) {
          weights[choice.weight]++;
        }
      });
    });

    // 最も強い傾向の役割を選択
    let maxWeight = 0;
    let selectedRole = 'disciple';
    
    for (const [role, weight] of Object.entries(weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        selectedRole = role;
      }
    }

    return selectedRole;
  }

  // アーキタイプと役割から今日のメッセージを取得
  function getResult(archetype, role) {
    if (!STATE.archetypeData || !STATE.archetypeData.base_patterns) {
      return {
        title: '今日の導き手',
        oracle: 'あなたの道筋が、そっと照らされました。',
        message: 'どんな小さな一歩でも、新しい物語の始まりです。',
        guidance: 'ゆっくりと、あなたらしいペースで歩んでいきましょう。',
        power_words: ['やさしさ', '発見', '希望']
      };
    }

    // 完全一致を探す
    const exactMatch = STATE.archetypeData.base_patterns.find(p => 
      p.archetype === archetype && p.role.toLowerCase() === role.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    }

    // アーキタイプのみ一致を探す
    const archetypeMatch = STATE.archetypeData.base_patterns.find(p => 
      p.archetype === archetype
    );
    
    if (archetypeMatch) {
      return archetypeMatch;
    }

    // デフォルト
    return STATE.archetypeData.base_patterns[0] || {
      title: '今日の導き手',
      oracle: 'あなたの道筋が、そっと照らされました。',
      message: 'どんな小さな一歩でも、新しい物語の始まりです。',
      guidance: 'ゆっくりと、あなたらしいペースで歩んでいきましょう。',
      power_words: ['やさしさ', '発見', '希望']
    };
  }

  // 画面の切り替え
  function updatePhase() {
    const phase1 = document.getElementById('phase1');
    const archetypeBox = document.getElementById('archetypeBox');
    const phase2 = document.getElementById('phase2');
    const resultBox = document.getElementById('resultBox');

    if (STATE.currentPhase === 1) {
      phase1.hidden = false;
      archetypeBox.hidden = true;
      phase2.hidden = true;
      resultBox.hidden = true;
    } else if (STATE.currentPhase === 2) {
      phase1.hidden = true;
      archetypeBox.hidden = false;
      phase2.hidden = false;
      resultBox.hidden = true;
      renderArchetypeBox();
      renderQuestions();
    } else if (STATE.currentPhase === 3) {
      phase1.hidden = true;
      archetypeBox.hidden = false;
      phase2.hidden = true;
      resultBox.hidden = false;
      renderResult();
    }
  }

  function renderArchetypeBox() {
    const archText = document.getElementById('archText');
    if (!archText || !STATE.selectedArchetype) return;

    const archetypeNames = {
      Explorer: '探索者',
      Guardian: '守護者', 
      Sage: '賢者',
      Creator: '創造者',
      Seeker: '探求者'
    };

    archText.innerHTML = `
      <h3>今、あなたの中に「${esc(archetypeNames[STATE.selectedArchetype] || STATE.selectedArchetype)}」の気質が宿っています</h3>
      <p>この傾向をもとに、さらに詳しくあなたの今の状態を読み解いてみましょう。心のままに、問いかけに答えてみてください。</p>
    `;
  }

  function renderQuestions() {
    const qList = document.getElementById('qList');
    if (!qList) return;

    const questions = generateQuestions();
    qList.innerHTML = '';

    questions.forEach((q, index) => {
      const qDiv = document.createElement('div');
      qDiv.className = 'q-item';
      qDiv.innerHTML = `
        <h4 class="q-title">問いかけ${index + 1}: ${esc(q.title)}</h4>
        <div class="q-choices">
          <div class="choice" data-question="${q.id}" data-answer="${q.choices[0].id}">
            <span>${esc(q.choices[0].text)}</span>
          </div>
          <div class="choice" data-question="${q.id}" data-answer="${q.choices[1].id}">
            <span>${esc(q.choices[1].text)}</span>
          </div>
        </div>
      `;
      qList.appendChild(qDiv);
    });

    // 選択肢のクリックイベント
    qList.addEventListener('click', (e) => {
      const choice = e.target.closest('.choice');
      if (!choice) return;

      const question = choice.getAttribute('data-question');
      const answer = choice.getAttribute('data-answer');
      
      // 同じ質問の他の選択肢を非選択に
      const siblings = choice.parentElement.querySelectorAll('.choice');
      siblings.forEach(s => s.removeAttribute('aria-checked'));
      
      // この選択肢を選択
      choice.setAttribute('aria-checked', 'true');
      STATE.questionAnswers[question] = answer;

      // すべて答えたかチェック
      checkAllAnswered();
    });
  }

  function checkAllAnswered() {
    const totalQuestions = generateQuestions().length;
    const answeredCount = Object.keys(STATE.questionAnswers).length;
    const btnEval = document.getElementById('btnEval');
    
    if (btnEval) {
      btnEval.disabled = answeredCount < totalQuestions;
    }
  }

  function renderResult() {
    const roleText = document.getElementById('roleText');
    if (!roleText || !STATE.selectedArchetype || !STATE.selectedRole) return;

    const result = getResult(STATE.selectedArchetype, STATE.selectedRole);

    roleText.innerHTML = `
      <div class="result-header">
        <h3>銀竜からの今日の贈り物</h3>
        <p class="result-subtitle">今のあなたに「${esc(result.title)}」の一面が輝いています</p>
        <div class="result-oracle">
          <blockquote>${esc(result.oracle)}</blockquote>
        </div>
      </div>
      <div class="result-body">
        <div class="result-message">
          <h4>あなたの今に寄り添うメッセージ</h4>
          <p>${esc(result.message)}</p>
        </div>
        <div class="result-guidance">
          <h4>今日という日を歩むためのささやかな指針</h4>
          <p>${esc(result.guidance)}</p>
        </div>
        ${result.power_words && result.power_words.length ? `
          <div class="result-keywords">
            <h4>今日のキーワード</h4>
            <div class="keywords">
              ${result.power_words.map(word => `<span class="keyword">${esc(word)}</span>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // イベントリスナー設定
  function setupEventListeners() {
    // Phase 1: 軸の選択
    document.querySelectorAll('.toggle input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const axis = e.target.closest('.toggle').getAttribute('data-axis');
        STATE.axisValues[axis] = e.target.checked;
      });
    });

    // Phase 1: 気質読み取りボタン
    const btnP1 = document.getElementById('btnP1');
    if (btnP1) {
      btnP1.addEventListener('click', () => {
        STATE.selectedArchetype = analyzeArchetype();
        STATE.currentPhase = 2;
        updatePhase();
      });
    }

    // Phase 1: リセットボタン
    const btnP1Reset = document.getElementById('btnP1Reset');
    if (btnP1Reset) {
      btnP1Reset.addEventListener('click', () => {
        STATE.axisValues = {};
        document.querySelectorAll('.toggle input[type="checkbox"]').forEach(cb => {
          cb.checked = false;
        });
      });
    }

    // Phase 2: メッセージ受け取りボタン
    const btnEval = document.getElementById('btnEval');
    if (btnEval) {
      btnEval.addEventListener('click', () => {
        STATE.selectedRole = analyzeRole();
        STATE.currentPhase = 3;
        updatePhase();
      });
    }

    // Phase 2: クリアボタン
    const btnClearQ = document.getElementById('btnClearQ');
    if (btnClearQ) {
      btnClearQ.addEventListener('click', () => {
        STATE.questionAnswers = {};
        document.querySelectorAll('.choice').forEach(choice => {
          choice.removeAttribute('aria-checked');
        });
        checkAllAnswered();
      });
    }
  }

  // 初期化
  function init() {
    setupEventListeners();
    updatePhase();
  }

  // 起動
  document.addEventListener("DOMContentLoaded", () => {
    loadArchetypeData().then(init);
  });

})();