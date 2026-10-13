// src/utils/googleAuth.ts
import {
  signInWithPopup,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebaseSetup";

// Selalu tampilkan pemilih akun Google
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * Login / daftar dengan akun Google lewat popup.
 * Jika user baru, dokumen `users/{uid}` dibuat agar onboarding berjalan.
 *
 * PENTING: signInWithPopup harus dipanggil langsung dari klik tombol
 * tanpa `await` apa pun sebelumnya, kalau tidak browser akan memblokir
 * popup (auth/popup-blocked). Persistence diatur setelah login berhasil.
 */
export async function signInWithGoogle(remember = true): Promise<User> {
  const res = await signInWithPopup(auth, googleProvider);
  const user = res.user;

  if (!remember) {
    await setPersistence(auth, browserSessionPersistence);
  } else {
    await setPersistence(auth, browserLocalPersistence);
  }

  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName || "",
      hasSeenOnboarding: false,
      createdAt: new Date(),
    });
  }

  return user;
}

/**
 * Ubah kode error Firebase menjadi pesan untuk user.
 * Mengembalikan null jika user sendiri yang menutup popup.
 */
export function mapGoogleAuthError(err: unknown): string | null {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: string }).code)
      : "";

  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null;
    case "auth/popup-blocked":
      return "Popup diblokir browser. Izinkan popup untuk situs ini lalu coba lagi.";
    case "auth/unauthorized-domain":
      return "Domain ini belum diizinkan untuk login Google. Tambahkan domain di Firebase Console → Authentication → Settings → Authorized domains.";
    case "auth/operation-not-allowed":
      return "Login Google belum diaktifkan di Firebase Console → Authentication → Sign-in method.";
    case "auth/account-exists-with-different-credential":
      return "Email ini sudah terdaftar dengan metode login lain.";
    case "auth/network-request-failed":
      return "Koneksi bermasalah. Periksa internet Anda lalu coba lagi.";
    default:
      return "Gagal login dengan Google. Coba lagi.";
  }
}
