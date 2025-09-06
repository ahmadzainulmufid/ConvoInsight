// hooks/useDomains.ts (ganti isinya jadi versi Firestore)
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
} from "firebase/firestore";
import { db } from "../utils/firebaseSetup";
import { getAuth, onAuthStateChanged } from "firebase/auth";

export type DomainItem = { id: string; name: string };

const DEFAULT_DOMAINS = ["Campaign", "Fixed", "Mobile"] as const;

export function useDomains(options?: { seedDefaultOnEmpty?: boolean }) {
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  // track user
  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return unsub;
  }, []);

  // live query
  useEffect(() => {
    if (!uid) {
      setDomains([]);
      return;
    }
    const colRef = collection(db, "users", uid, "domains");
    const q = query(colRef, orderBy("createdAt", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const rows: DomainItem[] = snap.docs.map((d) => ({
        id: d.id,
        name: String(d.get("name") ?? ""),
      }));
      setDomains(rows);

      // seeding opsional saat kosong
      if (options?.seedDefaultOnEmpty && rows.length === 0) {
        // seed sekali (tanpa await barengan; biar cepat)
        DEFAULT_DOMAINS.forEach((nm) =>
          addDoc(colRef, {
            name: nm,
            nameLower: nm.toLowerCase(),
            createdAt: serverTimestamp(),
          })
        );
      }
    });
    return unsub;
  }, [uid, options?.seedDefaultOnEmpty]);

  // tambah domain (cegah duplikat case-insensitive)
  const addDomain = useCallback(
    async (name: string) => {
      if (!uid) return { ok: false, reason: "Must login first" };
      const trimmed = name.trim();
      if (!trimmed) return { ok: false, reason: "Name cannot be blank" };

      const colRef = collection(db, "users", uid, "domains");
      const dupQ = query(
        colRef,
        where("nameLower", "==", trimmed.toLowerCase())
      );
      const dupSnap = await getDocs(dupQ);
      if (!dupSnap.empty) return { ok: false, reason: "Domain already exists" };

      await addDoc(colRef, {
        name: trimmed,
        nameLower: trimmed.toLowerCase(),
        createdAt: serverTimestamp(),
      });
      return { ok: true };
    },
    [uid]
  );

  // hapus domain by id
  const removeDomain = useCallback(
    async (id: string) => {
      if (!uid) return { ok: false, reason: "Must login first" };
      const ref = doc(db, "users", uid, "domains", id);
      await deleteDoc(ref);
      return { ok: true };
    },
    [uid]
  );

  return { domains, addDomain, removeDomain, uid };
}
