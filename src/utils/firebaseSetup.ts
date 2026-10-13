// src/utils/firebaseSetup.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";

const firebaseConfig = {
  apiKey: "AIzaSyBkiIirqyybsSAxNdxyYtdBx2WZzwqV3C0",
  authDomain: "convoinsight-8ed6b.firebaseapp.com",
  projectId: "convoinsight-8ed6b",
  storageBucket: "convoinsight-8ed6b.firebasestorage.app",
  messagingSenderId: "197522659121",
  appId: "1:197522659121:web:902af9874aacaa911c4210",
};

// ✅ Pastikan hanya 1 instance
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// ✅ Hook untuk user login
export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading };
}
