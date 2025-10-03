import { db, deterministicShuffle } from './app.js';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, deleteDoc, doc, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// Check Firebase connection
console.log('Firebase DB instance:', db);
console.log('Connected to Firestore:', db._delegate?.settings?.host || 'production');

const course = document.getElementById('course');
const points = document.getElementById('points');
const question = document.getElementById('question');
const addBtn = document.getElementById('addBtn');
const filterCourse = document.getElementById('filterCourse');
const tbody = document.querySelector('#table tbody');

// Add question functionality
addBtn.addEventListener('click', async () => {
  console.log('Add button clicked!');
  
  // Show loading state
  addBtn.textContent = 'Adding...';
  addBtn.disabled = true;
  
  const data = {
    course: (course.value || '').trim() || 'general',
    text: (question.value || '').trim(),
    points: Number(points.value || 1),
    createdAt: serverTimestamp()
  };
  
  console.log('Data to add:', data);
  
  if (!data.text) {
    alert('Enter question text');
    addBtn.textContent = 'Add Question';
    addBtn.disabled = false;
    return;
  }
  
  try {
    console.log('Attempting to add document to Firestore...');
    const docRef = await addDoc(collection(db, 'questions'), data);
    console.log('Question added successfully with ID:', docRef.id);
    
    // Clear form
    question.value = '';
    course.value = '';
    points.value = '1';
    
    alert('Question added successfully!');
  } catch (error) {
    console.error('Error adding question:', error);
    alert(`Error adding question: ${error.message}`);
  } finally {
    // Reset button state
    addBtn.textContent = 'Add Question';
    addBtn.disabled = false;
  }
});

// Render table row for a question
function renderRow(id, q) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><span class="badge">${q.course}</span></td>
    <td>${q.text}</td>
    <td>${q.points}</td>
    <td><code>${id}</code></td>
    <td><button data-id="${id}" class="btn danger">Delete</button></td>
  `;
  
  tr.querySelector('button').addEventListener('click', async (e) => {
    const qid = e.currentTarget.getAttribute('data-id');
    if (confirm('Delete this question?')) {
      try {
        await deleteDoc(doc(db, 'questions', qid));
        console.log('Question deleted successfully!');
      } catch (error) {
        console.error('Error deleting question:', error);
        alert('Error deleting question. Please try again.');
      }
    }
  });
  
  return tr;
}

// Real-time listener for questions
let unsubscribe = null;

function listen() {
  if (unsubscribe) { 
    unsubscribe(); 
    unsubscribe = null; 
  }
  
  const c = (filterCourse.value || '').trim();
  const base = collection(db, 'questions');
  const qDef = c ? 
    query(base, where('course', '==', c), orderBy('createdAt', 'desc')) :
    query(base, orderBy('createdAt', 'desc'));
    
  unsubscribe = onSnapshot(qDef, (snap) => {
    tbody.innerHTML = '';
    if (snap.empty) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="empty-state">No questions found</td>';
      tbody.appendChild(tr);
    } else {
      snap.forEach(docSnap => {
        tbody.appendChild(renderRow(docSnap.id, docSnap.data()));
      });
    }
  }, (error) => {
    console.error('Error listening to questions:', error);
    tbody.innerHTML = '<tr><td colspan="5" class="error-state">Error loading questions</td></tr>';
  });
}

// Set up event listeners
filterCourse.addEventListener('input', listen);
listen();
