import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAH9dOS457vf048dBBqSXejZMD97GX_1wE",
  authDomain: "wc2026game.firebaseapp.com",
  projectId: "wc2026game",
  storageBucket: "wc2026game.firebasestorage.app",
  messagingSenderId: "362164552972",
  appId: "1:362164552972:web:db30ca2e73ce6578dc3529",
  measurementId: "G-9YWQNRN964",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
