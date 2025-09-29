// firebasesetup.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export function useAuthUser() {
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setUid(user ? user.uid : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { uid, loading };
}
