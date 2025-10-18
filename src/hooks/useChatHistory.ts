import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../utils/firebaseSetup";
import {
  getDomainDocId,
  saveChatSession,
  listenChatSessions,
  deleteChatSession,
} from "../service/chatStore";
import { collection, getDocs } from "firebase/firestore";

export type ChatItem = {
  id: string;
  title: string;
  section?: string;
  createdAt: number;
};

export function useChatHistory(section?: string) {
  const [items, setItems] = useState<ChatItem[]>([]);

  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;

      if (section) {
        // 🔹 mode spesifik domain
        const domainDocId = await getDomainDocId(section);
        if (!domainDocId) return;
        const unsub = listenChatSessions(domainDocId, (sessions) => {
          setItems(sessions);
        });
        return () => unsub();
      } else {
        // 🌍 mode global (ambil semua domain user)
        const domainsSnap = await getDocs(
          collection(db, "users", user.uid, "domains")
        );

        const unsubs: (() => void)[] = [];

        for (const d of domainsSnap.docs) {
          const domainDocId = d.id;
          const unsub = listenChatSessions(domainDocId, (sessions) => {
            setItems((prev) => {
              const merged = [
                ...prev.filter((p) => p.section !== d.data().name),
                ...sessions.map((s) => ({ ...s, section: d.data().name })),
              ];
              // urutkan berdasarkan createdAt (desc)
              return merged.sort((a, b) => b.createdAt - a.createdAt);
            });
          });
          unsubs.push(unsub);
        }

        return () => unsubs.forEach((u) => u());
      }
    })();
  }, [section]);

  const add = useCallback(async (item: ChatItem) => {
    const user = auth.currentUser;
    if (!user || !item.section) return;
    const domainDocId = await getDomainDocId(item.section);
    if (!domainDocId) return;
    await saveChatSession(domainDocId, item);
  }, []);

  const remove = useCallback(async (sessionId: string, section?: string) => {
    const user = auth.currentUser;
    if (!user) return;
    const domainDocId = section ? await getDomainDocId(section) : null;
    if (!domainDocId) return;
    await deleteChatSession(domainDocId, sessionId);
  }, []);

  return { items, add, remove, all: items };
}
