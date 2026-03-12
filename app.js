// ============================================================================
// APPLICATION STATE & DATA LOADING - MCQ ONLY VERSION
// ============================================================================
let questionBank = {};
let javaQuestionBank = {};      // Java question bank (loaded separately)
let cQuestionBank = {};         // C language question bank (SC1008)
let currentLanguage = 'python'; // 'python' | 'java' | 'c'
let currentMode = 'selection';
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let timeRemaining = 3600;
let timerInterval = null;
let isPaused = false;
let quizStartTime = null;
let quizEndTime = null;
let quizSettings = loadQuizSettings();

// Analytics - Simplified for MCQ only
let analyticsData = JSON.parse(localStorage.getItem('quizAnalytics')) || {
  attempts: [],
  questionStats: {},
  categoryPerformance: {},
  weekPerformance: {},
  bestScore: 0
};

// ============================================================================
// EXTERNAL DATA LOADING - MCQ ONLY
// ============================================================================
async function loadExternalData() {
  try {
    showLoadingState(true);
    
    // Load Python MCQ question bank
    const questionResponse = await fetch('questions.json');
    if (!questionResponse.ok) throw new Error('Could not load questions.json');
    questionBank = await questionResponse.json();

    // Load Java MCQ question bank (graceful fallback if file missing)
    try {
      const javaResponse = await fetch('java_questions.json');
      if (javaResponse.ok) {
        javaQuestionBank = await javaResponse.json();
      } else {
        javaQuestionBank = { weeks: {} };
      }
    } catch (_) {
      javaQuestionBank = { weeks: {} };
    }

    // Load C MCQ question bank (graceful fallback if file missing)
    try {
      const cResponse = await fetch('c_questions.json');
      if (cResponse.ok) {
        cQuestionBank = await cResponse.json();
      } else {
        cQuestionBank = { weeks: {} };
      }
    } catch (_) {
      cQuestionBank = { weeks: {} };
    }
    
    showLoadingState(false);
    initializeApp();
  } catch (error) {
    console.error('Failed to load data:', error);
    showErrorMessage('Failed to load quiz data. Please ensure questions.json exists.');
    // Fallback to empty structure
    questionBank = { weeks: {} };
    javaQuestionBank = { weeks: {} };
    cQuestionBank = { weeks: {} };
  }
}

function showLoadingState(isLoading) {
  const container = document.querySelector('.container');
  if (!container) return;
  
  if (isLoading) {
    let loadingScreen = container.querySelector('.loading-screen');
    if (!loadingScreen) {
      loadingScreen = document.createElement('div');
      loadingScreen.className = 'loading-screen';
      loadingScreen.innerHTML = '<div class="spinner"></div><p>Loading Quiz Data...</p>';
      container.appendChild(loadingScreen);
    }
    loadingScreen.style.display = 'flex';
    container.style.opacity = '0.5';
    container.style.pointerEvents = 'none';
  } else {
    const loadingScreen = container.querySelector('.loading-screen');
    if (loadingScreen) {
      loadingScreen.style.display = 'none';
    }
    container.style.opacity = '1';
    container.style.pointerEvents = 'auto';
  }
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', function() {
  loadExternalData().then(() => {
    setupEventListeners();
    updateQuestionBankStats();
  });
});

function initializeApp() {
  renderWeekFilters();
  renderCategoryFilters();
  renderDifficultyFilters();
  renderAdminQuestions();
  // Removed: renderAdminCodingChallenges();
  updateAnalytics();
}

// ============================================================================
// LANGUAGE SWITCH (via sidebar)
// ============================================================================
function switchLanguage(lang) {
  if (lang === currentLanguage) return;
  currentLanguage = lang;

  const title = document.getElementById('main-page-title');

  if (currentLanguage === 'java') {
    if (title) title.textContent = "Danny's SC2002 Java Quiz";
  } else if (currentLanguage === 'c') {
    if (title) title.textContent = "Danny's SC1008 C Language Quiz";
  } else {
    if (title) title.textContent = "Danny's SC1003 Programming Quiz";
  }

  // Update sidebar active state
  document.querySelectorAll('.sidebar__item[data-lang]').forEach(item => {
    item.classList.toggle('sidebar__item--active', item.dataset.lang === currentLanguage);
  });

  // Refresh filters and stats for the new language
  renderWeekFilters();
  renderCategoryFilters();
  renderDifficultyFilters();
  renderAdminQuestions();
  updateQuestionBankStats();
}

// ── Sidebar init ─────────────────────────────────────────
function initSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (!sidebar) return;

  // Language nav items
  sidebar.querySelectorAll('.sidebar__item[data-lang]').forEach(item => {
    item.addEventListener('click', () => switchLanguage(item.dataset.lang));
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); switchLanguage(item.dataset.lang); }
    });
  });

  // Admin / Settings gear at bottom
  const adminBtn = document.getElementById('sidebar-admin-btn');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => showAdminMode());
    adminBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showAdminMode(); }
    });
  }
}

function loadQuizSettings() {
  const stored = localStorage.getItem('quizSettings');
  if (stored) {
    return JSON.parse(stored);
  }
  return { duration: 60, questionsPerQuiz: 30 };
}

