// src/services/chatStore.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Timestamp,
  writeBatch,
  QueryConstraint,
  FirestoreError,
} from "firebase/firestore";
import { db } from "../utils/firebaseSetup";
import type { AskResult, DataRow } from "../utils/askDataset";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  analysis?: string;
  charts?: AskResult["charts"];
  preview?: { columns: string[]; rows: DataRow[] };
  createdAt?: Timestamp;
};

export type Conversation = {
  id: string;
  title: string;
  section?: string | null;
  datasetId?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  ownerUid?: string | null;
};

// Helper: guard uid
function assertUid(uid: string | null | undefined): asserts uid is string {
  if (!uid) throw new Error("UID kosong. Pastikan user sudah login.");
}

function userConversationsCol(uid: string) {
  return collection(db, "users", uid, "conversations");
}

function conversationDoc(uid: string, convId: string) {
  return doc(db, "users", uid, "conversations", convId);
}

function messagesCol(uid: string, convId: string) {
  return collection(db, "users", uid, "conversations", convId, "messages");
}

// --- CRUD conversations ---
export async function createConversation(
  uid: string | null | undefined,
  input: {
    title: string;
    section?: string | null;
    datasetId?: string | null;
  }
): Promise<string> {
  assertUid(uid);
  const ref = doc(userConversationsCol(uid)); // custom id
  await setDoc(ref, {
    title: input.title,
    section: input.section ?? null,
    datasetId: input.datasetId ?? null,
    ownerUid: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function loadConversationMeta(
  uid: string | null | undefined,
  id: string
): Promise<Conversation | null> {
  assertUid(uid);
  const snap = await getDoc(conversationDoc(uid, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Conversation, "id">) };
}

export async function updateConversationMeta(
  uid: string | null | undefined,
  id: string,
  patch: Partial<Omit<Conversation, "id">>
) {
  assertUid(uid);
  await updateDoc(conversationDoc(uid, id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteConversation(
  uid: string | null | undefined,
  id: string
) {
  assertUid(uid);
  // hapus semua messages dulu (batched)
  const mcol = messagesCol(uid, id);
  const ss = await getDocs(mcol);
  const batch = writeBatch(db);
  ss.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(conversationDoc(uid, id));
  await batch.commit();
}

// --- Listing conversations ---
export async function listConversations(
  uid: string | null | undefined,
  section?: string | null
): Promise<Conversation[]> {
  assertUid(uid);
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc")];
  if (section) constraints.unshift(where("section", "==", section));
  const q = query(userConversationsCol(uid), ...constraints);
  const ss = await getDocs(q);
  return ss.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Conversation, "id">),
  }));
}

// Realtime listener untuk conversations (HistorySidebar)
export function listenConversations(
  uid: string | null | undefined,
  section: string | null | undefined,
  cb: (rows: Conversation[]) => void,
  onError?: (err: FirestoreError) => void
) {
  assertUid(uid);
  const constraints: QueryConstraint[] = [orderBy("updatedAt", "desc")];
  if (section) constraints.unshift(where("section", "==", section));
  const q = query(userConversationsCol(uid), ...constraints);
  return onSnapshot(
    q,
    (ss) => {
      const rows: Conversation[] = ss.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Conversation, "id">),
      }));
      cb(rows);
    },
    (err) => {
      console.error("[listenConversations] onSnapshot error:", err);
      onError?.(err);
    }
  );
}

// --- Messages ---
export async function appendMessage(
  uid: string | null | undefined,
  convId: string,
  msg: ChatMessage
) {
  assertUid(uid);
  const mcol = messagesCol(uid, convId);
  await addDoc(mcol, { ...msg, createdAt: serverTimestamp() });
  await updateConversationMeta(uid, convId, {}); // bump updatedAt
}

export function listenMessages(
  uid: string | null | undefined,
  convId: string,
  cb: (messages: ChatMessage[]) => void,
  onError?: (err: FirestoreError) => void
) {
  assertUid(uid);
  const mcol = messagesCol(uid, convId);
  const q = query(mcol, orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (ss) => {
      const out: ChatMessage[] = ss.docs.map((d) => d.data() as ChatMessage);
      cb(out);
    },
    (err) => {
      console.error("[listenMessages] onSnapshot error:", err);
      onError?.(err);
    }
  );
}
