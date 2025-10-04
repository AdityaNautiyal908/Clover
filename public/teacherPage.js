import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc,
  getDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// DOM Elements
const authSection = document.getElementById('authSection');
const teacherDashboard = document.getElementById('teacherDashboard');
const signOutBtn = document.getElementById('signOutBtn');
const teacherName = document.getElementById('teacherName');
const questionForm = document.getElementById('questionForm');
const addQuestionBtn = document.getElementById('addQuestionBtn');
const clearFormBtn = document.getElementById('clearFormBtn');
const questionsList = document.getElementById('questionsList');
const totalQuestions = document.getElementById('totalQuestions');
const easyQuestions = document.getElementById('easyQuestions');
const mediumQuestions = document.getElementById('mediumQuestions');
const hardQuestions = document.getElementById('hardQuestions');
const filterSubject = document.getElementById('filterSubject');
const filterDifficulty = document.getElementById('filterDifficulty');
const filterType = document.getElementById('filterType');

// Tab elements
const writtenTab = document.getElementById('writtenTab');
const pdfTab = document.getElementById('pdfTab');
const writtenForm = document.getElementById('writtenForm');
const pdfForm = document.getElementById('pdfForm');

// PDF upload elements
const pdfUploadForm = document.getElementById('pdfUploadForm');
const uploadPdfBtn = document.getElementById('uploadPdfBtn');
const clearPdfBtn = document.getElementById('clearPdfBtn');
const pdfResults = document.getElementById('pdfResults');
const extractedQuestions = document.getElementById('extractedQuestions');
const saveAllQuestionsBtn = document.getElementById('saveAllQuestionsBtn');
const editQuestionsBtn = document.getElementById('editQuestionsBtn');

// Question type elements
const questionType = document.getElementById('questionType');
const multipleChoiceOptions = document.getElementById('multipleChoiceOptions');
const trueFalseOptions = document.getElementById('trueFalseOptions');
const textAnswerOptions = document.getElementById('textAnswerOptions');

// Global variables
let currentUser = null;
let questions = [];
let filteredQuestions = [];
let extractedQuestionsData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  console.log('Teacher page loaded');
});

// Monitor authentication state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    currentUser = user;
    
    // Check if user is a teacher
    await checkUserRole(user);
  } else {
    console.log('User is signed out');
    showAuthSection();
  }
});

// Check user role and redirect if not a teacher
async function checkUserRole(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === 'teacher') {
        showTeacherDashboard(userData);
        loadQuestions();
      } else {
        // Redirect to student page if not a teacher
        window.location.href = './student.html';
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
  teacherDashboard.style.display = 'none';
  signOutBtn.style.display = 'none';
}

// Show teacher dashboard
function showTeacherDashboard(userData) {
  authSection.style.display = 'none';
  teacherDashboard.style.display = 'block';
  signOutBtn.style.display = 'block';
  
  // Update teacher name
  teacherName.textContent = userData.firstName || userData.email;
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

// Handle question type change
questionType.addEventListener('change', (e) => {
  const type = e.target.value;
  
  // Hide all option sections
  multipleChoiceOptions.style.display = 'none';
  trueFalseOptions.style.display = 'none';
  textAnswerOptions.style.display = 'none';
  
  // Show relevant section
  switch (type) {
    case 'multiple-choice':
      multipleChoiceOptions.style.display = 'block';
      break;
    case 'true-false':
      trueFalseOptions.style.display = 'block';
      break;
    case 'short-answer':
    case 'essay':
      textAnswerOptions.style.display = 'block';
      break;
  }
});

// Handle form submission
questionForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    addQuestionBtn.textContent = 'Adding Question...';
    addQuestionBtn.disabled = true;
    
    const formData = new FormData(questionForm);
    const questionData = {
      text: formData.get('questionText'),
      type: formData.get('questionType'),
      difficulty: formData.get('difficulty'),
      subject: formData.get('subject'),
      topic: formData.get('topic'),
      explanation: formData.get('explanation') || '',
      teacherId: currentUser.uid,
      teacherEmail: currentUser.email,
      createdAt: serverTimestamp(),
      isActive: true
    };
    
    // Add correct answer based on question type
    const questionTypeValue = formData.get('questionType');
    switch (questionTypeValue) {
      case 'multiple-choice':
        const correctAnswer = formData.get('correctAnswer');
        questionData.correctAnswer = correctAnswer;
        questionData.options = {
          A: formData.get('optionAText'),
          B: formData.get('optionBText'),
          C: formData.get('optionCText'),
          D: formData.get('optionDText')
        };
        break;
      case 'true-false':
        questionData.correctAnswer = formData.get('correctAnswer');
        break;
      case 'short-answer':
      case 'essay':
        questionData.correctAnswer = formData.get('correctAnswerText') || '';
        break;
    }
    
    // Add question to Firestore
    await addDoc(collection(db, 'questions'), questionData);
    
    console.log('Question added successfully');
    questionForm.reset();
    hideAllOptionSections();
    
    // Show success message
    showMessage('Question added successfully!', 'success');
    
  } catch (error) {
    console.error('Error adding question:', error);
    showMessage('Error adding question. Please try again.', 'error');
  } finally {
    addQuestionBtn.textContent = 'Add Question';
    addQuestionBtn.disabled = false;
  }
});