// ============================================================================
// EVENT LISTENERS SETUP - MCQ ONLY
// ============================================================================
function setupEventListeners() {
  // Sidebar (replaces lang toggle)
  initSidebar();

  // Mode selection
  document.getElementById('start-student-quiz').addEventListener('click', () => openStudentConfigModal());
  document.getElementById('start-practice-mode').addEventListener('click', () => showPracticeSetup());
  // Removed: Quiz 2 button listener
  document.getElementById('start-history-mode').addEventListener('click', () => showHistoryScreen());
  document.getElementById('back-from-history').addEventListener('click', () => showScreen('modeSelection'));
  
  // Student config modal
  document.getElementById('close-student-config').addEventListener('click', closeStudentConfigModal);
  document.getElementById('cancel-student-config').addEventListener('click', closeStudentConfigModal);
  document.getElementById('confirm-student-config').addEventListener('click', confirmStudentConfig);

  // Practice setup
  document.getElementById('back-to-mode-selection').addEventListener('click', () => showScreen('modeSelection'));
  document.getElementById('start-practice-quiz').addEventListener('click', () => startPracticeQuiz());
  document.getElementById('practice-question-count').addEventListener('change', (e) => {
    const customInput = document.getElementById('practice-question-custom');
    if (e.target.value === 'custom') {
      customInput.classList.remove('hidden');
      customInput.focus();
    } else {
      customInput.classList.add('hidden');
    }
    updatePracticePreview();
  });
  document.getElementById('practice-question-custom').addEventListener('input', updatePracticePreview);
  // Admin mode
  document.getElementById('back-to-home').addEventListener('click', () => showScreen('modeSelection'));
  document.getElementById('add-mcq-btn').addEventListener('click', () => showQuestionModal(null));
  // Removed: Add coding challenge button
  document.getElementById('question-search').addEventListener('input', (e) => filterQuestions(e.target.value));
  
  // Admin tabs (scoped to admin screen only)
  document.querySelectorAll('#admin-screen .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
  });
  
  // Quiz navigation
  document.getElementById('prev-btn').addEventListener('click', goToPreviousQuestion);
  document.getElementById('next-btn').addEventListener('click', goToNextQuestion);
  document.getElementById('pause-btn').addEventListener('click', pauseQuiz);
  document.getElementById('submit-quiz-btn').addEventListener('click', submitQuiz);
  document.getElementById('resume-btn').addEventListener('click', resumeQuiz);
  document.getElementById('end-quiz-btn').addEventListener('click', endQuiz);
  
  // Results
  document.getElementById('review-answers-btn').addEventListener('click', showAnswerReview);
  document.getElementById('practice-weak-areas').addEventListener('click', practiceWeakAreas);
  document.getElementById('restart-quiz-btn').addEventListener('click', () => showScreen('modeSelection'));
  document.getElementById('back-to-home-results').addEventListener('click', () => showScreen('modeSelection'));
  
  // Question modal
  document.getElementById('close-question-modal').addEventListener('click', closeQuestionModal);
  document.getElementById('cancel-question').addEventListener('click', closeQuestionModal);
  document.getElementById('save-question').addEventListener('click', saveQuestion);
  
  // Settings
  document.getElementById('save-settings').addEventListener('click', saveSettings);
  document.getElementById('export-questions').addEventListener('click', exportQuestions);
  document.getElementById('clear-analytics').addEventListener('click', clearAnalytics);
  document.getElementById('import-json').addEventListener('change', importQuestions);
  
  // Review filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => filterReview(e.target.dataset.filter));
  });
  
  // Practice preview update
  document.getElementById('week-filters').addEventListener('change', updatePracticePreview);

  // Select All buttons
  document.getElementById('select-all-weeks').addEventListener('click', () => {
    document.querySelectorAll('#week-filters .week-filter').forEach(div => {
      const cb = div.querySelector('input');
      cb.checked = true;
      div.classList.add('selected');
    });
    updatePracticePreview();
  });
  document.getElementById('select-all-categories').addEventListener('click', () => {
    document.querySelectorAll('#category-filters .filter-checkbox').forEach(div => {
      const cb = div.querySelector('input');
      cb.checked = true;
      div.classList.add('selected');
    });
    updatePracticePreview();
  });
  document.getElementById('select-all-difficulties').addEventListener('click', () => {
    document.querySelectorAll('#difficulty-filters .filter-checkbox').forEach(div => {
      const cb = div.querySelector('input');
      cb.checked = true;
      div.classList.add('selected');
    });
    updatePracticePreview();
  });
}

// ============================================================================
// QUIZ MODE & LOGIC - MCQ ONLY
// ============================================================================
// ============================================================================
// STUDENT QUIZ CONFIG MODAL
// ============================================================================
function openStudentConfigModal() {
  // Set smart defaults based on active language
  const isJava = currentLanguage === 'java';
  document.getElementById('config-duration').value  = isJava ? 45 : quizSettings.duration;
  document.getElementById('config-questions').value = isJava ? 22 : quizSettings.questionsPerQuiz;
  document.getElementById('student-config-title').textContent =
    isJava ? '☕ Java Student Quiz Setup' : '🎓 Python Student Quiz Setup';
  document.getElementById('config-hint').textContent =
    isJava ? 'Java exam: 45 min / 22 questions' : 'SC1003 exam: 60 min / 30 questions';
  document.getElementById('student-config-modal').classList.remove('hidden');
}

function closeStudentConfigModal() {
  document.getElementById('student-config-modal').classList.add('hidden');
}

function confirmStudentConfig() {
  const mins = parseInt(document.getElementById('config-duration').value)  || 60;
  const qs   = parseInt(document.getElementById('config-questions').value) || 30;
  closeStudentConfigModal();
  startStudentQuiz(mins, qs);
}

function startStudentQuiz(durationMins, questionCount) {
  durationMins  = durationMins  || quizSettings.duration;
  questionCount = questionCount || quizSettings.questionsPerQuiz;

  currentQuestions = selectQuizQuestions({ 
    count: questionCount,
    weeks: Object.keys(getActiveBank().weeks)
  });
  timeRemaining = durationMins * 60;
  document.getElementById('quiz-mode-badge').textContent = 'Student Quiz';
  document.getElementById('quiz-mode-badge').className = 'quiz-mode-badge';
  document.getElementById('timer').style.display = 'block';
  startQuiz();
}
function startPracticeQuiz() {
  const selectedWeeks = getSelectedFilters('week-filters');
  const selectedCategories = getSelectedFilters('category-filters');
  const selectedDifficulties = getSelectedFilters('difficulty-filters');
  const countSelect = document.getElementById('practice-question-count').value;
  const questionCount = countSelect === 'custom'
    ? (parseInt(document.getElementById('practice-question-custom').value) || 10)
    : countSelect;
  
  if (selectedWeeks.length === 0) {
    alert('Please select at least one week');
    return;
  }
  
  currentQuestions = selectQuizQuestions({
    count: questionCount,
    weeks: selectedWeeks,
    categories: selectedCategories.length > 0 ? selectedCategories : undefined,
    difficulties: selectedDifficulties.length > 0 ? selectedDifficulties : undefined
  });
  
  if (currentQuestions.length === 0) {
    alert('No questions match your selected criteria. Please adjust your filters.');
    return;
  }
  
  // Practice mode has no timer
  timeRemaining = null;
  document.getElementById('quiz-mode-badge').textContent = 'Practice Mode';
  document.getElementById('quiz-mode-badge').className = 'quiz-mode-badge quiz2';
  document.getElementById('timer').style.display = 'none';
  
  startQuiz();
}
function showPracticeSetup() {
  showScreen('practiceSetup');
  updatePracticePreview();
}

// Removed: startQuiz2() function completely

function showAdminMode() {
  showScreen('admin');
  switchTab('questions');
}

function startQuiz() {
  showScreen('quiz');
  quizStartTime = new Date();
  currentQuestionIndex = 0;
  userAnswers = {};
  isPaused = false;
  
  if (timeRemaining) {
    startTimer();
  }
  
  displayQuestion();
  updateNavigation();
}

// ============================================================================
// TIMER & DISPLAY - MCQ ONLY
// ============================================================================
function startTimer() {
  timerInterval = setInterval(() => {
    if (!isPaused) {
      timeRemaining--;
      updateTimerDisplay();
      
      if (timeRemaining <= 0) {
        submitQuiz();
      }
    }
  }, 1000);
}

function updateTimerDisplay() {
  if (!timeRemaining) return;
  
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  const timerDisplay = document.getElementById('timer');
  timerDisplay.textContent = timeString;
  
  timerDisplay.classList.remove('timer-warning', 'timer-critical');
  
  if (timeRemaining <= 300) {
    timerDisplay.classList.add('timer-critical');
  } else if (timeRemaining <= 600) {
    timerDisplay.classList.add('timer-warning');
  }
}

function displayQuestion() {
  const question = currentQuestions[currentQuestionIndex];
  
  // Update progress
  document.getElementById('progress').textContent = `Question ${currentQuestionIndex + 1} of ${currentQuestions.length}`;
  const progressPercent = ((currentQuestionIndex + 1) / currentQuestions.length) * 100;
  document.getElementById('progress-fill').style.width = `${progressPercent}%`;
  
  // Display MCQ question only
  displayMCQ(question);
  
  updateNavigation();
}

