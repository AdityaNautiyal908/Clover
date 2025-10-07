import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// DOM Elements
const authSection = document.getElementById('authSection');
const studentDashboard = document.getElementById('studentDashboard');
const signOutBtn = document.getElementById('signOutBtn');
const studentName = document.getElementById('studentName');
const questionsList = document.getElementById('questionsList');
const totalQuestions = document.getElementById('totalQuestions');
const completedQuestions = document.getElementById('completedQuestions');
const pendingQuestions = document.getElementById('pendingQuestions');
const filterSubject = document.getElementById('filterSubject');
const filterDifficulty = document.getElementById('filterDifficulty');
const filterType = document.getElementById('filterType');
const filterStatus = document.getElementById('filterStatus');
const listViewBtn = document.getElementById('listViewBtn');
const cardViewBtn = document.getElementById('cardViewBtn');

// Modal elements
const questionModal = document.getElementById('questionModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const modalQuestionTitle = document.getElementById('modalQuestionTitle');
const modalQuestionType = document.getElementById('modalQuestionType');
const modalQuestionDifficulty = document.getElementById('modalQuestionDifficulty');
const modalQuestionSubject = document.getElementById('modalQuestionSubject');
const modalQuestionText = document.getElementById('modalQuestionText');
const answerForm = document.getElementById('answerForm');
const answerSection = document.getElementById('answerSection');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const skipQuestionBtn = document.getElementById('skipQuestionBtn');

// Global variables
let currentUser = null;
let questions = [];
let filteredQuestions = [];
let currentQuestion = null;
let studentAnswers = [];
let currentView = 'list';

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Student page loaded');
});

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    currentUser = user;
    
    // Check if user is a student
    await checkUserRole(user);
  } else {
    console.log('User is signed out');
    showAuthSection();
  }
});

// Check user role and redirect if not a student
async function checkUserRole(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === 'student') {
        showStudentDashboard(userData);
        loadQuestions();
        loadStudentAnswers();
      } else {
        // Redirect to teacher page if not a student
        window.location.href = './teacher.html';
      }
    } else {
      // User document doesn't exist, redirect to login
      window.location.href = './login.html';
    }
  } catch (error) {
    console.error('Error checking user role:', error);
    window.location.href = './login.html';
  }
}

// Show authentication section
function showAuthSection() {
  authSection.style.display = 'block';
  studentDashboard.style.display = 'none';
  signOutBtn.style.display = 'none';
}

// Show student dashboard
function showStudentDashboard(userData) {
  authSection.style.display = 'none';
  studentDashboard.style.display = 'block';
  signOutBtn.style.display = 'block';
  
  // Update student name
  studentName.textContent = userData.firstName || userData.email;
}

// Handle sign out
signOutBtn.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log('User signed out');
  } catch (error) {
    console.error('Sign out error:', error);
  }
});

// Load questions from Firestore
function loadQuestions() {
  if (!currentUser) return;
  
  const q = query(
    collection(db, 'questions'),
    where('isActive', '==', true),
    orderBy('createdAt', 'desc')
  );
  
  onSnapshot(q, (snapshot) => {
    questions = [];
    snapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    
    // Randomize questions for this student to prevent cheating
    questions = randomizeQuestionsForStudent(questions, currentUser.uid);
    
    filteredQuestions = [...questions];
    displayQuestions();
    updateStats();
    updateFilters();
  });
}

// Randomize questions for a specific student
function randomizeQuestionsForStudent(questions, studentId) {
  // Create a seeded random number generator based on student ID
  const seed = hashString(studentId);
  const rng = createSeededRNG(seed);
  
  // Create a copy of questions array
  const shuffledQuestions = [...questions];
  
  // Shuffle using Fisher-Yates algorithm with seeded random
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffledQuestions[i], shuffledQuestions[j]] = [shuffledQuestions[j], shuffledQuestions[i]];
  }
  
  return shuffledQuestions;
}

