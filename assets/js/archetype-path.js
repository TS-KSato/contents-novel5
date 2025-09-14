// archetype-path.js — アーキタイプ診断システム
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
    // Explorer: 行動的で新しいことを求める
    if (vector && !spirit) {
      return "Explorer";
    }
    // Guardian: 他者を守り、安定を重視
    else if (social && !logic) {
      return "Guardian"; 
    }
    // Sage: 知識と理解を重視
    else if (spirit && !vector) {
      return "Sage";
    }
    // Creator: 新しいものを生み出す
    else if (!logic && vector) {
      return "Creator";
    }
    // Seeker: 真理を探求
    else {
      return "Seeker";
    }
  }

  // 10問の質問を生成
  function generateQuestions() {
    return [
      {
        id: 'q1',
        title: '新しい環境に入るとき、あなたは',
        choices: [
          { id: 'a', text: 'まず全体を観察して学ぼうとする', weight: 'disciple' },
          { id: 'b', text: '積極的に行動して道を開く', weight: 'stormblade' }
        ]
      },
      {
        id: 'q2', 
        title: 'グループの中での役割は',
        choices: [
          { id: 'a', text: 'みんなを導いて方向性を示す', weight: 'wind_guide' },
          { id: 'b', text: '知識や経験を記録・共有する', weight: 'lorekeeper' }
        ]
      },
      {
        id: 'q3',
        title: '問題解決において重視するのは',
        choices: [
          { id: 'a', text: '正義と公正性', weight: 'knight' },
          { id: 'b', text: '関わる人の癒しと回復', weight: 'healer' }
        ]
      },
      {
        id: 'q4',
        title: '学習スタイルとして好むのは',
        choices: [
          { id: 'a', text: '師匠から直接学ぶ', weight: 'disciple' },
          { id: 'b', text: '実践を通して身につける', weight: 'stormblade' }
        ]
      },
      {
        id: 'q5',
        title: '困難に直面したとき',
        choices: [
          { id: 'a', text: '冷静に分析して最適解を探す', weight: 'lorekeeper' },
          { id: 'b', text: '直感を信じて突破する', weight: 'stormblade' }
        ]
      },
      {
        id: 'q6',
        title: 'あなたの強みは',
        choices: [
          { id: 'a', text: '人を支え、導くこと', weight: 'wind_guide' },
          { id: 'b', text: '傷ついた人を癒すこと', weight: 'healer' }
        ]
      },
      {
        id: 'q7',
        title: '理想的なリーダーシップとは',
        choices: [
          { id: 'a', text: '正義を貫き、規範を示す', weight: 'knight' },
          { id: 'b', text: '皆を巻き込んで成長させる', weight: 'wind_guide' }
        ]
      },
      {
        id: 'q8',
        title: '価値ある活動とは',
        choices: [
          { id: 'a', text: '知識を次世代に継承する', weight: 'lorekeeper' },
          { id: 'b', text: '新たな可能性に挑戦する', weight: 'stormblade' }
        ]
      },
      {
        id: 'q9',
        title: '人生における成功とは',
        choices: [
          { id: 'a', text: '多くの人の役に立つこと', weight: 'healer' },
          { id: 'b', text: '自分の信念を貫くこと', weight: 'knight' }
        ]
      },
      {
        id: 'q10',
        title: '最終的に目指すのは',
        choices: [
          { id: 'a', text: '深い知恵と理解を得る', weight: 'disciple' },
          { id: 'b', text: '世界により良い変化をもたらす', weight: 'stormblade' }
        ]
      }
    ];
  }

  // 質問回答から役割を決定
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

    // 最高スコアの役割を選択
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

  // アーキタイプと役割の組み合わせから結果を取得
  function getResult(archetype, role) {
    if (!STATE.archetypeData || !STATE.archetypeData.base_patterns) {
      return {
        title: '診断結果',
        oracle: 'あなたの道が明らかになりました。',
        message: 'これからの歩みにお役立てください。',
        guidance: '一歩ずつ、着実に進んでいきましょう。',
        power_words: ['成長', '発見', '希望']
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
      title: '診断結果',
      oracle: 'あなたの道が明らかになりました。',
      message: 'これからの歩みにお役立てください。',
      guidance: '一歩ずつ、着実に進んでいきましょう。',
      power_words: ['成長', '発見', '希望']
    };
  }

  // UI更新
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
      <h3>${esc(archetypeNames[STATE.selectedArchetype] || STATE.selectedArchetype)}</h3>
      <p>あなたのタイプが決まりました。続いて10の質問で詳細な役割を診断します。</p>
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
        <h4 class="q-title">問${index + 1}: ${esc(q.title)}</h4>
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
        <h3>${esc(result.title)}</h3>
        <div class="result-oracle">
          <blockquote>${esc(result.oracle)}</blockquote>
        </div>
      </div>
      <div class="result-body">
        <div class="result-message">
          <h4>メッセージ</h4>
          <p>${esc(result.message)}</p>
        </div>
        <div class="result-guidance">
          <h4>今日の指針</h4>
          <p>${esc(result.guidance)}</p>
        </div>
        ${result.power_words && result.power_words.length ? `
          <div class="result-keywords">
            <h4>キーワード</h4>
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

    // Phase 1: 確定ボタン
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

    // Phase 2: 評価ボタン
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