function displayMCQ(question) {
  const container = document.querySelector('.question-container');
  container.innerHTML = `
    <div class="card">
      <div class="card__body">
        <div class="question-meta">
          <div class="question-number">Question ${currentQuestionIndex + 1}</div>
          <div class="question-badges">
            <span class="category-badge">${question.category}</span>
            <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
            <span class="week-badge">Week ${question.week.replace('week', '')}</span>
          </div>
        </div>
        <div class="question-text">${formatQuestionText(question.question)}</div>
        <div class="options-container" id="options-container"></div>
      </div>
    </div>
  `;
  
  displayOptions(question);
}

// Removed: displayCodingProblem() function completely

function formatQuestionText(text) {
  return text
    .replace(/```java\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
    .replace(/```python\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
    .replace(/```c\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')   // ← ADD THIS LINE
    .replace(/```\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
}

function displayOptions(question) {
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  
  const isMultipleChoice = question.correct.length > 1;
  const inputType = isMultipleChoice ? 'checkbox' : 'radio';
  
  question.options.forEach((option, index) => {
    const optionLetter = String.fromCharCode(65 + index);
    const optionDiv = document.createElement('div');
    optionDiv.className = 'option';
    
    const input = document.createElement('input');
    input.type = inputType;
    input.name = `question-${question.id}`;
    input.value = optionLetter;
    input.id = `q${question.id}-${optionLetter}`;
    
    const label = document.createElement('label');
    label.htmlFor = `q${question.id}-${optionLetter}`;
    label.className = 'option-label';
    label.textContent = option;
    
    // Restore previous selections
    const userAnswer = userAnswers[question.id];
    if (userAnswer && userAnswer.includes(optionLetter)) {
      input.checked = true;
      optionDiv.classList.add('selected');
    }
    
    // Handle selection changes
    input.addEventListener('change', () => {
      handleAnswerChange(question.id, optionLetter, input.checked, isMultipleChoice);
      
      // Update visual state for this option
      if (input.checked) {
        optionDiv.classList.add('selected');
      } else {
        optionDiv.classList.remove('selected');
      }
    });
    
    // CRITICAL FIX: Remove problematic click handler
    // Only trigger input if clicking the empty space, not input/label
    optionDiv.addEventListener('click', (e) => {
      if (e.target === optionDiv) {
        input.click();
      }
    });
    console.log("Question ID:", question.id, "Correct answers:", question.correct, "Is multiple choice:", isMultipleChoice);
    optionDiv.appendChild(input);
    optionDiv.appendChild(label);
    container.appendChild(optionDiv);
  });
}

function handleAnswerChange(questionId, optionLetter, isChecked, isMultipleChoice) {
  if (!userAnswers[questionId]) {
    userAnswers[questionId] = [];
  }
  
  if (isMultipleChoice) {
    if (isChecked) {
      if (!userAnswers[questionId].includes(optionLetter)) {
        userAnswers[questionId].push(optionLetter);
      }
    } else {
      userAnswers[questionId] = userAnswers[questionId].filter(answer => answer !== optionLetter);
    }
  } else {
    userAnswers[questionId] = isChecked ? [optionLetter] : [];
  }
  
  // Update all option styles to reflect current state
  updateOptionStyles();
}

function updateOptionStyles() {
  const options = document.querySelectorAll('.option');
  options.forEach(option => {
    const input = option.querySelector('input');
    if (input.checked) {
      option.classList.add('selected');
    } else {
      option.classList.remove('selected');
    }
  });
}

// Removed: runTestCases() and submitCodingAnswer() functions completely

// ============================================================================
// NAVIGATION & RESULTS - MCQ ONLY
// ============================================================================
function goToPreviousQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    displayQuestion();
    updateNavigation();
  }
}

function goToNextQuestion() {
  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    displayQuestion();
    updateNavigation();
  }
}

function updateNavigation() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  
  prevBtn.disabled = currentQuestionIndex === 0;
  nextBtn.disabled = currentQuestionIndex === currentQuestions.length - 1;
  
  if (currentQuestionIndex === currentQuestions.length - 1) {
    nextBtn.textContent = 'Finish';
  } else {
    nextBtn.textContent = 'Next';
  }
}

function pauseQuiz() {
  isPaused = true;
  document.getElementById('pause-modal').classList.remove('hidden');
}

function resumeQuiz() {
  isPaused = false;
  document.getElementById('pause-modal').classList.add('hidden');
}

function endQuiz() {
  submitQuiz();
}

function submitQuiz() {
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  quizEndTime = new Date();
  showScreen('results');
  document.getElementById('pause-modal').classList.add('hidden');
  
  calculateAndDisplayResults();
  saveQuizAttempt();
}

