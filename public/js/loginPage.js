import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const forgotPasswordLink = document.querySelector('.forgot-password');

function showError(message) {
  errorMessage.innerHTML = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
}

function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
}

function hideMessages() {
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';
}

// Update last login time (remains async, relies on serverTimestamp)
async function updateLastLogin(userId) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastLoginAt: serverTimestamp()
    });
  } catch (error) {
    // Use console.error/warn sparingly, mainly for non-critical failures
    console.warn('Could not update last login time:', error);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();

  // Get form data
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  // Basic validation
  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    // 1. Update button state
    loginBtn.textContent = 'Signing In...';
    loginBtn.disabled = true;

    // 2. Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3. Update last login time (runs in background)
    updateLastLogin(user.uid);

    // 4. Get user data to determine role
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    showSuccess('Login successful! Redirecting...');
    
    // 5. Determine redirection path
    let redirectPath = './student.html'; // Default to student

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === 'teacher') {
        redirectPath = './teacher.html';
      }
    } else {
      // Profile doesn't exist (e.g., deleted Firestore record), redirect to student and create basic profile
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: 'student',
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          isActive: true
        }, { merge: true });
      } catch (createError) {
        console.error('Could not create basic user profile:', createError);
      }
    }
    
    // 6. Redirect
    setTimeout(() => {
      window.location.href = redirectPath;
    }, 1500);

  } catch (error) {
    // Use console.error only for errors, no console.log/info
    console.error('Login error:', error.code, error.message);
    
    // Handle specific Firebase errors
    let errorMsg = 'An error occurred during login. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        errorMsg = 'Invalid email or password. Please check your credentials or <a href="./register.html" style="color: #3b82f6;">create an account</a>.';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Too many failed login attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMsg = 'Network error. Please check your internet connection and try again.';
        break;
      case 'auth/user-disabled':
        errorMsg = 'This account has been disabled. Please contact support.';
        break;
      default:
        errorMsg = error.message;
    }
    
    showError(errorMsg);
  } finally {
    // Reset button state
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
  }
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Do not redirect here, as it conflicts with the form submission
  } else {
    hideMessages();
  }
});

// Handle forgot password (placeholder)
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showError('Password reset functionality will be available soon. Please contact support for assistance.');
    });
}

// Auto-focus email field when page loads
window.addEventListener('load', () => {
  emailInput.focus();
});

// Handle Enter key in password field
passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginForm.dispatchEvent(new Event('submit'));
  }
});