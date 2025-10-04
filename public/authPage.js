import { app, auth, db } from './app.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, setDoc, getDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitAuth');
const toggleBtn = document.getElementById('toggleAuth');
const emailEl = document.getElementById('authEmail');
const passEl = document.getElementById('authPassword');
const roleGroup = document.getElementById('roleGroup');
const roleSel = document.getElementById('role');
const msg = document.getElementById('authMsg');

let mode = 'login';

function setMode(newMode){
  mode = newMode;
  const isRegister = mode === 'register';
  formTitle.textContent = isRegister ? 'Register' : 'Login';
  submitBtn.textContent = isRegister ? 'Register' : 'Login';
  toggleBtn.textContent = isRegister ? 'Switch to Login' : 'Switch to Register';
  roleGroup.style.display = isRegister ? '' : 'none';
}

function readHash(){
  if (location.hash === '#register') setMode('register');
  else setMode('login');
}

readHash();
window.addEventListener('hashchange', readHash);

toggleBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  location.hash = mode === 'register' ? '' : '#register';
});

submitBtn.addEventListener('click', async ()=>{
  const email = (emailEl.value||'').trim();
  const password = (passEl.value||'').trim();
  if(!email || !password){ msg.textContent = 'Enter email and password'; return; }

  try {
    submitBtn.textContent = mode === 'register' ? 'Registering...' : 'Logging in...';
    submitBtn.disabled = true;

    if(mode === 'register'){
      const role = roleSel.value || 'student';
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await upsertProfile(cred.user.uid, { email, role });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (e) {
    msg.textContent = e.message;
  } finally {
    submitBtn.textContent = mode === 'register' ? 'Register' : 'Login';
    submitBtn.disabled = false;
  }
});

onAuthStateChanged(auth, async (user)=>{
  if(user){
    // redirect by role
    const profile = await getDoc(doc(collection(db, 'users'), user.uid));
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


