import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, GithubAuthProvider, signInWithPopup  } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const registerBtn = document.getElementById('registerBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const roleSelect = document.getElementById('role');
const studentIdGroup = document.getElementById('studentIdGroup');
const studentIdInput = document.getElementById('studentId');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');


// ===================================================================
// UTILITY FUNCTIONS
// ===================================================================

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

// Store user data in Firestore
async function storeUserData(user, formData) {
  try {
    const userData = {
      uid: user.uid,
      email: user.email,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      fullName: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
      role: formData.role || 'student', // Default role for social logins
      institution: formData.institution?.trim() || '',
      studentId: formData.studentId?.trim() || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    };

    // Store with setDoc (recommended for known UID)
    await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
    console.log('User data stored successfully with setDoc:', userData);
    return true;
  } catch (error) {
    console.error('Error storing user data:', error);
    console.warn('Registration will continue without Firestore data storage');
    return false;
  }
}

// Form validation
function validateForm(formData) {
  const errors = [];

  // Check if passwords match
  if (formData.password !== formData.confirmPassword) {
    errors.push('Passwords do not match');
  }

  // Check password length
  if (formData.password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  // Check if role is selected
  if (!formData.role) {
    errors.push('Please select your role');
  }

  // Check if required fields are filled
  const requiredFields = ['firstName', 'lastName', 'email', 'password'];
  requiredFields.forEach(field => {
    if (!formData[field].trim()) {
      errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
    }
  });

  // Validate student ID if role is student
  if (formData.role === 'student' && !formData.studentId?.trim()) {
    errors.push('Student ID is required for students');
  }

  return errors;
}

// Password toggle functionality (Copied from HTML)
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    const toggle = field.parentElement.querySelector('.password-toggle .eye-icon');
    
    if (field.type === 'password') {
      field.type = 'text';
      toggle.innerHTML = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
      `;
    } else {
      field.type = 'password';
      toggle.innerHTML = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      `;
    }
}


// ===================================================================
// EVENT LISTENERS
// ===================================================================

// Handle role change
roleSelect.addEventListener('change', (e) => {
  const role = e.target.value;
  if (role === 'student') {
    studentIdGroup.style.display = 'block';
    studentIdInput.required = true;
  } else {
    studentIdGroup.style.display = 'none';
    studentIdInput.required = false;
    studentIdInput.value = '';
  }
});

// Real-time password strength and color indicator
passwordInput.addEventListener('input', (e) => {
  const password = e.target.value;
  const hint = passwordInput.parentElement.nextElementSibling;
  
  // Check password length and update hint color
  if (password.length >= 6) {
    hint.style.color = '#4caf50'; // Success color
    hint.textContent = 'Password looks good!';
    passwordInput.style.borderColor = '#404040'; // Neutral border color
  } else {
    hint.style.color = '#a0a0a0'; // Muted color
    hint.textContent = 'Must be at least 6 characters.';
    passwordInput.style.borderColor = '#ef4444'; // Error/Warning border color
  }
  
  // Also check confirm password if it has a value
  if (confirmPasswordInput.value) {
    if (password !== confirmPasswordInput.value) {
      confirmPasswordInput.style.borderColor = '#ef4444'; // Error border color
    } else {
      confirmPasswordInput.style.borderColor = '#404040'; // Neutral border color
    }
  }
});

// Real-time password confirmation validation
confirmPasswordInput.addEventListener('input', (e) => {
  const password = passwordInput.value;
  const confirmPassword = e.target.value;
  
  if (confirmPassword && password !== confirmPassword) {
    confirmPasswordInput.style.borderColor = '#ef4444';
  } else {
    confirmPasswordInput.style.borderColor = '#404040';
  }
});


// Handle form submission (Email/Password)
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();

  // Get form data
  const formData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    password: passwordInput.value,
    confirmPassword: confirmPasswordInput.value,
    role: roleSelect.value,
    institution: document.getElementById('institution').value,
    studentId: studentIdInput.value
  };

  // Validate form
  const validationErrors = validateForm(formData);
  if (validationErrors.length > 0) {
    showError(validationErrors.join('. '));
    return;
  }

  try {
    // Update button state
    registerBtn.textContent = 'Creating Account...';
    registerBtn.disabled = true;

    // Sign out any existing user first (as provided in original code)
    if (auth.currentUser) {
      await signOut(auth);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email.trim(), 
      formData.password
    );

    const user = userCredential.user;

    // Store additional user data in Firestore
    await new Promise(resolve => setTimeout(resolve, 1000));
    const firestoreSuccess = await storeUserData(user, formData);

    if (firestoreSuccess) {
      showSuccess('Account created successfully! Redirecting...');
    } else {
      showSuccess('Account created successfully! (Profile data may be delayed) Redirecting...');
    }

    // Redirect based on role after a short delay
    setTimeout(() => {
      if (formData.role === 'teacher') {
        window.location.href = './teacher.html';
      } else {
        window.location.href = './student.html';
      }
    }, 2000);

  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific Firebase errors
    let errorMsg = 'An error occurred during registration. Please try again.';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMsg = 'This email is already registered. Please use a different email or <a href="./login.html" style="color: #3b82f6;">try logging in</a>.';
        break;
      case 'auth/invalid-email':
        errorMsg = 'Please enter a valid email address.';
        break;
      case 'auth/weak-password':
        errorMsg = 'Password is too weak. Please choose a stronger password.';
        break;
      case 'auth/network-request-failed':
        errorMsg = 'Network error. Please check your internet connection and try again.';
        break;
      case 'auth/operation-not-allowed':
        errorMsg = 'Email/password authentication is not enabled. Please contact support.';
        break;
      case 'auth/too-many-requests':
        errorMsg = 'Too many failed attempts. Please try again later.';
        break;
      default:
        errorMsg = error.message;
    }
    
    showError(errorMsg);
  } finally {
    // Reset button state
    registerBtn.textContent = 'Sign Up';
    registerBtn.disabled = false;
  }
});


