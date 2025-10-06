import { auth, db } from '../firebase-config';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      const errorMsg = document.getElementById('errorMessage');
      const successMsg = document.getElementById('successMessage');
      
      errorMsg.style.display = 'none';
      successMsg.style.display = 'none';

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      if (!email || !password) {
        errorMsg.textContent = 'Please enter both email and password.';
        errorMsg.style.display = 'block';
        return;
      }

      // Simulate API call success/failure
      if (password === "correct") { // Replace with actual login logic
        successMsg.textContent = 'Login successful! Redirecting...';
        successMsg.style.display = 'block';
        setTimeout(() => window.location.href = './teacher.html', 1500);
      } else {
        errorMsg.textContent = 'Invalid email or password.';
        errorMsg.style.display = 'block';
      }
    });

// Show error message
function showError(message) {
  errorMessage.innerHTML = message;
  errorMessage.style.display = 'block';
  successMessage.style.display = 'none';
}

// Show success message
function showSuccess(message) {
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  errorMessage.style.display = 'none';
}

// Hide messages
function hideMessages() {
  errorMessage.style.display = 'none';
  successMessage.style.display = 'none';
}

// Update last login time
async function updateLastLogin(userId) {
  try {
    await updateDoc(doc(db, 'users', userId), {
      lastLoginAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating last login time:', error);
  }
}

// Handle form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();

  // Get form data
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  // Basic validation
  if (!email || !password) {
    showError('Please enter both email and password');
    return;
  }

  try {
    // Update button state
    loginBtn.textContent = 'Signing In...';
    loginBtn.disabled = true;

    console.log('Attempting login for:', email);

    // Sign in with Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('Login successful for user:', user.uid);

    // Try to update last login time (optional, don't fail if this doesn't work)
    try {
      await updateLastLogin(user.uid);
    } catch (updateError) {
      console.warn('Could not update last login time:', updateError);
    }

    // Get user data to determine role
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('User data found:', userData);
        showSuccess('Login successful! Redirecting...');

        // Redirect based on role after a short delay
        setTimeout(() => {
          if (userData.role === 'teacher') {
            window.location.href = './teacher.html';
          } else {
            window.location.href = './student.html';
          }
        }, 1500);
      } else {
        // User document doesn't exist, create a basic one and redirect to student page
        console.log('User document not found, creating basic profile...');
        try {
          await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: user.email,
            firstName: '',
            lastName: '',
            fullName: '',
            role: 'student',
            institution: '',
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            isActive: true
          });
        } catch (createError) {
          console.warn('Could not create user document:', createError);
        }
        
        showSuccess('Login successful! Redirecting...');
        setTimeout(() => {
          window.location.href = './student.html';
        }, 1500);
      }
    } catch (docError) {
      console.error('Error accessing user document:', docError);
      // Still allow login even if we can't access the document
      showSuccess('Login successful! Redirecting...');
      setTimeout(() => {
        window.location.href = './student.html';
      }, 1500);
    }

  } catch (error) {
    console.error('Login error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Handle specific Firebase errors
    let errorMsg = 'An error occurred during login. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        errorMsg = 'No account found with this email address. Please check your email or <a href="./register.html" style="color: #3b82f6;">create a new account</a>.';
        break;
      case 'auth/wrong-password':
        errorMsg = 'Incorrect password. Please try again.';
        break;
      case 'auth/invalid-email':
        errorMsg = 'Please enter a valid email address.';
        break;
      case 'auth/user-disabled':
        errorMsg = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Too many failed login attempts. Please try again later.';
        break;
      case 'auth/network-request-failed':
        errorMsg = 'Network error. Please check your internet connection and try again.';
        break;
      case 'auth/invalid-credential':
        errorMsg = 'Invalid email or password. Please check your credentials and try again.';
        break;
      case 'auth/operation-not-allowed':
        errorMsg = 'Email/password authentication is not enabled. Please contact support.';
        break;
      case 'auth/weak-password':
        errorMsg = 'Password is too weak. Please use a stronger password.';
        break;
    }
    
    showError(errorMsg);
  } finally {
    // Reset button state
    loginBtn.textContent = 'Sign In';
    loginBtn.disabled = false;
  }
});

// Monitor auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    // User is already signed in, we'll redirect them based on their role
    // This is handled in the login form submission above
  } else {
    console.log('User is signed out');
  }
});

// Handle forgot password (placeholder for now)
document.querySelector('.forgot-password').addEventListener('click', (e) => {
  e.preventDefault();
  showError('Password reset functionality will be available soon. Please contact support for assistance.');
});

// Auto-focus email field when page loads
window.addEventListener('load', () => {
  document.getElementById('email').focus();
});

// Handle Enter key in password field
document.getElementById('password').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginForm.dispatchEvent(new Event('submit'));
  }
});
