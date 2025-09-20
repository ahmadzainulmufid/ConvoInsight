import { db } from "../utils/firebaseSetup";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { saveChartBlob, getChartBlob } from "../utils/fileStore";

export type ChatMessage = {
  id?: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
  blobId?: string;
  blobUrl?: string;
  createdAt?: unknown;
};

/**
 * Simpan chat message ke Firestore
 */
export async function saveChatMessage(
  userId: string,
  domainId: string,
  sessionId: string,
  role: "user" | "assistant",
  text: string,
  blob?: Blob
) {
  const payload: Omit<ChatMessage, "id" | "blobUrl"> = {
    sessionId,
    role,
    text,
    createdAt: serverTimestamp(),
  };

  if (blob) {
    const blobId = `${sessionId}-${Date.now()}`;
    await saveChartBlob(blobId, blob);
    payload.blobId = blobId;
  }

  // 🔹 simpan di path: users/{userId}/domains/{domainId}/messages
  await addDoc(
    collection(db, "users", userId, "domains", domainId, "messages"),
    payload
  );
}

/**
 * Listen messages di Firestore secara realtime
 */
export function listenMessages(
  userId: string,
  domainId: string,
  _sessionId: string,
  cb: (msgs: ChatMessage[]) => void
) {
  const q = query(
    collection(db, "users", userId, "domains", domainId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, async (snap) => {
    const out: ChatMessage[] = [];
    for (const doc of snap.docs) {
      const data = doc.data() as ChatMessage;
      if (data.blobId) {
        const blob = await getChartBlob(data.blobId);
        if (blob) {
          data.blobUrl = URL.createObjectURL(blob);
        }
      }
      out.push({ id: doc.id, ...data });
    }
    cb(out);
  });
}
