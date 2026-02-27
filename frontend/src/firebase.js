// Firebase App + Auth + Firestore
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyACHCGDuYXUhut6_p3gluHKp9XrCVBvuG4",
  authDomain: "sitskillbridge.firebaseapp.com",
  projectId: "sitskillbridge",
  storageBucket: "sitskillbridge.firebasestorage.app",
  messagingSenderId: "311354448221",
  appId: "1:311354448221:web:5a22afcd099064437af0b4",
  measurementId: "G-GSC9919C0B",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase Auth — handles passwords securely (never stored in plain text)
export const auth = getAuth(app);

// Firestore — stores user profiles (uid, username, createdAt)
export const db = getFirestore(app);

export default app;