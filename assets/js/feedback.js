// feedback.js — 今週のひとこと（潜在欲求フィードバックシステム）

(function() {
  'use strict';

  // SiteCore統合（オプショナル）
  const SiteCore = (typeof window !== 'undefined' && window.SiteCore) 
    ? window.SiteCore 
    : { Security: null, Analytics: null };

  // ========== ユーティリティ ==========
  function generateUserId() {
    return 'fb_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  function getCurrentWave() {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    const weekOfMonth = Math.ceil(now.getDate() / 7);
    return `${year}-Q${quarter}-W${weekOfMonth}`;
  }

  function getWeekNumber() {
    const now = new Date();
    return Math.ceil(now.getDate() / 7);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ========== メインアプリケーション ==========
  class FeedbackApp {
    constructor() {
      this.surveyData = {
        user_id: generateUserId(),
        timestamp: new Date().toISOString(),
        survey_wave: getCurrentWave(),
        week_number: getWeekNumber(),
        responses: {},
        metadata: {}
      };

      this.currentQuestionIndex = 0;
      this.questions = [];
      this.weekRotation = 1; // 1-4の週次ローテーション

      this.elements = {
        progressBar: document.getElementById('progressBar'),
        questionContainer: document.getElementById('questionContainer'),
        completionScreen: document.getElementById('completionScreen'),
        responseId: document.getElementById('responseId'),
        errorNotification: document.getElementById('errorNotification'),
        errorMessage: document.getElementById('errorMessage'),
        closeError: document.getElementById('closeError')
      };

      this.dragState = {
        draggedElement: null
      };
    }

    async init() {
      this._bindErrorHandling();
      await this._loadSurveyData();
      this._determineWeekRotation();
      this._renderCurrentQuestion();
      
      // 分析トラッキング
      SiteCore.Analytics?.track?.('feedback_started', {
        wave: this.surveyData.survey_wave,
        week_rotation: this.weekRotation
      });
    }

    _bindErrorHandling() {
      if (this.elements.closeError) {
        this.elements.closeError.addEventListener('click', () => {
          this.elements.errorNotification.hidden = true;
        });
      }
    }

    async _loadSurveyData() {
      try {
        const response = await fetch('./assets/data/feedback.json', {
          cache: 'no-cache',
          headers: { Accept: 'application/json' }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        this.surveyConfig = data;
      } catch (error) {
        console.error('Failed to load survey data:', error);
        this._showError('データの読み込みに失敗しました');
        throw error;
      }
    }

    _determineWeekRotation() {
      // 週次でローテーション（1-4週）
      const week = getWeekNumber();
      this.weekRotation = ((week - 1) % 4) + 1;
      
      const rotationKey = `week_${this.weekRotation}`;
      this.questions = this.surveyConfig.rotations[rotationKey] || [];

      this.surveyData.metadata.rotation_key = rotationKey;
    }

    _updateProgress() {
      const progress = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
      if (this.elements.progressBar) {
        this.elements.progressBar.style.width = `${progress}%`;
      }
    }

    _renderCurrentQuestion() {
      if (this.currentQuestionIndex >= this.questions.length) {
        this._showCompletion();
        return;
      }

      this._updateProgress();

      const question = this.questions[this.currentQuestionIndex];
      const html = this._generateQuestionHTML(question);

      if (this.elements.questionContainer) {
        this.elements.questionContainer.innerHTML = html;
        this._bindQuestionEvents(question);
      }

      // スクロールを上部に
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    _generateQuestionHTML(question) {
      const questionNum = this.currentQuestionIndex + 1;
      const totalQuestions = this.questions.length;
      
      let optionsHTML = '';

      switch (question.type) {
        case 'single_choice':
          optionsHTML = this._generateSingleChoiceHTML(question);
          break;
        case 'multiple_choice':
          optionsHTML = this._generateMultipleChoiceHTML(question);
          break;
        case 'ranking':
          optionsHTML = this._generateRankingHTML(question);
          break;
        case 'text':
          optionsHTML = this._generateTextHTML(question);
          break;
      }

      return `
        <section class="card question-card" data-question-id="${question.id}">
          <div class="question-number">質問 ${questionNum}/${totalQuestions}</div>
          <h2 class="question-text">${escapeHtml(question.question)}</h2>
          ${optionsHTML}
          <div class="question-actions">
            ${question.optional ? `
              <button type="button" class="btn btn-feedback-skip" data-action="skip">
                スキップ
              </button>
            ` : ''}
            <button type="button" class="btn btn-feedback-next" data-action="next" ${question.type !== 'text' ? 'disabled' : ''}>
              ${questionNum === totalQuestions ? '完了' : '次へ'}
            </button>
          </div>
        </section>
      `;
    }

    _generateSingleChoiceHTML(question) {
      const options = question.randomize ? shuffle(question.options) : question.options;
      
      return `
        <div class="question-options">
          ${options.map((option, index) => `
            <div class="option-single">
              <input type="radio" 
                     name="${question.id}" 
                     id="${question.id}_${index}" 
                     value="${option}"
                     data-question-id="${question.id}">
              <label for="${question.id}_${index}">${escapeHtml(option)}</label>
            </div>
          `).join('')}
        </div>
      `;
    }

    _generateMultipleChoiceHTML(question) {
      const options = question.randomize ? shuffle(question.options) : question.options;
      
      return `
        <div class="question-options">
          ${options.map((option, index) => `
            <div class="option-multiple">
              <input type="checkbox" 
                     name="${question.id}" 
                     id="${question.id}_${index}" 
                     value="${option}"
                     data-question-id="${question.id}">
              <label for="${question.id}_${index}">${escapeHtml(option)}</label>
            </div>
          `).join('')}
        </div>
      `;
    }

    _generateRankingHTML(question) {
      const items = shuffle(question.options);
      
      return `
        <div class="ranking-options" data-question-id="${question.id}">
          ${items.map((item, index) => `
            <div class="ranking-item" draggable="true" data-item-id="${index}">
              <span class="drag-handle">☰</span>
              <span class="rank-number">${index + 1}</span>
              <span class="ranking-text">${escapeHtml(item)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    _generateTextHTML(question) {
      return `
        <div class="question-options">
          <textarea 
            class="question-textarea" 
            id="${question.id}" 
            placeholder="${question.placeholder || ''}"
            maxlength="${question.max_length || 500}"
            data-question-id="${question.id}">${this.surveyData.responses[question.id] || ''}</textarea>
          ${question.optional ? '<p class="textarea-optional">※ 任意回答</p>' : ''}
        </div>
      `;
    }

    _bindQuestionEvents(question) {
      const container = this.elements.questionContainer;
      if (!container) return;

      // ラジオボタン/チェックボックスのイベント
      if (question.type === 'single_choice' || question.type === 'multiple_choice') {
        const inputs = container.querySelectorAll(`input[data-question-id="${question.id}"]`);
        
        inputs.forEach(input => {
          input.addEventListener('change', () => {
            this._handleOptionChange(question, input);
          });

          // 親要素のクリックでも選択
          const parent = input.closest('.option-single, .option-multiple');
          if (parent) {
            parent.addEventListener('click', (e) => {
              if (e.target !== input) {
                input.click();
              }
            });
          }
        });
      }

      // ランキングのドラッグ&ドロップ
      if (question.type === 'ranking') {
        this._bindRankingEvents(question);
      }

      // テキストエリアのイベント
      if (question.type === 'text') {
        const textarea = container.querySelector(`#${question.id}`);
        if (textarea) {
          textarea.addEventListener('input', () => {
            this._updateNextButton();
          });
        }
      }

      // アクションボタン
      const nextBtn = container.querySelector('[data-action="next"]');
      const skipBtn = container.querySelector('[data-action="skip"]');

      if (nextBtn) {
        nextBtn.addEventListener('click', () => this._handleNext(question));
      }

      if (skipBtn) {
        skipBtn.addEventListener('click', () => this._handleSkip(question));
      }
    }

    _handleOptionChange(question, changedInput) {
      const container = this.elements.questionContainer;
      
      if (question.type === 'single_choice') {
        // 単一選択：選択状態の視覚的フィードバック
        container.querySelectorAll('.option-single').forEach(opt => {
          opt.classList.remove('selected');
        });
        
        const parent = changedInput.closest('.option-single');
        if (parent && changedInput.checked) {
          parent.classList.add('selected');
        }
      } else if (question.type === 'multiple_choice') {
        // 複数選択：選択状態の視覚的フィードバック
        const parent = changedInput.closest('.option-multiple');
        if (parent) {
          if (changedInput.checked) {
            parent.classList.add('selected');
          } else {
            parent.classList.remove('selected');
          }
        }
      }

      this._updateNextButton();
    }

    _bindRankingEvents(question) {
      const container = this.elements.questionContainer;
      const items = container.querySelectorAll('.ranking-item');

      items.forEach(item => {
        item.addEventListener('dragstart', (e) => this._handleDragStart(e));
        item.addEventListener('dragover', (e) => this._handleDragOver(e));
        item.addEventListener('drop', (e) => this._handleDrop(e));
        item.addEventListener('dragend', (e) => this._handleDragEnd(e));
      });

      // 初期状態で次へボタンを有効化（ランキングはデフォルトで回答済み扱い）
      this._updateNextButton();
    }

    _handleDragStart(e) {
      this.dragState.draggedElement = e.currentTarget;
      e.currentTarget.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    }

    _handleDragOver(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const container = e.currentTarget.closest('.ranking-options');
      const afterElement = this._getDragAfterElement(container, e.clientY);
      
      if (afterElement == null) {
        container.appendChild(this.dragState.draggedElement);
      } else {
        container.insertBefore(this.dragState.draggedElement, afterElement);
      }

      this._updateRankNumbers(container);
    }

    _handleDrop(e) {
      e.preventDefault();
    }

    _handleDragEnd(e) {
      e.currentTarget.classList.remove('dragging');
      this.dragState.draggedElement = null;
    }

    _getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.ranking-item:not(.dragging)')];

      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    _updateRankNumbers(container) {
      const items = container.querySelectorAll('.ranking-item');
      items.forEach((item, index) => {
        const rankNumber = item.querySelector('.rank-number');
        if (rankNumber) {
          rankNumber.textContent = index + 1;
        }
      });
    }

    _updateNextButton() {
      const container = this.elements.questionContainer;
      const nextBtn = container?.querySelector('[data-action="next"]');
      if (!nextBtn) return;

      const question = this.questions[this.currentQuestionIndex];
      let isValid = false;

      switch (question.type) {
        case 'single_choice':
          isValid = container.querySelector(`input[name="${question.id}"]:checked`) !== null;
          break;
        case 'multiple_choice':
          isValid = container.querySelectorAll(`input[name="${question.id}"]:checked`).length > 0;
          break;
        case 'ranking':
          isValid = true; // ランキングは常に有効
          break;
        case 'text':
          const textarea = container.querySelector(`#${question.id}`);
          isValid = question.optional || (textarea && textarea.value.trim().length > 0);
          break;
      }

      nextBtn.disabled = !isValid;
    }

    _handleNext(question) {
      this._saveResponse(question);
      
      // アニメーション
      const card = this.elements.questionContainer?.querySelector('.question-card');
      if (card) {
        card.classList.add('exiting');
        setTimeout(() => {
          this.currentQuestionIndex++;
          this._renderCurrentQuestion();
        }, 300);
      } else {
        this.currentQuestionIndex++;
        this._renderCurrentQuestion();
      }

      // 分析トラッキング
      SiteCore.Analytics?.track?.('feedback_question_answered', {
        question_id: question.id,
        question_index: this.currentQuestionIndex
      });
    }

    _handleSkip(question) {
      this.surveyData.responses[question.id] = { skipped: true };
      
      const card = this.elements.questionContainer?.querySelector('.question-card');
      if (card) {
        card.classList.add('exiting');
        setTimeout(() => {
          this.currentQuestionIndex++;
          this._renderCurrentQuestion();
        }, 300);
      } else {
        this.currentQuestionIndex++;
        this._renderCurrentQuestion();
      }

      // 分析トラッキング
      SiteCore.Analytics?.track?.('feedback_question_skipped', {
        question_id: question.id,
        question_index: this.currentQuestionIndex
      });
    }

    _saveResponse(question) {
      const container = this.elements.questionContainer;
      
      switch (question.type) {
        case 'single_choice': {
          const selected = container.querySelector(`input[name="${question.id}"]:checked`);
          this.surveyData.responses[question.id] = selected ? selected.value : null;
          break;
        }
        case 'multiple_choice': {
          const selected = container.querySelectorAll(`input[name="${question.id}"]:checked`);
          this.surveyData.responses[question.id] = Array.from(selected).map(input => input.value);
          break;
        }
        case 'ranking': {
          const items = container.querySelectorAll('.ranking-item');
          this.surveyData.responses[question.id] = Array.from(items).map(item => 
            item.querySelector('.ranking-text').textContent.trim()
          );
          break;
        }
        case 'text': {
          const textarea = container.querySelector(`#${question.id}`);
          this.surveyData.responses[question.id] = textarea ? textarea.value.trim() : '';
          break;
        }
      }
    }

    _showCompletion() {
      this._submitSurvey();

      if (this.elements.questionContainer) {
        this.elements.questionContainer.style.display = 'none';
      }

      if (this.elements.completionScreen) {
        this.elements.completionScreen.style.display = 'block';
      }

      if (this.elements.responseId) {
        const shortId = this.surveyData.user_id.substr(0, 8).toUpperCase();
        if (SiteCore.Security?.updateContent) {
          SiteCore.Security.updateContent(this.elements.responseId, shortId);
        } else {
          this.elements.responseId.textContent = shortId;
        }
      }

      // プログレスバーを100%に
      if (this.elements.progressBar) {
        this.elements.progressBar.style.width = '100%';
      }

      // 分析トラッキング
      SiteCore.Analytics?.track?.('feedback_completed', {
        wave: this.surveyData.survey_wave,
        response_count: Object.keys(this.surveyData.responses).length
      });
    }

    _submitSurvey() {
      // 本番環境ではバックエンドに送信
      console.log('Survey Data:', this.surveyData);

      // ローカルストレージに保存（デモ用）
      try {
        localStorage.setItem('lastFeedback', JSON.stringify({
          timestamp: this.surveyData.timestamp,
          wave: this.surveyData.survey_wave
        }));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }

      // TODO: 本番実装時
      // fetch('/api/feedback/submit', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(this.surveyData)
      // });
    }

    _showError(message) {
      if (this.elements.errorNotification && this.elements.errorMessage) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorNotification.hidden = false;

        setTimeout(() => {
          this.elements.errorNotification.hidden = true;
        }, 5000);
      }
    }
  }

  // ========== 起動 ==========
  document.addEventListener('DOMContentLoaded', () => {
    const app = new FeedbackApp();
    app.init().catch(error => {
      console.error('Failed to initialize feedback app:', error);
    });
  });

})();