// Hash a string to create a seed
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Create a seeded random number generator
function createSeededRNG(seed) {
  let state = seed;
  return function() {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
}

// Load student answers
function loadStudentAnswers() {
  if (!currentUser) return;
  
  const q = query(
    collection(db, 'studentAnswers'),
    where('studentId', '==', currentUser.uid)
  );
  
  onSnapshot(q, (snapshot) => {
    studentAnswers = [];
    snapshot.forEach((doc) => {
      studentAnswers.push({ id: doc.id, ...doc.data() });
    });
    
    displayQuestions(); // Refresh display to show completed status
    updateStats();
  });
}

// Display questions
function displayQuestions() {
  if (filteredQuestions.length === 0) {
    questionsList.innerHTML = '<div class="no-questions">No questions available. Check back later!</div>';
      return;
    }
    
  const viewClass = currentView === 'list' ? 'list-view' : 'card-view';
  questionsList.className = `questions-list ${viewClass}`;
  
  questionsList.innerHTML = filteredQuestions.map(question => {
    const isCompleted = studentAnswers.some(answer => answer.questionId === question.id);
    const completedClass = isCompleted ? 'completed' : 'pending';
    
    return `
      <div class="question-item ${completedClass}" data-id="${question.id}">
          <div class="question-header">
          <div class="question-meta">
            <span class="question-type">${formatQuestionType(question.type)}</span>
            <span class="question-difficulty difficulty-${question.difficulty}">${question.difficulty}</span>
            <span class="question-subject">${question.subject}</span>
            <span class="question-status ${completedClass}">${isCompleted ? 'Completed' : 'Pending'}</span>
          </div>
          <button class="btn btn-primary btn-small answer-question" data-id="${question.id}">
            ${isCompleted ? 'Review' : 'Answer'}
          </button>
        </div>
        <div class="question-content">
          <p class="question-text">${question.text}</p>
          ${question.explanation ? `<p class="question-explanation"><strong>Explanation:</strong> ${question.explanation}</p>` : ''}
          </div>
        </div>
      `;
  }).join('');
  
  // Add event listeners for answer buttons
  document.querySelectorAll('.answer-question').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const questionId = e.target.dataset.id;
      openQuestionModal(questionId);
    });
  });
}