// Handle clear form
clearFormBtn.addEventListener('click', () => {
  questionForm.reset();
  hideAllOptionSections();
});

// Handle tab switching
writtenTab.addEventListener('click', () => {
  writtenTab.classList.add('active');
  pdfTab.classList.remove('active');
  writtenForm.style.display = 'block';
  pdfForm.style.display = 'none';
});

pdfTab.addEventListener('click', () => {
  pdfTab.classList.add('active');
  writtenTab.classList.remove('active');
  pdfForm.style.display = 'block';
  writtenForm.style.display = 'none';
});

// Handle PDF upload form
pdfUploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  try {
    uploadPdfBtn.textContent = 'Processing PDF...';
    uploadPdfBtn.disabled = true;
    
    const formData = new FormData(pdfUploadForm);
    const pdfFile = formData.get('pdfFile');
    const subject = formData.get('pdfSubject');
    const topic = formData.get('pdfTopic');
    const difficulty = formData.get('pdfDifficulty');
    
    if (!pdfFile || pdfFile.size === 0) {
      showMessage('Please select a PDF file.', 'error');
      return;
    }
    
    // Simulate PDF processing (in a real app, you'd use a PDF parsing library)
    const extractedText = await processPDF(pdfFile);
    const questions = extractQuestionsFromText(extractedText, subject, topic, difficulty);
    
    extractedQuestionsData = questions;
    displayExtractedQuestions(questions);
    pdfResults.style.display = 'block';
    
    showMessage('PDF processed successfully! Review the extracted questions below.', 'success');
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    showMessage('Error processing PDF. Please try again.', 'error');
  } finally {
    uploadPdfBtn.textContent = 'Upload & Process PDF';
    uploadPdfBtn.disabled = false;
  }
});

// Handle clear PDF form
clearPdfBtn.addEventListener('click', () => {
  pdfUploadForm.reset();
  pdfResults.style.display = 'none';
  extractedQuestionsData = [];
});

// Handle save all questions
saveAllQuestionsBtn.addEventListener('click', async () => {
  try {
    saveAllQuestionsBtn.textContent = 'Saving Questions...';
    saveAllQuestionsBtn.disabled = true;
    
    let savedCount = 0;
    for (const question of extractedQuestionsData) {
      try {
        await addDoc(collection(db, 'questions'), {
          ...question,
          teacherId: currentUser.uid,
          teacherEmail: currentUser.email,
          createdAt: serverTimestamp(),
          isActive: true
        });
        savedCount++;
      } catch (error) {
        console.error('Error saving question:', error);
      }
    }
    
    showMessage(`${savedCount} questions saved successfully!`, 'success');
    pdfResults.style.display = 'none';
    pdfUploadForm.reset();
    extractedQuestionsData = [];
    
  } catch (error) {
    console.error('Error saving questions:', error);
    showMessage('Error saving questions. Please try again.', 'error');
  } finally {
    saveAllQuestionsBtn.textContent = 'Save All Questions';
    saveAllQuestionsBtn.disabled = false;
  }
});

// Process PDF file (simplified version)
async function processPDF(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      // In a real implementation, you would use a PDF parsing library like pdf.js
      // For now, we'll simulate text extraction
      const mockText = `
        Question 1: What is the capital of France?
        A) London B) Paris C) Berlin D) Madrid
        
        Question 2: What is 2 + 2?
        A) 3 B) 4 C) 5 D) 6
        
        Question 3: The sun rises in the east. True or False?
        
        Question 4: Explain the process of photosynthesis.
        
        Question 5: What is the largest planet in our solar system?
        A) Earth B) Jupiter C) Saturn D) Mars
      `;
      resolve(mockText);
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Extract questions from text
function extractQuestionsFromText(text, subject, topic, difficulty) {
  const questions = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  let currentQuestion = null;
  let questionNumber = 1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if line starts with "Question" or contains a question mark
    if (line.toLowerCase().includes('question') || line.includes('?')) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }
      
      currentQuestion = {
        text: line,
        type: 'short-answer', // Default type
        difficulty: difficulty,
        subject: subject,
        topic: topic,
        explanation: '',
        options: {}
      };
      
      // Check if it's a multiple choice question
      if (line.includes('A)') || line.includes('B)') || line.includes('C)') || line.includes('D)')) {
        currentQuestion.type = 'multiple-choice';
        currentQuestion.options = {};
      }
      
      // Check if it's a true/false question
      if (line.toLowerCase().includes('true') && line.toLowerCase().includes('false')) {
        currentQuestion.type = 'true-false';
      }
      
      questionNumber++;
    } else if (currentQuestion && (line.startsWith('A)') || line.startsWith('B)') || line.startsWith('C)') || line.startsWith('D)'))) {
      // Handle multiple choice options
      const option = line.charAt(0);
      const optionText = line.substring(3).trim();
      currentQuestion.options[option] = optionText;
    }
  }
  
  // Add the last question
  if (currentQuestion) {
    questions.push(currentQuestion);
  }
  
  return questions;
}

