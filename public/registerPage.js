import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, onAuthStateChanged, signOut, GoogleAuthProvider, GithubAuthProvider, signInWithPopup  } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const registerBtn = document.getElementById('registerBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const roleSelect = document.getElementById('role');
const studentIdGroup = document.getElementById('studentIdGroup');
const studentIdInput = document.getElementById('studentId');

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
      role: formData.role,
      institution: formData.institution?.trim() || '',
      studentId: formData.studentId?.trim() || '',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isActive: true
    };

    // Try multiple approaches to store user data
    try {
      // First try: Direct write with setDoc
      await setDoc(doc(db, 'users', user.uid), userData, { merge: true });
      console.log('User data stored successfully with setDoc:', userData);
    } catch (setDocError) {
      console.warn('setDoc failed, trying alternative approach:', setDocError);
      
      // Second try: Use addDoc to create a new document
      try {
        await addDoc(collection(db, 'users'), {
          ...userData,
          documentId: user.uid // Store the UID as a field for reference
        });
        console.log('User data stored successfully with addDoc:', userData);
      } catch (addDocError) {
        console.error('Both setDoc and addDoc failed:', addDocError);
        throw addDocError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error storing user data:', error);
    // Don't throw the error - let registration succeed even if Firestore write fails
    console.warn('Registration will continue without Firestore data storage');
    return false;
  }
}

// Handle form submission
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideMessages();

  // Get form data
  const formData = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    role: document.getElementById('role').value,
    institution: document.getElementById('institution').value,
    studentId: document.getElementById('studentId').value
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

    console.log('Starting registration for:', formData.email);

    // Sign out any existing user first to ensure clean registration
    if (auth.currentUser) {
      console.log('Signing out existing user for clean registration...');
      await signOut(auth);
      // Wait a moment for sign out to complete
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      formData.email.trim(), 
      formData.password
    );

    const user = userCredential.user;
    console.log('User created successfully:', user.uid);

    // Store additional user data in Firestore
    // Add a small delay to ensure user is fully authenticated
    await new Promise(resolve => setTimeout(resolve, 1000));
    const firestoreSuccess = await storeUserData(user, formData);

    if (firestoreSuccess) {
      showSuccess('Account created successfully! Redirecting...');
    } else {
      showSuccess('Account created successfully! (Profile data will be saved on first login) Redirecting...');
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
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
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
    }
    
    showError(errorMsg);
  } finally {
    // Reset button state
    registerBtn.textContent = 'Create Account';
    registerBtn.disabled = false;
  }
});

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

// Monitor auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User is signed in:', user.email);
    // Don't show any blocking messages - let users register freely
  } else {
    console.log('User is signed out');
    // Clear any messages when no user is signed in
    hideMessages();
  }
});

// Real-time password confirmation validation
document.getElementById('confirmPassword').addEventListener('input', (e) => {
  const password = document.getElementById('password').value;
  const confirmPassword = e.target.value;
  
  if (confirmPassword && password !== confirmPassword) {
    e.target.style.borderColor = '#ef4444';
  } else {
    e.target.style.borderColor = '#404040';
  }
});

// Real-time password strength indicator
document.getElementById('password').addEventListener('input', (e) => {
  const password = e.target.value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (password.length < 6) {
    e.target.style.borderColor = '#ef4444';
  } else {
    e.target.style.borderColor = '#404040';
  }
  
  // Also check confirm password if it has a value
  if (confirmPassword) {
    if (password !== confirmPassword) {
      document.getElementById('confirmPassword').style.borderColor = '#ef4444';
    } else {
      document.getElementById('confirmPassword').style.borderColor = '#404040';
    }
  }
});

// ------------------- GOOGLE SIGN-IN -------------------
document.getElementById("googleSignIn")?.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    // Trigger popup immediately
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Prepare user data
    const formData = {
      firstName: user.displayName?.split(" ")[0] || "",
      lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
      email: user.email,
      role: "student",
      institution: "",
      studentId: ""
    };

    // Store in Firestore and wait for it to complete
    await storeUserData(user, formData);

    // Optional: console log
    console.log("✅ Google user stored in Firestore:", user.email);

    // Redirect immediately after Firestore write
    window.location.href = "./student.html";

  } catch (error) {
    console.error("Google login error:", error);
    alert("Google Login Failed: " + error.message);
  }
});

// ------------------- GITHUB SIGN-IN -------------------
document.getElementById("githubSignIn")?.addEventListener("click", async () => {
  const provider = new GithubAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Prepare minimal user data
    const formData = {
      firstName: user.displayName || (user.email ? user.email.split("@")[0] : "GitHubUser"),
      lastName: "",
      email: user.email || "no-email@github.com",
      role: "student",
      institution: "",
      studentId: ""
    };

    // Store in Firestore
    try {
      await storeUserData(user, formData);
      console.log("GitHub user stored in Firestore:", user.email);
    } catch (firestoreError) {
      console.error("❌ Firestore write failed (GitHub):", firestoreError);
    }

    window.location.href = "./student.html";

  } catch (error) {
    console.error("❌ GitHub login error details:");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    console.error("Custom data:", error.customData);
    alert("GitHub Login Failed: " + error.message);
  }
});
