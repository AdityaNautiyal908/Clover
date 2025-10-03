import { db, auth, deterministicShuffle } from './app.js';
import { collection, getDocs, query, where, orderBy, setDoc, getDoc, doc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

const studentIdEl = document.getElementById('studentId');
const courseIdEl = document.getElementById('courseId');
const btn = document.getElementById('loadBtn');
const list = document.getElementById('questions');
const count = document.getElementById('count');
const questionsSection = document.getElementById('questionsSection');
const authSection = document.getElementById('authSection');
const querySection = document.getElementById('querySection');
const studentEmail = document.getElementById('studentEmail');
const studentPassword = document.getElementById('studentPassword');
const studentSignIn = document.getElementById('studentSignIn');
const studentSignOut = document.getElementById('studentSignOut');
const studentUserInfo = document.getElementById('studentUserInfo');

btn.addEventListener('click', load);

studentSignIn.addEventListener('click', async () => {
  try {
    studentSignIn.textContent = 'Signing in...';
    studentSignIn.disabled = true;
    await signInWithEmailAndPassword(auth, (studentEmail.value||'').trim(), (studentPassword.value||'').trim());
  } catch (e) {
    alert(e.message);
  } finally {
    studentSignIn.textContent = 'Sign In';
    studentSignIn.disabled = false;
  }
});

studentSignOut.addEventListener('click', async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.style.display = 'none';
    querySection.style.display = '';
    studentSignOut.style.display = '';
    studentUserInfo.textContent = `Signed in as ${user.email}`;
    upsertUserProfile(user.uid, { role: 'student', email: user.email });
  } else {
    authSection.style.display = '';
    querySection.style.display = 'none';
    studentSignOut.style.display = 'none';
    studentUserInfo.textContent = '';
  }
});

async function upsertUserProfile(uid, data){
  const ref = doc(collection(db, 'users'), uid);
  const snap = await getDoc(ref);
  if (!snap.exists()){
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  }
}

async function load() {
  const studentId = (studentIdEl.value || '').trim();
  const courseId = (courseIdEl.value || '').trim() || 'general';
  
  if (!studentId) {
    alert('Enter Student ID');
    return;
  }

  try {
    // Show loading state
    btn.textContent = 'Loading...';
    btn.disabled = true;
    
    const qSnap = await getDocs(
      query(
        collection(db, 'questions'), 
        where('course', '==', courseId), 
        orderBy('createdAt', 'desc')
      )
    );
    
    const questions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (questions.length === 0) {
      alert(`No questions found for course "${courseId}". Please check the course name or ask your teacher to add questions.`);
      questionsSection.style.display = 'none';
      return;
    }
    
    // Shuffle questions deterministically based on student ID and course
    const shuffled = deterministicShuffle(questions, studentId + '|' + courseId);

    // Clear and populate the list
    list.innerHTML = '';
    shuffled.forEach((q, i) => {
      const li = document.createElement('li');
      li.innerHTML = `
        <div class="question-item">
          <div class="question-header">
            <strong>Q${i + 1}.</strong>
            <span class="badge" title="points">${q.points} pts</span>
          </div>
          <div class="question-text">${q.text}</div>
        </div>
      `;
      list.appendChild(li);
    });
    
    count.textContent = String(shuffled.length);
    questionsSection.style.display = 'block';
    
    console.log(`Loaded ${shuffled.length} questions for student ${studentId} in course ${courseId}`);
    
  } catch (error) {
    console.error('Error loading questions:', error);
    alert('Error loading questions. Please check your connection and try again.');
    questionsSection.style.display = 'none';
  } finally {
    // Reset button state
    btn.textContent = 'Load Questions';
    btn.disabled = false;
  }
}

// Allow Enter key to trigger load
studentIdEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    load();
  }
});

courseIdEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    load();
  }
});
