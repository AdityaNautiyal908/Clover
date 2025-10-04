import { app, auth, db } from './app.js';
import { onAuthStateChanged, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, setDoc, getDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const submitBtn = document.getElementById('submitAuth');
const emailEl = document.getElementById('authEmail');
const passEl = document.getElementById('authPassword');
const roleSel = document.getElementById('role');
const msg = document.getElementById('authMsg');

submitBtn.addEventListener('click', async ()=>{
  const email = (emailEl.value||'').trim();
  const password = (passEl.value||'').trim();
  const role = roleSel.value || 'student';
  
  if(!email || !password){ 
    msg.textContent = 'Enter email and password'; 
    return; 
  }

  if(password.length < 6){
    msg.textContent = 'Password must be at least 6 characters';
    return;
  }

  try {
    submitBtn.textContent = 'Registering...';
    submitBtn.disabled = true;

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await upsertProfile(cred.user.uid, { email, role });
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    submitBtn.textContent = 'Register';
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

async function upsertProfile(uid, data){
  const ref = doc(collection(db, 'users'), uid);
  const snapshot = await getDoc(ref);
  if(!snapshot.exists()){
    await setDoc(ref, { ...data, createdAt: serverTimestamp() });
  }
}

// Allow Enter key to trigger register
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

roleSel.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitBtn.click();
  }
});
