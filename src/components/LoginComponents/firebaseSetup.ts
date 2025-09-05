import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBAdIonreg9_gauBx0jBl58tYC8PitOXsw",
  authDomain: "datainsight-54ef4.firebaseapp.com",
  projectId: "datainsight-54ef4",
  storageBucket: "datainsight-54ef4.firebasestorage.app",
  messagingSenderId: "960168074270",
  appId: "1:960168074270:web:b12ebc97beb5162ba3e20f",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
