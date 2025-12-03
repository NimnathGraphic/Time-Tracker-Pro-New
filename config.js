// ====================================================================
// FIREBASE CONFIGURATION AND INITIALIZATION
// ====================================================================

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-analytics.js";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

// Your web app's Firebase configuration (User's provided keys)
const firebaseConfig = {
  apiKey: "AIzaSyDn_mM2kWXLFsSn8nia2LIvOduNdklnyKg",
  authDomain: "timetrack-pro-79f80.firebaseapp.com",
  projectId: "timetrack-pro-79f80",
  storageBucket: "timetrack-pro-79f80.firebasestorage.app",
  messagingSenderId: "350900432950",
  appId: "1:350900432950:web:c8a6a1ecd84d26b1fa2897",
  measurementId: "G-PYF12DR7V0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// Export all necessary functions and objects for use in script.js
export { 
    db, 
    auth, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc 
};