function calculateAndDisplayResults() {
  let correctAnswers = 0;
  const categoryStats = {};
  const difficultyStats = {};
  const weekStats = {};
  
  currentQuestions.forEach(question => {
    const userAnswer = userAnswers[question.id] || [];
    const isCorrect = arraysEqual(userAnswer.sort(), question.correct.sort());
    
    if (isCorrect) correctAnswers++;
    
    // Track question stats
    if (!analyticsData.questionStats[question.id]) {
      analyticsData.questionStats[question.id] = { attempts: 0, correct: 0 };
    }
    analyticsData.questionStats[question.id].attempts++;
    if (isCorrect) analyticsData.questionStats[question.id].correct++;
    
    // Track by category
    if (question.category) {
      if (!categoryStats[question.category]) {
        categoryStats[question.category] = { correct: 0, total: 0 };
      }
      categoryStats[question.category].total++;
      if (isCorrect) categoryStats[question.category].correct++;
    }
    
    // Track by difficulty
    if (question.difficulty) {
      if (!difficultyStats[question.difficulty]) {
        difficultyStats[question.difficulty] = { correct: 0, total: 0 };
      }
      difficultyStats[question.difficulty].total++;
      if (isCorrect) difficultyStats[question.difficulty].correct++;
    }
    
    // Track by week
    if (question.week) {
      if (!weekStats[question.week]) {
        weekStats[question.week] = { correct: 0, total: 0 };
      }
      weekStats[question.week].total++;
      if (isCorrect) weekStats[question.week].correct++;
    }
  });
  
  const totalQuestions = currentQuestions.length;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const timeElapsed = quizStartTime && quizEndTime 
    ? Math.floor((quizEndTime - quizStartTime) / 1000)
    : (timeRemaining ? (quizSettings.duration * 60) - timeRemaining : 0);
  
  // Display results
  document.getElementById('score-percentage').textContent = `${percentage}%`;
  document.getElementById('score-fraction').textContent = `${correctAnswers} / ${totalQuestions}`;
  
  if (timeElapsed) {
    const minutes = Math.floor(timeElapsed / 60);
    const seconds = timeElapsed % 60;
    document.getElementById('time-taken').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
  
  // Display breakdowns
  displayWeekBreakdown(weekStats);
  displayCategoryBreakdown(categoryStats);
  displayDifficultyBreakdown(difficultyStats);
  // Removed: displayCodingBreakdown()
  
  generateRecommendations(weekStats, categoryStats, difficultyStats);
  
  // Update best score
  if (percentage > analyticsData.bestScore) {
    analyticsData.bestScore = percentage;
    document.getElementById('completion-rate').textContent = `${percentage}%`;
  }
}

function displayWeekBreakdown(weekStats) {
  const container = document.getElementById('week-scores');
  container.innerHTML = '';
  
  Object.keys(weekStats).forEach(weekId => {
    const stats = weekStats[weekId];
    const percentage = Math.round((stats.correct / stats.total) * 100);
    const weekNum = weekId.replace('week', '');
    
    const item = document.createElement('div');
    item.className = 'score-item';
    
    if (percentage >= 80) item.classList.add('good');
    else if (percentage >= 60) item.classList.add('needs-work');
    else item.classList.add('poor');
    
    item.innerHTML = `
      <span>Week ${weekNum}</span>
      <span>${stats.correct}/${stats.total} (${percentage}%)</span>
    `;
    
    container.appendChild(item);
  });
}

function displayCategoryBreakdown(categoryStats) {
  const container = document.getElementById('category-scores');
  container.innerHTML = '';
  
  Object.keys(categoryStats).forEach(categoryId => {
    const stats = categoryStats[categoryId];
    const percentage = Math.round((stats.correct / stats.total) * 100);
    
    const item = document.createElement('div');
    item.className = 'score-item';
    
    if (percentage >= 80) item.classList.add('good');
    else if (percentage >= 60) item.classList.add('needs-work');
    else item.classList.add('poor');
    
    item.innerHTML = `
      <span>${categoryId}</span>
      <span>${stats.correct}/${stats.total} (${percentage}%)</span>
    `;
    
    container.appendChild(item);
  });
}

function displayDifficultyBreakdown(difficultyStats) {
  const container = document.getElementById('difficulty-scores');
  container.innerHTML = '';
  
  Object.keys(difficultyStats).forEach(difficultyId => {
    const stats = difficultyStats[difficultyId];
    const percentage = Math.round((stats.correct / stats.total) * 100);
    
    const item = document.createElement('div');
    item.className = 'score-item';
    
    if (percentage >= 80) item.classList.add('good');
    else if (percentage >= 60) item.classList.add('needs-work');
    else item.classList.add('poor');
    
    item.innerHTML = `
      <span>${difficultyId}</span>
      <span>${stats.correct}/${stats.total} (${percentage}%)</span>
    `;
    
    container.appendChild(item);
  });
}

// Removed: displayCodingBreakdown() function completely

function generateRecommendations(weekStats, categoryStats, difficultyStats) {
  const container = document.getElementById('recommendation-list');
  container.innerHTML = '';
  
  const recommendations = [];
  
  // Check week performance
  Object.keys(weekStats).forEach(weekId => {
    const stats = weekStats[weekId];
    const percentage = (stats.correct / stats.total) * 100;
    const weekNum = weekId.replace('week', '');
    
    if (percentage < 70) {
      recommendations.push(`Review Week ${weekNum} content (${Math.round(percentage)}% correct)`);
    }
  });
  
  // Check category performance
  Object.keys(categoryStats).forEach(categoryId => {
    const stats = categoryStats[categoryId];
    const percentage = (stats.correct / stats.total) * 100;
    
    if (percentage < 70) {
      recommendations.push(`Focus more on ${categoryId} questions`);
    }
  });
  
  // Check difficulty performance
  Object.keys(difficultyStats).forEach(difficultyId => {
    const stats = difficultyStats[difficultyId];
    const percentage = (stats.correct / stats.total) * 100;
    
    if (percentage < 60) {
      recommendations.push(`Practice more ${difficultyId.toLowerCase()} level questions`);
    }
  });
  
  if (recommendations.length === 0) {
    recommendations.push('Great job! Keep practicing to maintain your performance');
  }
  
  recommendations.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'recommendation-item';
    item.textContent = rec;
    container.appendChild(item);
  });
}

function saveQuizAttempt() {
  let correctAnswers = 0;
  
  currentQuestions.forEach(question => {
    const userAnswer = userAnswers[question.id] || [];
    if (arraysEqual(userAnswer.sort(), question.correct.sort())) {
      correctAnswers++;
    }
  });

  const id = Date.now();
  const attempt = {
    id,
    date: new Date().toISOString(),
    mode: currentMode,
    language: currentLanguage,
    questions: currentQuestions.length,
    correct: correctAnswers,
    percentage: Math.round((correctAnswers / currentQuestions.length) * 100),
    timeElapsed: quizStartTime && quizEndTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : null
  };
  
  analyticsData.attempts.push(attempt);
  localStorage.setItem('quizAnalytics', JSON.stringify(analyticsData));
  updateAnalytics();

  // Save full snapshot for the History feature
  const historyEntry = {
    ...attempt,
    questions: currentQuestions.map(q => ({ ...q })),   // deep clone
    userAnswers: { ...userAnswers }
  };
  // Rename the numeric count so it doesn't clash with the questions array
  historyEntry.questionCount = currentQuestions.length;

  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  history.unshift(historyEntry);          // newest first
  // Keep at most 50 attempts to avoid bloating localStorage
  if (history.length > 50) history.length = 50;
  localStorage.setItem('quizHistory', JSON.stringify(history));
}

// ============================================================================
// HISTORY FEATURE
// ============================================================================
function showHistoryScreen() {
  showScreen('history');
  renderHistoryList();
  renderAnalytics();
  // Wire history tabs (only once)
  if (!document.getElementById('history-screen').dataset.tabsWired) {
    document.getElementById('history-screen').dataset.tabsWired = '1';
    document.querySelectorAll('[data-htab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-htab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.htab;
        document.getElementById('history-attempts-tab').classList.toggle('hidden', tab !== 'attempts');
        document.getElementById('history-analytics-tab').classList.toggle('hidden', tab !== 'analytics');
        if (tab === 'analytics') renderAnalytics();
      });
    });
  }
}

