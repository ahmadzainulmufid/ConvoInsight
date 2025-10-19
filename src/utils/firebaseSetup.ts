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
  apiKey: "AIzaSyBAdIonreg9_gauBx0jBl58tYC8PitOXsw",
  authDomain: "datainsight-54ef4.firebaseapp.com",
  projectId: "datainsight-54ef4",
  storageBucket: "datainsight-54ef4.firebasestorage.app",
  messagingSenderId: "960168074270",
  appId: "1:960168074270:web:b12ebc97beb5162ba3e20f",
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
