import { useCallback, useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../utils/firebaseSetup";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export type GroupItem = { id: string; name: string };

export function useDashboardSetting(
  domainDocId: string,
  options?: { seedDefaultOnEmpty?: boolean }
) {
  const [group, setGroup] = useState<GroupItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  // track user
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  // live query group
  useEffect(() => {
    if (!uid || !domainDocId) {
      setGroup([]);
      return;
    }
    const colRef = collection(
      db,
      "users",
      uid,
      "domains",
      domainDocId,
      "group"
    );
    // urut berdasarkan field "order"
    const q = query(colRef, orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: GroupItem[] = snap.docs.map((d) => ({
        id: d.id,
        name: String(d.get("name") ?? ""),
      }));
      setGroup(rows);
    });
    return unsub;
  }, [uid, domainDocId, options?.seedDefaultOnEmpty]);

  const addGroup = useCallback(
    async (name: string) => {
      if (!uid) return { ok: false, reason: "Must login first" };
      if (!domainDocId) return { ok: false, reason: "Missing domainDocId" };
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, reason: "Name cannot be blank" };

      const colRef = collection(
        db,
        "users",
        uid,
        "domains",
        domainDocId,
        "group"
      );
      // cek duplikat
      const dupQ = query(
        colRef,
        where("nameLower", "==", trimmed.toLowerCase())
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) return { ok: false, reason: "Group already exists" };

      // hitung order = jumlah group saat ini
      const countSnap = await getDocs(colRef);
      const order = countSnap.size;

      await addDoc(colRef, {
        name: trimmed,
        nameLower: trimmed.toLowerCase(),
        createdAt: serverTimestamp(),
        order,
      });
      return { ok: true };
    },
    [uid, domainDocId]
  );

  const removeGroup = useCallback(
    async (id: string) => {
      if (!uid) return { ok: false, reason: "Must login first" };
      if (!domainDocId) return { ok: false, reason: "Missing domainDocId" };
      const ref = doc(db, "users", uid, "domains", domainDocId, "group", id);
      await deleteDoc(ref);
      return { ok: true };
    },
    [uid, domainDocId]
  );

  const updateGroupOrder = useCallback(
    async (orderedIds: string[]) => {
      if (!uid) return { ok: false, reason: "Must login first" };
      if (!domainDocId) return { ok: false, reason: "Missing domainDocId" };

      try {
        await Promise.all(
          orderedIds.map((id, idx) =>
            updateDoc(
              doc(db, "users", uid, "domains", domainDocId, "group", id),
              { order: idx }
            )
          )
        );
        return { ok: true };
      } catch (err: unknown) {
        if (err instanceof Error) {
          console.error("Failed to update order", err.message);
          return { ok: false, reason: err.message };
        }
        console.error("Failed to update order", err);
        return { ok: false, reason: "Unknown error" };
      }
    },
    [uid, domainDocId]
  );

  return { group, addGroup, removeGroup, updateGroupOrder, uid };
}
