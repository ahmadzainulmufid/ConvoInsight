// src/service/notificationStore.ts
import { auth, db } from "../utils/firebaseSetup";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  deleteDoc,
} from "firebase/firestore";

export type NotificationItem = {
  id?: string;
  title: string;
  message: string;
  type: "domain" | "dataset" | "chat" | "insight";
  createdAt?: unknown;
  expireAt?: Timestamp;
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

export function listenNotifications(cb: (list: NotificationItem[]) => void) {
  let unsubAuth: (() => void) | null = null;
  let unsubFirestore: (() => void) | null = null;

  unsubAuth = auth.onAuthStateChanged((user) => {
    if (user) {
      const q = query(
        collection(db, "users", user.uid, "notifications"),
        orderBy("createdAt", "desc")
      );

      unsubFirestore = onSnapshot(q, async (snap) => {
        const now = Date.now();
        const ONE_HOUR_MS = 60 * 60 * 1000;
        const out: NotificationItem[] = [];

        for (const d of snap.docs) {
          const data = d.data() as NotificationItem;

          let createdAtMillis = 0;
          const createdAtField: unknown = data.createdAt;

          if (createdAtField instanceof Timestamp) {
            createdAtMillis = createdAtField.toMillis();
          } else if (
            typeof createdAtField === "object" &&
            createdAtField !== null &&
            "seconds" in createdAtField &&
            typeof (createdAtField as { seconds: number }).seconds === "number"
          ) {
            createdAtMillis =
              (createdAtField as { seconds: number }).seconds * 1000;
          }

          if (!createdAtMillis) {
            out.push({ id: d.id, ...data });
            continue;
          }

          const ageInMs = now - createdAtMillis;

          if (ageInMs > ONE_HOUR_MS) {
            try {
              await deleteDoc(d.ref);
              console.log(`🧹 Deleted expired notification: ${d.id}`);
            } catch (err) {
              console.warn("Failed to delete expired notification", err);
            }
          } else {
            out.push({ id: d.id, ...data });
          }
        }

        cb(out);
      });
    }
  });

  return () => {
    unsubAuth?.();
    unsubFirestore?.();
  };
}
