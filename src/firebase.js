import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';

// Firebase configuration
// PENTING: Ganti dengan config dari Firebase Console Anda
// Atau gunakan environment variables (.env file)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDpKxY8k1fy2tgRxtrnHyoWffLBrQDGhxI",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "budget-tracker-92dbd.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://budget-tracker-92dbd-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "budget-tracker-92dbd",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "budget-tracker-92dbd.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1086543623280",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1086543623280:web:3343f3f6cc36bdb59b30b5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const database = getDatabase(app);
export const auth = getAuth(app);

// Enable offline persistence
// Database akan cache data dan sync otomatis saat online