function renderHistoryList() {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const container = document.getElementById('history-list');
  container.innerHTML = '';

  if (history.length === 0) {
    container.innerHTML = '<div class="empty-state">No quiz attempts yet — complete a quiz to see your history here!</div>';
    return;
  }

  history.forEach(attempt => {
    const date = new Date(attempt.date);
    const dateStr = date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const pct = attempt.percentage;
    const scoreClass = pct >= 80 ? 'good' : pct >= 60 ? 'needs-work' : 'poor';
    const langEmoji = (attempt.language === 'java') ? '☕' : '🐍';
    const modeLabel = attempt.mode === 'quiz' ? 'Student Quiz' : 'Practice';
    let timeTxt = '';
    if (attempt.timeElapsed) {
      const m = Math.floor(attempt.timeElapsed / 60);
      const s = attempt.timeElapsed % 60;
      timeTxt = `⏱ ${m}:${s.toString().padStart(2,'0')}`;
    }

    const card = document.createElement('div');
    card.className = 'history-card card';
    card.innerHTML = `
      <div class="history-card__body">
        <div class="history-card__left">
          <div class="history-card__title">${langEmoji} ${modeLabel}</div>
          <div class="history-card__meta">${dateStr} · ${timeStr} ${timeTxt ? '· ' + timeTxt : ''}</div>
        </div>
        <div class="history-card__right">
          <div class="history-score ${scoreClass}">${pct}%</div>
          <div class="history-fraction">${attempt.correct}/${attempt.questionCount ?? (Array.isArray(attempt.questions) ? attempt.questions.length : attempt.questions)}</div>
        </div>
      </div>
      <div class="history-card__actions">
        <button class="btn btn--primary btn--sm" onclick="reviewHistoryAttempt(${attempt.id})">Review Answers</button>
        <button class="btn btn--outline btn--sm history-delete-btn" onclick="deleteHistoryAttempt(${attempt.id})">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function reviewHistoryAttempt(id) {
  const history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  const attempt = history.find(a => a.id === id);
  if (!attempt) return;

  // Render a read-only review modal overlay
  const overlay = document.getElementById('history-review-overlay');
  const titleEl = document.getElementById('history-review-title');
  const container = document.getElementById('history-review-container');

  const date = new Date(attempt.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  const langEmoji = attempt.language === 'java' ? '☕' : '🐍';
  titleEl.textContent = `${langEmoji} Attempt — ${date} · ${attempt.percentage}% (${attempt.correct}/${attempt.questionCount ?? attempt.questions.length})`;

  container.innerHTML = '';
  attempt.questions.forEach((question, index) => {
    const userAnswer = attempt.userAnswers[question.id] || [];
    const isCorrect = arraysEqual([...userAnswer].sort(), [...question.correct].sort());

    const reviewDiv = document.createElement('div');
    reviewDiv.className = `review-question ${isCorrect ? 'correct' : 'incorrect'}`;
    reviewDiv.dataset.status = isCorrect ? 'correct' : 'incorrect';
    reviewDiv.innerHTML = `
      <div class="review-header">
        <div>
          <h4>Question ${index + 1}</h4>
          <div class="question-badges">
            <span class="category-badge">${question.category}</span>
            <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
            <span class="week-badge">Week ${question.week.replace('week', '')}</span>
          </div>
        </div>
        <span class="review-status ${isCorrect ? 'correct' : 'incorrect'}">${isCorrect ? 'Correct' : 'Incorrect'}</span>
      </div>
      <div class="question-text">${formatQuestionText(question.question)}</div>
      <div class="review-answers">
        ${question.options.map((option, optIdx) => {
          const letter = String.fromCharCode(65 + optIdx);
          const isUserSelected = userAnswer.includes(letter);
          const isCorrectAnswer = question.correct.includes(letter);
          let indicator = '';
          if (isCorrectAnswer && isUserSelected) indicator = '✓ ';
          else if (isCorrectAnswer) indicator = '✓ ';
          else if (isUserSelected) indicator = '✗ ';
          const classes = [];
          if (isUserSelected) classes.push('user-selected');
          if (isCorrectAnswer) classes.push('correct-answer');
          return `<div class="review-answer ${classes.join(' ')}">
            <span class="answer-indicator">${indicator}</span>
            <span>${option}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="explanation"><strong>Explanation:</strong> ${question.explanation}</div>
    `;
    container.appendChild(reviewDiv);
  });

  overlay.classList.remove('hidden');
  overlay.scrollTop = 0;
}

function closeHistoryReview() {
  document.getElementById('history-review-overlay').classList.add('hidden');
}

function deleteHistoryAttempt(id) {
  if (!confirm('Delete this attempt from your history?')) return;
  let history = JSON.parse(localStorage.getItem('quizHistory') || '[]');
  history = history.filter(a => a.id !== id);
  localStorage.setItem('quizHistory', JSON.stringify(history));
  renderHistoryList();
}

function filterHistoryReview(filter, btn) {
  document.querySelectorAll('#history-review-panel .filter-btn, .history-review-panel .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('#history-review-container .review-question').forEach(q => {
    if (filter === 'all' || q.dataset.status === filter) {
      q.style.display = 'block';
    } else {
      q.style.display = 'none';
    }
  });
}

function clearAllHistory() {
  if (!confirm('Clear ALL quiz history? This cannot be undone.')) return;
  localStorage.removeItem('quizHistory');
  renderHistoryList();
}
function practiceWeakAreas() {
  const weakWeeks = [];
  const weekScores = document.querySelectorAll('#week-scores .score-item');
  
  weekScores.forEach(item => {
    if (item.classList.contains('needs-work') || item.classList.contains('poor')) {
      const weekText = item.querySelector('span').textContent;
      const weekNum = weekText.match(/Week (\d+)/)?.[1];
      if (weekNum && !weakWeeks.includes(`week${weekNum}`)) {
        weakWeeks.push(`week${weekNum}`);
      }
    }
  });
  
  if (weakWeeks.length > 0) {
    showScreen('practiceSetup');
    
    // Pre-select weak weeks
    document.querySelectorAll('#week-filters input').forEach(input => {
      input.checked = weakWeeks.includes(input.value);
      input.closest('.week-filter').classList.toggle('selected', input.checked);
    });
    
    updatePracticePreview();
  } else {
    alert('No weak areas identified. Great job!');
  }
}
// ============================================================================
// ANSWER REVIEW - MCQ ONLY
// ============================================================================
function showAnswerReview() {
  document.getElementById('answer-review').classList.remove('hidden');
  generateAnswerReview();
  document.getElementById('review-answers-btn').scrollIntoView({ behavior: 'smooth' });
}

function generateAnswerReview() {
  const container = document.getElementById('review-container');
  container.innerHTML = '';
  
  currentQuestions.forEach((question, index) => {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'review-question';
    
    const userAnswer = userAnswers[question.id] || [];
    const isCorrect = arraysEqual(userAnswer.sort(), question.correct.sort());
    
    reviewDiv.classList.add(isCorrect ? 'correct' : 'incorrect');
    reviewDiv.dataset.status = isCorrect ? 'correct' : 'incorrect';
    
    reviewDiv.innerHTML = `
      <div class="review-header">
        <div>
          <h4>Question ${index + 1}</h4>
          <div class="question-badges">
            <span class="category-badge">${question.category}</span>
            <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
            <span class="week-badge">Week ${question.week.replace('week', '')}</span>
          </div>
        </div>
        <span class="review-status ${isCorrect ? 'correct' : 'incorrect'}">
          ${isCorrect ? 'Correct' : 'Incorrect'}
        </span>
      </div>
      <div class="question-text">${formatQuestionText(question.question)}</div>
      <div class="review-answers">
        ${question.options.map((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          const isUserSelected = userAnswer.includes(optionLetter);
          const isCorrectAnswer = question.correct.includes(optionLetter);
          
          let indicator = '';
          if (isCorrectAnswer && isUserSelected) indicator = '✓ ';
          else if (isCorrectAnswer) indicator = '✓ ';
          else if (isUserSelected) indicator = '✗ ';
          
          const classes = [];
          if (isUserSelected) classes.push('user-selected');
          if (isCorrectAnswer) classes.push('correct-answer');
          
          return `
            <div class="review-answer ${classes.join(' ')}">
              <span class="answer-indicator">${indicator}</span>
              <span>${option}</span>
            </div>
          `;
        }).join('')}
      </div>
      <div class="explanation">
        <strong>Explanation:</strong> ${question.explanation}
      </div>
    `;
    
    container.appendChild(reviewDiv);
  });
}

function filterReview(filter) {
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
  
  const questions = document.querySelectorAll('.review-question');
  questions.forEach(q => {
    if (filter === 'all' || q.dataset.status === filter) {
      q.style.display = 'block';
    } else {
      q.style.display = 'none';
    }
  });
}

function practiceWeakAreas() {
  // Find weeks with < 70% performance
  const weakWeeks = [];
  const weekScores = document.querySelectorAll('#week-scores .score-item');
  
  weekScores.forEach(item => {
    if (item.classList.contains('needs-work') || item.classList.contains('poor')) {
      const weekText = item.querySelector('span').textContent;
      const weekNum = weekText.match(/Week (\d+)/)?.[1];
      if (weekNum && !weakWeeks.includes(`week${weekNum}`)) {
        weakWeeks.push(`week${weekNum}`);
      }
    }
  });
  
  if (weakWeeks.length > 0) {
    // Set up practice mode with weak areas
    showScreen('practiceSetup');
    
    // Pre-select weak weeks
    document.querySelectorAll('#week-filters input').forEach(input => {
      input.checked = weakWeeks.includes(input.value);
      input.closest('.week-filter').classList.toggle('selected', input.checked);
    });
    
    updatePracticePreview();
  } else {
    alert('No weak areas identified. Great job!');
  }
}

// ============================================================================
// PRACTICE MODE - MCQ ONLY
// ============================================================================
function renderWeekFilters() {
  const container = document.getElementById('week-filters');
  if (!container) return;
  
  container.innerHTML = '';
  
  const weekIds = Object.keys(getActiveBank().weeks).sort();

  // Update label to reflect actual week range
  const label = document.getElementById('weeks-filter-label');
  if (label && weekIds.length > 0) {
    const nums = weekIds.map(w => parseInt(w.replace('week', ''))).sort((a,b) => a-b);
    label.textContent = nums.length > 1
      ? `Select Weeks (${nums[0]}–${nums[nums.length-1]})`
      : `Select Week`;
  }
  
  weekIds.forEach(weekId => {
    // Extract week number from "week12" format
    const weekNum = weekId.replace('week', '');
    
    const weekDiv = document.createElement('div');
    weekDiv.className = 'week-filter';
    weekDiv.innerHTML = `
      <input type="checkbox" id="${weekId}" value="${weekId}">
      <label for="${weekId}">Week ${weekNum}</label>
    `;
    
    weekDiv.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = weekDiv.querySelector('input');
        checkbox.checked = !checkbox.checked;
      }
      weekDiv.classList.toggle('selected', weekDiv.querySelector('input').checked);
      updatePracticePreview();
    });
    
    container.appendChild(weekDiv);
  });
}

