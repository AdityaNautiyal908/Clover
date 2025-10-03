// Import Firebase SDKs via CDN (browser-friendly)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js';

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
}
const db = getFirestore(app);

// Export for use in other modules
export { app, analytics, db, firebaseConfig };

// Deterministic PRNG (Mulberry32) and shuffle for per-student order
export function createSeededRng(seed){
  let t = seed >>> 0;
  return function(){
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r ^= r + Math.imul(r ^ r >>> 7, 61 | r);
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

export function deterministicShuffle(array, seedStr){
  const seed = [...String(seedStr)].reduce((a,c)=> (a*31 + c.charCodeAt(0)) >>> 0, 0x811C9DC5);
  const rand = createSeededRng(seed);
  const out = array.slice();
  for(let i=out.length-1;i>0;i--){
    const j = Math.floor(rand()*(i+1));
    [out[i],out[j]] = [out[j],out[i]];
  }
  return out;
}

// Set current year in footer
document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());
