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
  doc,
  updateDoc,
} from "firebase/firestore";
import { saveChartBlob, getChartBlob } from "../utils/fileStore";

// 🧩 Tambahkan tipe ThinkingStep
export type ThinkingStep = {
  key: string;
  message: string;
};

export type ChatMessage = {
  id?: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
  chartId?: string;
  createdAt?: unknown;
  thinkingSteps?: ThinkingStep[]; // <--- Tambahan penting
};

export async function getDomainDocId(
  domainName: string
): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const q = query(
    collection(db, "users", user.uid, "domains"),
    where("name", "==", domainName)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

// ✅ Simpan chat ke Firestore (termasuk alur berpikir)
export async function saveChatMessage(
  domainDocId: string,
  sessionId: string,
  role: "user" | "assistant",
  text: string,
  chartHtml?: string,
  thinkingSteps?: ThinkingStep[] // <--- parameter baru
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  let chartId: string | undefined;
  if (chartHtml) {
    chartId = `${sessionId}_${Date.now()}`;
    const blob = new Blob([chartHtml], { type: "text/html" });
    await saveChartBlob(chartId, blob);
  }

  const payload: ChatMessage = {
    sessionId,
    role,
    text,
    createdAt: serverTimestamp(),
    ...(chartId ? { chartId } : {}),
    ...(thinkingSteps ? { thinkingSteps } : {}), // <--- simpan thinkingSteps
  };

  await addDoc(
    collection(db, "users", user.uid, "domains", domainDocId, "messages"),
    payload
  );
}

// ✅ Dengarkan perubahan chat + ambil alur berpikir
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

// ✅ Untuk ambil sekali (opsional, tetap support thinkingSteps)
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

export async function updateChatMessage(
  domainDocId: string,
  messageId: string,
  patch: Partial<ChatMessage>
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const ref = doc(
    db,
    "users",
    user.uid,
    "domains",
    domainDocId,
    "messages",
    messageId
  );
  await updateDoc(ref, patch);
}

export async function updateAssistantMessage(
  domainDocId: string,
  messageId: string,
  text: string,
  chartHtml?: string,
  thinkingSteps?: ThinkingStep[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  let chartId: string | undefined;
  if (chartHtml) {
    chartId = `${messageId}_${Date.now()}`;
    const blob = new Blob([chartHtml], { type: "text/html" });
    await saveChartBlob(chartId, blob);
  }

  const ref = doc(
    db,
    "users",
    user.uid,
    "domains",
    domainDocId,
    "messages",
    messageId
  );
  await updateDoc(ref, {
    text,
    ...(chartId ? { chartId } : {}),
    ...(thinkingSteps ? { thinkingSteps } : {}),
    createdAt: serverTimestamp(), // optional: segarkan order
  });
}