function renderCategoryFilters() {
  const container = document.getElementById('category-filters');
  container.innerHTML = '';
  
  const categories = [
    { id: "outputPrediction", name: "Output Prediction" },
    { id: "syntaxError", name: "Syntax Error" },
    { id: "theory", name: "Theory & Concepts" },
    { id: "codeLogic", name: "Code Logic & Analysis" }
  ];
  
  categories.forEach(category => {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-checkbox';
    filterDiv.innerHTML = `
      <input type="checkbox" id="cat-${category.id}" value="${category.id}">
      <label for="cat-${category.id}">${category.name}</label>
    `;
    
    filterDiv.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = filterDiv.querySelector('input');
        checkbox.checked = !checkbox.checked;
      }
      filterDiv.classList.toggle('selected', filterDiv.querySelector('input').checked);
      updatePracticePreview(); // FIXED: Was calling non-existent function
    });
    
    container.appendChild(filterDiv);
  });
}

function renderDifficultyFilters() {
  const container = document.getElementById('difficulty-filters');
  container.innerHTML = '';
  
  const difficulties = [
    { id: "basic",        name: "Basic" },
    { id: "intermediate", name: "Intermediate" },
    { id: "advanced",     name: "Advanced" }
  ];
  
  difficulties.forEach(difficulty => {
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-checkbox';
    filterDiv.innerHTML = `
      <input type="checkbox" id="diff-${difficulty.id}" value="${difficulty.id}">
      <label for="diff-${difficulty.id}">${difficulty.name}</label>
    `;
    
    filterDiv.addEventListener('click', (e) => {
      if (e.target.type !== 'checkbox') {
        const checkbox = filterDiv.querySelector('input');
        checkbox.checked = !checkbox.checked;
      }
      filterDiv.classList.toggle('selected', filterDiv.querySelector('input').checked);
      updatePracticePreview(); // FIXED: Was calling non-existent function
    });
    
    container.appendChild(filterDiv);
  });
}

function updatePracticePreview() {
  const selectedWeeks = getSelectedFilters('week-filters');
  const selectedCategories = getSelectedFilters('category-filters');
  const selectedDifficulties = getSelectedFilters('difficulty-filters');
  
  let availableQuestions = 0;
  
  if (selectedWeeks.length === 0) {
    document.getElementById('preview-text').textContent = 'Select at least one week';
    return;
  }
  
  selectedWeeks.forEach(weekId => {
    if (getActiveBank().weeks[weekId]) {
      // If no categories selected, check all categories except 'coding'
      const categoriesToCheck = selectedCategories.length > 0 ? selectedCategories : 
        Object.keys(getActiveBank().weeks[weekId]).filter(cat => cat !== 'coding');
      
      categoriesToCheck.forEach(category => {
        if (getActiveBank().weeks[weekId][category]) {
          getActiveBank().weeks[weekId][category].forEach(question => {
            if (selectedDifficulties.length === 0 || selectedDifficulties.includes(question.difficulty)) {
              availableQuestions++;
            }
          });
        }
      });
    }
  });
  
  document.getElementById('preview-text').textContent = `${availableQuestions} questions available`;
}

function updateFilterStyles() {
  document.querySelectorAll('.filter-checkbox').forEach(filterDiv => {
    const checkbox = filterDiv.querySelector('input');
    filterDiv.classList.toggle('selected', checkbox.checked);
  });
}

