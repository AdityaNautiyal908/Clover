// Import Firebase SDKs via CDN (browser-friendly)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDu76mMWWU4yY8XSuQHvcjQd6chBxacIew",
  authDomain: "clover-aa550.firebaseapp.com",
  projectId: "clover-aa550",
  storageBucket: "clover-aa550.firebasestorage.app",
  messagingSenderId: "349511545067",
  appId: "1:349511545067:web:dc7e877d2bca9a1e900eae",
  measurementId: "G-34968NF3LK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics = null;
try {
  // Analytics requires supported/secure environments. Guard to avoid breaking the app.
  analytics = getAnalytics(app);
} catch (e) {
  // Ignore analytics errors in non-HTTPS or unsupported environments
  console.warn('Analytics not available:', e.message);
}
const db = getFirestore(app);
const auth = getAuth(app);

// Debug: Check if Firebase is properly initialized
console.log('Firebase initialized successfully');
console.log('App:', app);
console.log('Auth:', auth);
console.log('Database:', db);

// Export for use in other modules
export { app, analytics, db, auth, firebaseConfig };

// Set current year in footer
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