// Display extracted questions
function displayExtractedQuestions(questions) {
  extractedQuestions.innerHTML = questions.map((question, index) => `
    <div class="extracted-question">
      <h5>Question ${index + 1}</h5>
      <p><strong>Text:</strong> ${question.text}</p>
      <p><strong>Type:</strong> ${formatQuestionType(question.type)}</p>
      <p><strong>Difficulty:</strong> ${question.difficulty}</p>
      ${question.type === 'multiple-choice' && Object.keys(question.options).length > 0 ? 
        `<p><strong>Options:</strong> ${Object.entries(question.options).map(([key, value]) => `${key}) ${value}`).join(', ')}</p>` : 
        ''
      }
      <div class="question-actions">
        <button class="btn btn-primary btn-small" onclick="editQuestion(${index})">Edit</button>
        <button class="btn btn-danger btn-small" onclick="removeQuestion(${index})">Remove</button>
      </div>
    </div>
  `).join('');
}

// Edit question (placeholder function)
window.editQuestion = function(index) {
  const question = extractedQuestionsData[index];
  // In a real implementation, you would open an edit modal
  showMessage('Edit functionality will be implemented in the next version.', 'info');
};

// Remove question
window.removeQuestion = function(index) {
  extractedQuestionsData.splice(index, 1);
  displayExtractedQuestions(extractedQuestionsData);
  showMessage('Question removed.', 'success');
};

// Hide all option sections
function hideAllOptionSections() {
  multipleChoiceOptions.style.display = 'none';
  trueFalseOptions.style.display = 'none';
  textAnswerOptions.style.display = 'none';
}

// Load questions from Firestore
function loadQuestions() {
  if (!currentUser) return;
  
  const q = query(
    collection(db, 'questions'),
    where('teacherId', '==', currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  
  onSnapshot(q, (snapshot) => {
    questions = [];
    snapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() });
    });
    
    filteredQuestions = [...questions];
    displayQuestions();
    updateStats();
    updateFilters();
  });
}

// Display questions
function displayQuestions() {
  if (filteredQuestions.length === 0) {
    questionsList.innerHTML = '<div class="no-questions">No questions found. Add your first question above!</div>';
    return;
  }
  
  questionsList.innerHTML = filteredQuestions.map(question => `
    <div class="question-item" data-id="${question.id}">
      <div class="question-header">
        <div class="question-meta">
          <span class="question-type">${formatQuestionType(question.type)}</span>
          <span class="question-difficulty difficulty-${question.difficulty}">${question.difficulty}</span>
          <span class="question-subject">${question.subject}</span>
        </div>
        <button class="btn btn-danger btn-small delete-question" data-id="${question.id}">Delete</button>
      </div>
      <div class="question-content">
        <p class="question-text">${question.text}</p>
        ${question.explanation ? `<p class="question-explanation"><strong>Explanation:</strong> ${question.explanation}</p>` : ''}
      </div>
    </div>
  `).join('');
  
  // Add event listeners for delete buttons
  document.querySelectorAll('.delete-question').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const questionId = e.target.dataset.id;
      deleteQuestion(questionId);
    });
  });
}

// Delete question
async function deleteQuestion(questionId) {
  if (!confirm('Are you sure you want to delete this question?')) return;
  
  try {
    await deleteDoc(doc(db, 'questions', questionId));
    showMessage('Question deleted successfully!', 'success');
  } catch (error) {
    console.error('Error deleting question:', error);
    showMessage('Error deleting question. Please try again.', 'error');
  }
}

// Update statistics
function updateStats() {
  totalQuestions.textContent = questions.length;
  easyQuestions.textContent = questions.filter(q => q.difficulty === 'easy').length;
  mediumQuestions.textContent = questions.filter(q => q.difficulty === 'medium').length;
  hardQuestions.textContent = questions.filter(q => q.difficulty === 'hard').length;
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
}

// Apply filters
function applyFilters() {
  const subjectFilter = filterSubject.value;
  const difficultyFilter = filterDifficulty.value;
  const typeFilter = filterType.value;
  
  filteredQuestions = questions.filter(question => {
    return (!subjectFilter || question.subject === subjectFilter) &&
           (!difficultyFilter || question.difficulty === difficultyFilter) &&
           (!typeFilter || question.type === typeFilter);
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
