// ============================================================================
// APPLICATION STATE & DATA LOADING - MCQ ONLY VERSION
// ============================================================================
let questionBank = {};
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
    
    // Load MCQ question bank only
    const questionResponse = await fetch('questions.json');
    if (!questionResponse.ok) throw new Error('Could not load questions.json');
    questionBank = await questionResponse.json();
    
    showLoadingState(false);
    initializeApp();
  } catch (error) {
    console.error('Failed to load data:', error);
    showErrorMessage('Failed to load quiz data. Please ensure questions.json exists.');
    // Fallback to empty structure
    questionBank = { weeks: {} };
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
  // Mode selection
  document.getElementById('start-student-quiz').addEventListener('click', () => startStudentQuiz());
  document.getElementById('start-practice-mode').addEventListener('click', () => showPracticeSetup());
  // Removed: Quiz 2 button listener
  document.getElementById('start-admin-mode').addEventListener('click', () => showAdminMode());
  
  // Practice setup
  document.getElementById('back-to-mode-selection').addEventListener('click', () => showScreen('modeSelection'));
  document.getElementById('start-practice-quiz').addEventListener('click', () => startPracticeQuiz());
  document.getElementById('practice-question-count').addEventListener('change', updatePracticePreview);
  // Admin mode
  document.getElementById('back-to-home').addEventListener('click', () => showScreen('modeSelection'));
  document.getElementById('add-mcq-btn').addEventListener('click', () => showQuestionModal(null));
  // Removed: Add coding challenge button
  document.getElementById('question-search').addEventListener('input', (e) => filterQuestions(e.target.value));
  
  // Admin tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
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
}

// ============================================================================
// QUIZ MODE & LOGIC - MCQ ONLY
// ============================================================================
function startStudentQuiz() {
  currentQuestions = selectQuizQuestions({ 
    count: quizSettings.questionsPerQuiz,
    weeks: Object.keys(questionBank.weeks)
  });
  timeRemaining = quizSettings.duration * 60;
  document.getElementById('quiz-mode-badge').textContent = 'Student Quiz';
  document.getElementById('quiz-mode-badge').className = 'quiz-mode-badge';
  document.getElementById('timer').style.display = 'block';
  startQuiz();
}
function startPracticeQuiz() {
  const selectedWeeks = getSelectedFilters('week-filters');
  const selectedCategories = getSelectedFilters('category-filters');
  const selectedDifficulties = getSelectedFilters('difficulty-filters');
  const questionCount = document.getElementById('practice-question-count').value;
  
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
  return text.replace(/```python\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>');
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
  
  const attempt = {
    id: Date.now(),
    date: new Date().toISOString(),
    mode: currentMode,
    questions: currentQuestions.length,
    correct: correctAnswers,
    percentage: Math.round((correctAnswers / currentQuestions.length) * 100),
    timeElapsed: quizStartTime && quizEndTime ? Math.floor((quizEndTime - quizStartTime) / 1000) : null
  };
  
  analyticsData.attempts.push(attempt);
  localStorage.setItem('quizAnalytics', JSON.stringify(analyticsData));
  updateAnalytics();
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
  
  // Get all week keys from questionBank and sort them
  const weekIds = Object.keys(questionBank.weeks).sort();
  
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
    { id: "basic", name: "Basic" },
    { id: "intermediate", name: "Intermediate" },
    { id: "advanced", name: "Advanced" }
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
    if (questionBank.weeks[weekId]) {
      // If no categories selected, check all categories except 'coding'
      const categoriesToCheck = selectedCategories.length > 0 ? selectedCategories : 
        Object.keys(questionBank.weeks[weekId]).filter(cat => ['outputPrediction', 'theory'].includes(cat));
      
      categoriesToCheck.forEach(category => {
        if (questionBank.weeks[weekId][category]) {
          questionBank.weeks[weekId][category].forEach(question => {
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
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`${tabName}-tab`).classList.add('active');
  
  if (tabName === 'analytics') {
    renderAnalytics();
  }
}

function renderAdminQuestions() {
  const container = document.getElementById('questions-list');
  container.innerHTML = '';
  
  const allQuestions = [];
  Object.keys(questionBank.weeks).forEach(weekId => {
    Object.keys(questionBank.weeks[weekId]).forEach(category => {
      if (category === 'coding') return; // Skip coding category
      questionBank.weeks[weekId][category].forEach(question => {
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
  if (questionBank.weeks[week] && questionBank.weeks[week][category]) {
    const question = questionBank.weeks[week][category].find(q => q.id == questionId);
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
    if (questionBank.weeks[week] && questionBank.weeks[week][category]) {
      questionBank.weeks[week][category] = questionBank.weeks[week][category].filter(q => q.id != questionId);
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
  Object.values(questionBank.weeks).forEach(week => {
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
  
  if (!questionBank.weeks[category]) {
    questionBank.weeks[category] = { outputPrediction: [], syntaxError: [], theory: [], codeLogic: [] };
  }
  
  // Add to appropriate category
  const categoryMap = {
    'outputPrediction': 'outputPrediction',
    'syntaxError': 'syntaxError',
    'theory': 'theory',
    'codeLogic': 'codeLogic'
  };
  
  const targetCategory = categoryMap[category] || 'outputPrediction';
  questionBank.weeks[category][targetCategory].push(newQuestion);
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
  
  Object.keys(questionBank.weeks).forEach(weekId => {
    let totalAttempts = 0;
    let correctAttempts = 0;
    
    Object.values(questionBank.weeks[weekId]).forEach(category => {
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
    
    Object.values(questionBank.weeks).forEach(week => {
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
        Object.values(questionBank.weeks).forEach(week => {
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
  const dataStr = JSON.stringify({ weeks: questionBank.weeks }, null, 2);
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
        Object.assign(questionBank.weeks, imported.weeks);
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

function selectQuizQuestions(filters = {}) {
  const allQuestions = [];
  const weeks = filters.weeks || Object.keys(questionBank.weeks);
  
  weeks.forEach(weekId => {
    if (!questionBank.weeks[weekId]) return;
    
    const categories = filters.categories || 
      Object.keys(questionBank.weeks[weekId]).filter(cat => cat !== 'coding');
    
    categories.forEach(category => {
      if (questionBank.weeks[weekId][category]) {
        questionBank.weeks[weekId][category].forEach(question => {
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
  
  Object.keys(questionBank.weeks).forEach(week => {
    let hasQuestions = false;
    Object.values(questionBank.weeks[week]).forEach(category => {
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
    results: document.getElementById('results-screen')
  };
  
  Object.values(screens).forEach(screen => screen.classList.add('hidden'));
  screens[screenName].classList.remove('hidden');
  currentMode = screenName;
}