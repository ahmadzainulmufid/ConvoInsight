import { useCallback, useEffect, useState } from "react";
import { db, auth } from "../utils/firebaseSetup";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getDomainDocId } from "../service/chatStore";

export type ChatItem = {
  id: string;
  title: string;
  section?: string;
  createdAt: number;
};

// 🧠 Helper buat dapetin key berdasarkan UID
function getKey() {
  const uid = auth.currentUser?.uid;
  return uid ? `chat_history_${uid}` : "chat_history";
}

function read(): ChatItem[] {
  try {
    const key = getKey();
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(items: ChatItem[]) {
  const key = getKey();
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("chats:updated"));
}

export function useChatHistory(section?: string) {
  const [items, setItems] = useState<ChatItem[]>(() => read());

  useEffect(() => {
    const sync = () => setItems(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === getKey()) sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("chats:updated", sync as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("chats:updated", sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const oldData = localStorage.getItem("chat_history");
    if (oldData && !localStorage.getItem(`chat_history_${uid}`)) {
      localStorage.setItem(`chat_history_${uid}`, oldData);
      localStorage.removeItem("chat_history");
    }
  }, []);

  const add = useCallback((item: ChatItem) => {
    const cur = read();
    const next = [item, ...cur];
    write(next);
    setItems(next);
  }, []);

  const remove = useCallback(
    async (sessionId: string) => {
      const cur = read();
      const next = cur.filter((x) => x.id !== sessionId);
      write(next);
      setItems(next);

      const user = auth.currentUser;
      if (user && section) {
        try {
          const domainDocId = await getDomainDocId(section);
          if (!domainDocId) {
            console.warn("Domain not found in Firestore:", section);
            return;
          }

          const colRef = collection(
            db,
            "users",
            user.uid,
            "domains",
            domainDocId,
            "messages"
          );
          const q = query(colRef, where("sessionId", "==", sessionId));
          const snap = await getDocs(q);

          await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));

          console.log(
            `✅ Semua messages dengan sessionId=${sessionId} dihapus dari Firestore`
          );
        } catch (err) {
          console.error("Gagal hapus messages dari Firestore:", err);
        }
      }
    },
    [section]
  );

  const filtered = section
    ? items.filter((x) => x.section?.toLowerCase() === section.toLowerCase())
    : items;

  return { items: filtered, add, remove, all: items };
}