// Open question modal
function openQuestionModal(questionId) {
  currentQuestion = questions.find(q => q.id === questionId);
  if (!currentQuestion) return;
  
  // Update modal content
  modalQuestionTitle.textContent = `Question - ${currentQuestion.subject}`;
  modalQuestionType.textContent = formatQuestionType(currentQuestion.type);
  modalQuestionDifficulty.textContent = currentQuestion.difficulty;
  modalQuestionDifficulty.className = `question-difficulty difficulty-${currentQuestion.difficulty}`;
  modalQuestionSubject.textContent = currentQuestion.subject;
  modalQuestionText.textContent = currentQuestion.text;
  
  // Generate answer section based on question type
  generateAnswerSection(currentQuestion);
  
  // Show modal
  questionModal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

// Generate answer section based on question type
function generateAnswerSection(question) {
  const existingAnswer = studentAnswers.find(answer => answer.questionId === question.id);
  
  answerSection.innerHTML = '';
  
  switch (question.type) {
    case 'multiple-choice':
      generateMultipleChoiceOptions(question, existingAnswer);
      break;
    case 'true-false':
      generateTrueFalseOptions(question, existingAnswer);
      break;
    case 'short-answer':
    case 'essay':
      generateTextAnswerOptions(question, existingAnswer);
      break;
  }
}

// Generate multiple choice options
function generateMultipleChoiceOptions(question, existingAnswer) {
  const options = ['A', 'B', 'C', 'D'];
  const optionsHtml = options.map(option => {
    const isChecked = existingAnswer && existingAnswer.answer === option ? 'checked' : '';
    return `
      <div class="option-group">
        <input type="radio" id="option${option}" name="answer" value="${option}" ${isChecked}>
        <label for="option${option}" class="option-label">
          <span class="option-letter">${option}</span>
          <span class="option-text">${question.options[option]}</span>
        </label>
      </div>
    `;
  }).join('');
  
  answerSection.innerHTML = `
    <div class="answer-options">
      <label class="answer-label">Select your answer:</label>
      ${optionsHtml}
    </div>
  `;
}

// Generate true/false options
function generateTrueFalseOptions(question, existingAnswer) {
  const isTrueChecked = existingAnswer && existingAnswer.answer === 'true' ? 'checked' : '';
  const isFalseChecked = existingAnswer && existingAnswer.answer === 'false' ? 'checked' : '';
  
  answerSection.innerHTML = `
    <div class="answer-options">
      <label class="answer-label">Select your answer:</label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" name="answer" value="true" ${isTrueChecked}>
          <span>True</span>
        </label>
        <label class="radio-label">
          <input type="radio" name="answer" value="false" ${isFalseChecked}>
          <span>False</span>
        </label>
      </div>
    </div>
  `;
}

// Generate text answer options
function generateTextAnswerOptions(question, existingAnswer) {
  const answerText = existingAnswer ? existingAnswer.answer : '';
  
  answerSection.innerHTML = `
    <div class="answer-options">
      <label class="answer-label" for="textAnswer">Your answer:</label>
      <textarea id="textAnswer" name="answer" placeholder="Enter your answer here..." rows="4">${answerText}</textarea>
    </div>
  `;
}

// Handle answer form submission
answerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    submitAnswerBtn.textContent = 'Submitting...';
    submitAnswerBtn.disabled = true;
    
    const formData = new FormData(answerForm);
    const answer = formData.get('answer');
    
    if (!answer) {
      showMessage('Please provide an answer before submitting.', 'error');
      return;
    }
    
    const existingAnswer = studentAnswers.find(a => a.questionId === currentQuestion.id);
    
    if (existingAnswer) {
      // Update existing answer
      await updateDoc(doc(db, 'studentAnswers', existingAnswer.id), {
        answer: answer,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new answer
      await addDoc(collection(db, 'studentAnswers'), {
        questionId: currentQuestion.id,
        studentId: currentUser.uid,
        studentEmail: currentUser.email,
        answer: answer,
        questionType: currentQuestion.type,
        questionText: currentQuestion.text,
        subject: currentQuestion.subject,
        difficulty: currentQuestion.difficulty,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    showMessage('Answer submitted successfully!', 'success');
    closeModal();
    
  } catch (error) {
    console.error('Error submitting answer:', error);
    showMessage('Error submitting answer. Please try again.', 'error');
  } finally {
    submitAnswerBtn.textContent = 'Submit Answer';
    submitAnswerBtn.disabled = false;
  }
});

// Handle skip question
skipQuestionBtn.addEventListener('click', () => {
  closeModal();
});

// Close modal
function closeModal() {
  questionModal.style.display = 'none';
  document.body.style.overflow = 'auto';
  answerForm.reset();
}

// Close modal event listeners
closeModalBtn.addEventListener('click', closeModal);
questionModal.addEventListener('click', (e) => {
  if (e.target === questionModal) {
    closeModal();
  }
});

// Handle view toggle
listViewBtn.addEventListener('click', () => {
  currentView = 'list';
  listViewBtn.classList.add('active');
  cardViewBtn.classList.remove('active');
  displayQuestions();
});

cardViewBtn.addEventListener('click', () => {
  currentView = 'card';
  cardViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
  displayQuestions();
});

// Update statistics
function updateStats() {
  totalQuestions.textContent = questions.length;
  completedQuestions.textContent = studentAnswers.length;
  pendingQuestions.textContent = questions.length - studentAnswers.length;
}

// Update filter options
function updateFilters() {
  // Update subject filter
  const subjects = [...new Set(questions.map(q => q.subject))].sort();
  filterSubject.innerHTML = '<option value="">All Subjects</option>' + 
    subjects.map(subject => `<option value="${subject}">${subject}</option>`).join('');
  
  // Add event listeners for filters
  filterSubject.addEventListener('change', applyFilters);
  filterDifficulty.addEventListener('change', applyFilters);
  filterType.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
}

// Apply filters
function applyFilters() {
  const subjectFilter = filterSubject.value;
  const difficultyFilter = filterDifficulty.value;
  const typeFilter = filterType.value;
  const statusFilter = filterStatus.value;
  
  filteredQuestions = questions.filter(question => {
    const isCompleted = studentAnswers.some(answer => answer.questionId === question.id);
    
    return (!subjectFilter || question.subject === subjectFilter) &&
           (!difficultyFilter || question.difficulty === difficultyFilter) &&
           (!typeFilter || question.type === typeFilter) &&
           (!statusFilter || 
            (statusFilter === 'completed' && isCompleted) ||
            (statusFilter === 'pending' && !isCompleted));
  });
  
  displayQuestions();
}

// Format question type for display
function formatQuestionType(type) {
  const types = {
    'multiple-choice': 'Multiple Choice',
    'true-false': 'True/False',
    'short-answer': 'Short Answer',
    'essay': 'Essay'
  };
  return types[type] || type;
}

// Show message
function showMessage(message, type) {
  // Create message element
  const messageEl = document.createElement('div');
  messageEl.className = `message message-${type}`;
  messageEl.textContent = message;
  
  // Add to page
  document.body.appendChild(messageEl);
  
  // Remove after 3 seconds
  setTimeout(() => {
    messageEl.remove();
  }, 3000);
}
