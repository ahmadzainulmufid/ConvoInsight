// src/service/chatStore.ts
import { auth, db } from "../utils/firebaseSetup";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
} from "firebase/firestore";
import { saveChartBlob, getChartBlob } from "../utils/fileStore"; // pastikan path sesuai

export type ChatMessage = {
  id?: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
  chartId?: string; // 🔑 referensi ke IndexedDB
  createdAt?: unknown;
};

export async function getDomainDocId(
  domainName: string
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  // ambil koleksi domain user
  const q = query(
    collection(db, "users", user.uid, "domains"),
    where("name", "==", domainName)
  );

  const snap = await getDocs(q);
  if (snap.empty) return null;

  // ambil doc pertama yang match
  return snap.docs[0].id;
}

// Simpan chat
export async function saveChatMessage(
  domainDocId: string,
  sessionId: string,
  role: "user" | "assistant",
  text: string,
  chartHtml?: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  let chartId: string | undefined;
  if (chartHtml) {
    chartId = `${sessionId}_${Date.now()}`;
    const blob = new Blob([chartHtml], { type: "text/html" });
    await saveChartBlob(chartId, blob);
  }

  const payload = {
    sessionId,
    role,
    text,
    createdAt: serverTimestamp(),
    ...(chartId ? { chartId } : {}),
  };

  // 🔑 pakai domainDocId langsung
  await addDoc(
    collection(db, "users", user.uid, "domains", domainDocId, "messages"),
    payload
  );
}

export function listenMessages(
  domainDocId: string,
  sessionId: string,
  cb: (msgs: (ChatMessage & { chartHtml?: string })[]) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "users", user.uid, "domains", domainDocId, "messages"),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, async (snap) => {
    const out: (ChatMessage & { chartHtml?: string })[] = [];
    for (const d of snap.docs) {
      const data = d.data() as ChatMessage;
      let chartHtml: string | undefined;
      if (data.chartId) {
        const blob = await getChartBlob(data.chartId);
        if (blob) chartHtml = await blob.text();
      }
      out.push({ id: d.id, ...data, chartHtml });
    }
    cb(out);
  });
}

export async function fetchMessagesOnce(
  domainDocId: string,
  sessionId: string
): Promise<(ChatMessage & { chartHtml?: string })[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "users", user.uid, "domains", domainDocId, "messages"),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  const out: (ChatMessage & { chartHtml?: string })[] = [];
  for (const d of snap.docs) {
    const data = d.data() as ChatMessage;
    let chartHtml: string | undefined;
    if (data.chartId) {
      const blob = await getChartBlob(data.chartId);
      if (blob) chartHtml = await blob.text();
    }
    out.push({ id: d.id, ...data, chartHtml });
  }
  return out;
}
