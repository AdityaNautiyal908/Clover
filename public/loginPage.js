import { app, auth, db } from './app.js';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const submitBtn = document.getElementById('submitAuth');
const emailEl = document.getElementById('authEmail');
const passEl = document.getElementById('authPassword');
const msg = document.getElementById('authMsg');

submitBtn.addEventListener('click', async ()=>{
  const email = (emailEl.value||'').trim();
  const password = (passEl.value||'').trim();
  if(!email || !password){ 
    msg.textContent = 'Enter email and password'; 
    return; 
  }

  try {
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;

    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    submitBtn.textContent = 'Login';
    submitBtn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    // redirect by role
    const profile = await getDoc(doc(db, 'users', user.uid));
    const role = profile.exists() ? (profile.data().role||'student') : 'student';
    if(role === 'teacher') location.href = './teacher.html';
    else location.href = './student.html';
  }
});

// Allow Enter key to trigger login
emailEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitBtn.click();
  }
});

passEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitBtn.click();
  }
});