// ------------------- GOOGLE SIGN-IN -------------------
document.getElementById("googleSignIn")?.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  hideMessages();
  
  try {
    // Note: signInWithPopup must be triggered immediately by the user click
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Prepare user data
    const formData = {
      firstName: user.displayName?.split(" ")[0] || "",
      lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
      email: user.email,
      role: "student", // Default social sign-ins to student role
      institution: "",
      studentId: ""
    };

    // Store in Firestore 
    await storeUserData(user, formData);

    showSuccess('Google sign-up successful! Redirecting...');
    setTimeout(() => window.location.href = "./student.html", 1500);

  } catch (error) {
    console.error("Google login error:", error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      showError('Authentication cancelled.');
    } else if (error.code === 'auth/popup-blocked') {
      showError('Authentication failed: Please allow pop-up windows for this site.');
    } else {
      showError(`Google Sign-Up Failed: ${error.message}`);
    }
  }
});

// ------------------- GITHUB SIGN-IN -------------------
document.getElementById("githubSignIn")?.addEventListener("click", async () => {
  const provider = new GithubAuthProvider();
  hideMessages();
  
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Prepare minimal user data
    const formData = {
      firstName: user.displayName || (user.email ? user.email.split("@")[0] : "GitHubUser"),
      lastName: "",
      email: user.email || "no-email-provided",
      role: "student",
      institution: "",
      studentId: ""
    };

    // Store in Firestore
    await storeUserData(user, formData);
    
    showSuccess('GitHub sign-up successful! Redirecting...');
    setTimeout(() => window.location.href = "./student.html", 1500);

  } catch (error) {
    console.error("GitHub login error details:", error);
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      showError('Authentication cancelled.');
    } else if (error.code === 'auth/popup-blocked') {
      showError('Authentication failed: Please allow pop-up windows for this site.');
    } else {
      showError(`GitHub Sign-Up Failed: ${error.message}`);
    }
  }
});

// Monitor auth state changes (Kept for completeness, though mainly used for debugging)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
  } else {
    console.log('User is signed out');
    hideMessages();
  }
});