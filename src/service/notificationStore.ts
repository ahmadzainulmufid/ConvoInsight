// src/service/notificationStore.ts
import { auth, db } from "../utils/firebaseSetup";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

export type NotificationItem = {
  id?: string;
  title: string;
  message: string;
  type: "domain" | "dataset" | "chat" | "insight";
  createdAt?: unknown;
  read?: boolean;
};

// ✅ Tambah notifikasi baru
export async function addNotification(
  type: string,
  title: string,
  message: string
) {
  // Pastikan auth siap
  await new Promise((resolve) => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        unsub();
        resolve(user);
      }
    });
  });

  const user = auth.currentUser;
  if (!user) return;

  const colRef = collection(db, "users", user.uid, "notifications");
  await addDoc(colRef, {
    type,
    title,
    message,
    read: false,
    createdAt: serverTimestamp(),
  });
}

// ✅ Dengar notifikasi realtime
export function listenNotifications(cb: (list: NotificationItem[]) => void) {
  // Tunggu auth siap sebelum mendaftarkan listener
  let unsubAuth: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;

  unsubAuth = auth.onAuthStateChanged((user) => {
    if (user) {
      const q = query(
        collection(db, "users", user.uid, "notifications"),
        orderBy("createdAt", "desc")
      );

      unsubFirestore = onSnapshot(q, (snap) => {
        const out: NotificationItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as NotificationItem),
        }));
        cb(out);
      });
    }
  });

  // fungsi cleanup
  return () => {
    unsubAuth?.();
    unsubFirestore?.();
  };
}