function getSelectedFilters(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================================================
// ADMIN MODE - MCQ ONLY
// ============================================================================
function switchTab(tabName) {
  if (!tabName) return;
  document.querySelectorAll('#admin-screen .tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('#admin-screen .tab-content').forEach(content => content.classList.remove('active'));
  
  const btn = document.querySelector(`#admin-screen [data-tab="${tabName}"]`);
  const tab = document.getElementById(`${tabName}-tab`);
  if (btn) btn.classList.add('active');
  if (tab) tab.classList.add('active');
}

function renderAdminQuestions() {
  const container = document.getElementById('questions-list');
  container.innerHTML = '';
  
  const allQuestions = [];
  Object.keys(getActiveBank().weeks).forEach(weekId => {
    Object.keys(getActiveBank().weeks[weekId]).forEach(category => {
      if (category === 'coding') return; // Skip coding category
      getActiveBank().weeks[weekId][category].forEach(question => {
        allQuestions.push({ ...question, category, week: weekId });
      });
    });
  });
  
  allQuestions.forEach(question => {
    const questionDiv = document.createElement('div');
    questionDiv.className = 'question-item';
    
    const preview = question.question.replace(/```python\n[\s\S]*?\n```/g, '[Code Block]').substring(0, 100) + '...';
    
    questionDiv.innerHTML = `
      <div class="question-info">
        <div class="question-meta-admin">
          <span class="category-badge">${question.category}</span>
          <span class="difficulty-badge ${question.difficulty}">${question.difficulty}</span>
          <span class="week-badge">${question.week}</span>
        </div>
        <div class="question-preview">${preview}</div>
      </div>
      <div class="question-actions">
        <button class="btn btn--sm btn--outline" onclick="editQuestion(${question.id}, '${question.week}', '${question.category}')">Edit</button>
        <button class="btn btn--sm btn--outline" onclick="deleteQuestion(${question.id}, '${question.week}', '${question.category}')">Delete</button>
      </div>
    `;
    
    container.appendChild(questionDiv);
  });
}

// Removed: renderAdminCodingChallenges(), editCodingChallenge(), deleteCodingChallenge() functions

function filterQuestions(searchTerm) {
  const items = document.querySelectorAll('.question-item');
  items.forEach(item => {
    const preview = item.querySelector('.question-preview').textContent.toLowerCase();
    if (preview.includes(searchTerm.toLowerCase())) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function showQuestionModal(questionId = null) {
  const modal = document.getElementById('question-modal');
  const title = document.getElementById('modal-title');
  
  // MCQ form only - hide coding fields permanently
  document.getElementById('coding-fields').style.display = 'none';
  document.getElementById('test-cases-fields').style.display = 'none';
  document.getElementById('options-field').style.display = 'block';
  title.textContent = questionId ? 'Edit Question' : 'Add Question';
  
  modal.classList.remove('hidden');
}

function editQuestion(questionId, week, category) {
  if (getActiveBank().weeks[week] && getActiveBank().weeks[week][category]) {
    const question = getActiveBank().weeks[week][category].find(q => q.id == questionId);
    if (question) {
      document.getElementById('question-category').value = week;
      document.getElementById('question-difficulty').value = question.difficulty;
      document.getElementById('question-text-input').value = question.question;
      document.getElementById('question-options').value = question.options.join('\n');
      document.getElementById('question-correct').value = question.correct.join(',');
      document.getElementById('question-explanation').value = question.explanation;
      
      showQuestionModal(questionId);
    }
  }
}

function deleteQuestion(questionId, week, category) {
  if (confirm('Are you sure you want to delete this question?')) {
    if (getActiveBank().weeks[week] && getActiveBank().weeks[week][category]) {
      getActiveBank().weeks[week][category] = getActiveBank().weeks[week][category].filter(q => q.id != questionId);
      saveQuestionBank();
      renderAdminQuestions();
      updateQuestionBankStats();
      showSuccessMessage('Question deleted successfully!');
    }
  }
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.add('hidden');
  clearQuestionForm();
}

function clearQuestionForm() {
  document.getElementById('question-category').value = 'week1';
  document.getElementById('question-difficulty').value = 'basic';
  document.getElementById('question-text-input').value = '';
  document.getElementById('question-options').value = '';
  document.getElementById('question-correct').value = '';
  document.getElementById('question-explanation').value = '';
}

function saveQuestion() {
  const category = document.getElementById('question-category').value;
  const difficulty = document.getElementById('question-difficulty').value;
  const questionText = document.getElementById('question-text-input').value.trim();
  const explanation = document.getElementById('question-explanation').value.trim();
  
  if (!questionText || !explanation) {
    alert('Please fill required fields');
    return;
  }
  
  const optionsText = document.getElementById('question-options').value.trim();
  const correctAnswers = document.getElementById('question-correct').value.trim();
  
  if (!optionsText || !correctAnswers) {
    alert('Please provide options and correct answers');
    return;
  }
  
  const options = optionsText.split('\n').filter(opt => opt.trim());
  if (options.length < 2) {
    alert('Please provide at least 2 options');
    return;
  }
  
  const correct = correctAnswers.split(',').map(c => c.trim().toUpperCase());
  
  // Validate correct answers are valid letters
  const validLetters = options.map((_, i) => String.fromCharCode(65 + i));
  const invalid = correct.filter(c => !validLetters.includes(c));
  if (invalid.length > 0) {
    alert(`Invalid correct answers: ${invalid.join(', ')}`);
    return;
  }
  
  // Find max id in that week
  let maxId = 0;
  Object.values(getActiveBank().weeks).forEach(week => {
    Object.values(week).forEach(cat => {
      if (Array.isArray(cat)) {
        cat.forEach(q => {
          if (q.id > maxId) maxId = q.id;
        });
      }
    });
  });
  
  const newQuestion = {
    id: maxId + 1,
    difficulty,
    question: questionText,
    options,
    correct,
    explanation
  };
  
  if (!getActiveBank().weeks[category]) {
    getActiveBank().weeks[category] = { outputPrediction: [], syntaxError: [], theory: [], codeLogic: [] };
  }
  
  // Add to appropriate category
  const categoryMap = {
    'outputPrediction': 'outputPrediction',
    'syntaxError': 'syntaxError',
    'theory': 'theory',
    'codeLogic': 'codeLogic'
  };
  
  const targetCategory = categoryMap[category] || 'outputPrediction';
  getActiveBank().weeks[category][targetCategory].push(newQuestion);
  saveQuestionBank();
  renderAdminQuestions();
  
  updateQuestionBankStats();
  closeQuestionModal();
  showSuccessMessage('Question saved successfully!');
}

// ============================================================================
// ANALYTICS - MCQ ONLY
// ============================================================================
function renderAnalytics() {
  renderWeekPerformance();
  renderCategoryPerformance();
  renderMissedQuestions();
  // Removed: renderCodingPerformance()
  renderQuizAttempts();
}

function renderWeekPerformance() {
  const container = document.getElementById('week-performance');
  container.innerHTML = '';
  
  Object.keys(getActiveBank().weeks).forEach(weekId => {
    let totalAttempts = 0;
    let correctAttempts = 0;
    
    Object.values(getActiveBank().weeks[weekId]).forEach(category => {
      if (Array.isArray(category)) {
        category.forEach(question => {
          const stats = analyticsData.questionStats[question.id];
          if (stats) {
            totalAttempts += stats.attempts;
            correctAttempts += stats.correct;
          }
        });
      }
    });
    
    const percentage = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    const weekNum = weekId.replace('week', '');
    
    const item = document.createElement('div');
    item.className = 'performance-item';
    item.innerHTML = `
      <span>Week ${weekNum}</span>
      <span class="performance-score">${percentage}% (${correctAttempts}/${totalAttempts})</span>
    `;
    
    container.appendChild(item);
  });
}

function renderCategoryPerformance() {
  const container = document.getElementById('category-performance');
  container.innerHTML = '';
  
  const categories = ['outputPrediction', 'syntaxError', 'theory', 'codeLogic'];
  
  categories.forEach(categoryId => {
    let totalAttempts = 0;
    let correctAttempts = 0;
    
    Object.values(getActiveBank().weeks).forEach(week => {
      if (week[categoryId]) {
        week[categoryId].forEach(question => {
          const stats = analyticsData.questionStats[question.id];
          if (stats) {
            totalAttempts += stats.attempts;
            correctAttempts += stats.correct;
          }
        });
      }
    });
    
    const percentage = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;
    const categoryName = categoryId.replace(/([A-Z])/g, ' $1').trim();
    
    const item = document.createElement('div');
    item.className = 'performance-item';
    item.innerHTML = `
      <span>${categoryName}</span>
      <span class="performance-score">${percentage}% (${correctAttempts}/${totalAttempts})</span>
    `;
    
    container.appendChild(item);
  });
}

function renderMissedQuestions() {
  const container = document.getElementById('missed-questions');
  container.innerHTML = '';
  
  const missedQuestions = [];
  
  Object.keys(analyticsData.questionStats).forEach(questionId => {
    const stats = analyticsData.questionStats[questionId];
    if (stats.attempts > 0) {
      const missRate = ((stats.attempts - stats.correct) / stats.attempts) * 100;
      if (missRate > 50) {
        // Find question
        let questionText = 'Unknown Question';
        Object.values(getActiveBank().weeks).forEach(week => {
          Object.values(week).forEach(cat => {
            if (Array.isArray(cat)) {
              const q = cat.find(q => q.id == questionId);
              if (q) {
                questionText = q.question.substring(0, 50) + '...';
              }
            }
          });
        });
        
        missedQuestions.push({
          id: questionId,
          text: questionText,
          missRate
        });
      }
    }
  });
  
  missedQuestions.sort((a, b) => b.missRate - a.missRate);
  
  if (missedQuestions.length === 0) {
    container.innerHTML = '<div class="empty-state">No frequently missed questions yet</div>';
    return;
  }
  
  missedQuestions.slice(0, 5).forEach(question => {
    const item = document.createElement('div');
    item.className = 'missed-item';
    item.innerHTML = `
      <span>${question.text}</span>
      <span>${Math.round(question.missRate)}% miss rate</span>
    `;
    container.appendChild(item);
  });
}

// Removed: renderCodingPerformance() function completely

function renderQuizAttempts() {
  const container = document.getElementById('quiz-attempts');
  container.innerHTML = '';
  
  if (analyticsData.attempts.length === 0) {
    container.innerHTML = '<div class="empty-state">No quiz attempts yet</div>';
    return;
  }
  
  analyticsData.attempts.slice(-5).reverse().forEach(attempt => {
    const date = new Date(attempt.date).toLocaleDateString();
    
    const item = document.createElement('div');
    item.className = 'attempt-item';
    item.innerHTML = `
      <span>${attempt.mode} - ${date}</span>
      <span>${attempt.percentage}% (${attempt.correct}/${attempt.questions})</span>
    `;
    container.appendChild(item);
  });
}

// ============================================================================
// SETTINGS - MCQ ONLY
// ============================================================================
function saveSettings() {
  quizSettings.duration = parseInt(document.getElementById('quiz-duration').value);
  quizSettings.questionsPerQuiz = parseInt(document.getElementById('questions-per-quiz').value);
  localStorage.setItem('quizSettings', JSON.stringify(quizSettings));
  showSuccessMessage('Settings saved successfully!');
}

function exportQuestions() {
  const dataStr = JSON.stringify({ weeks: getActiveBank().weeks }, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = 'question-bank.json';
  link.click();
  
  URL.revokeObjectURL(url);
}

function clearAnalytics() {
  if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
    analyticsData = {
      attempts: [],
      questionStats: {},
      categoryPerformance: {},
      weekPerformance: {},
      bestScore: 0
    };
    localStorage.setItem('quizAnalytics', JSON.stringify(analyticsData));
    document.getElementById('completion-rate').textContent = '0%';
    renderAnalytics();
    showSuccessMessage('Analytics data cleared successfully!');
  }
}

function importQuestions(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const imported = JSON.parse(event.target.result);
      
      if (imported.weeks) {
        Object.assign(getActiveBank().weeks, imported.weeks);
        saveQuestionBank();
      }
      
      // Removed: coding challenges import
      
      alert('Questions imported successfully! Page will reload.');
      location.reload();
    } catch(e) {
      alert('Error importing JSON: ' + e.message);
    }
  };
  reader.readAsText(file);
}

// ============================================================================
// UTILITY FUNCTIONS - MCQ ONLY
// ============================================================================
function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, i) => val === b[i]);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getActiveBank() {
  if (currentLanguage === 'java') return javaQuestionBank;
  if (currentLanguage === 'c') return cQuestionBank;
  return questionBank;
}

function selectQuizQuestions(filters = {}) {
  const allQuestions = [];
  const bank = getActiveBank();
  const weeks = filters.weeks || Object.keys(bank.weeks);
  
  weeks.forEach(weekId => {
    if (!bank.weeks[weekId]) return;
    
    const categories = filters.categories || 
      Object.keys(bank.weeks[weekId]).filter(cat => cat !== 'coding');
    
    categories.forEach(category => {
      if (bank.weeks[weekId][category]) {
        bank.weeks[weekId][category].forEach(question => {
          if (!filters.difficulties || filters.difficulties.includes(question.difficulty)) {
            allQuestions.push({ ...question, category, week: weekId });
          }
        });
      }
    });
  });
  
  const shuffled = shuffleArray(allQuestions);
  const count = filters.count === 'all' ? shuffled.length : Math.min(filters.count || 30, shuffled.length);
  return shuffled.slice(0, count);
}

function updateQuestionBankStats() {
  let totalQuestions = 0;
  let totalWeeks = 0;
  const bank = getActiveBank();
  
  Object.keys(bank.weeks).forEach(week => {
    let hasQuestions = false;
    Object.values(bank.weeks[week]).forEach(category => {
      if (Array.isArray(category) && category.length > 0) {
        totalQuestions += category.length;
        hasQuestions = true;
      }
    });
    if (hasQuestions) totalWeeks++;
  });
  
  document.getElementById('total-questions').textContent = totalQuestions;
  const weeksElement = document.getElementById('total-weeks');
  if (weeksElement) weeksElement.textContent = totalWeeks;
}

function updateAnalytics() {
  document.getElementById('completion-rate').textContent = `${analyticsData.bestScore}%`;
}

function showSuccessMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'success-message';
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 3000);
}

function showErrorMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'error-message';
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  setTimeout(() => messageDiv.remove(), 3000);
}

function saveQuestionBank() {
  localStorage.setItem('questionBank', JSON.stringify(questionBank));
}

// ============================================================================
// SCREEN MANAGEMENT - MCQ ONLY
// ============================================================================
function showScreen(screenName) {
  const screens = {
    modeSelection: document.getElementById('mode-selection-screen'),
    practiceSetup: document.getElementById('practice-setup-screen'),
    admin: document.getElementById('admin-screen'),
    quiz: document.getElementById('quiz-screen'),
    results: document.getElementById('results-screen'),
    history: document.getElementById('history-screen')
  };
  
  Object.values(screens).forEach(screen => screen.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
  currentMode = screenName;

  // Sidebar only visible on "home" screens
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar) {
    const homeScreens = ['modeSelection', 'admin', 'history'];
    sidebar.classList.toggle('hidden', !homeScreens.includes(screenName));
  }
}