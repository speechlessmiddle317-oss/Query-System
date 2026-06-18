import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configured from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0578703073",
  appId: "1:477282281783:web:3688c925c1c9ef354b12b2",
  apiKey: "AIzaSyChv3VSbErg6Xb_PjX3wSDLw8ANWIwMbiY",
  authDomain: "gen-lang-client-0578703073.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2c8fa4df-9478-4d21-9ebb-8854f12eeb84",
  storageBucket: "gen-lang-client-0578703073.firebasestorage.app",
  messagingSenderId: "477282281783",
};

const app = initializeApp(firebaseConfig);

// Use the custom database ID provisioned for AI Studio
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

