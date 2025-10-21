// src/service/dashboardStore.ts
import { auth, db } from "../utils/firebaseSetup";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import type { DashboardItem } from "../pages/ManageSettings";

// 👇 Payload yang ditulis ke Firestore (tambahan ownerUid + timestamps)
type DashboardItemFS = DashboardItem & {
  ownerUid: string;
  createdAt: number; // pastikan selalu ada
  updatedAt?: number;
};

const itemsColPath = (uid: string, domainDocId: string, groupId: string) =>
  collection(
    db,
    "users",
    uid,
    "domains",
    domainDocId,
    "group",
    groupId,
    "items"
  );

/**
 * Create/Update dashboard item dan SELALU menulis ownerUid.
 * Rules collectionGroup mengizinkan read hanya bila ownerUid == auth.uid,
 * jadi field ini wajib ada.
 */
export async function upsertDashboardItem(
  domainDocId: string,
  groupId: string,
  item: DashboardItem
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const ref = doc(
    db,
    "users",
    user.uid,
    "domains",
    domainDocId,
    "group",
    groupId,
    "items",
    item.id
  );

  const now = Date.now();

  const payload: DashboardItemFS = {
    ...item,
    ownerUid: user.uid,
    createdAt: item.createdAt ?? now,
    updatedAt: now,
  };

  await setDoc(ref, payload, { merge: true });
}

/**
 * One-shot list (urut createdAt asc)
 */
export async function listDashboardItemsOnce(
  domainDocId: string,
  groupId: string
): Promise<DashboardItem[]> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const qy = query(
    itemsColPath(user.uid, domainDocId, groupId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(qy);
  return snap.docs.map((d) => d.data() as DashboardItem);
}

/**
 * Realtime listener (urut createdAt asc)
 */
export function listenDashboardItems(
  domainDocId: string,
  groupId: string,
  cb: (items: DashboardItem[]) => void
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const qy = query(
    itemsColPath(user.uid, domainDocId, groupId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(qy, (snap) => {
    cb(snap.docs.map((d) => d.data() as DashboardItem));
  });
}

/**
 * Delete item
 */
export async function deleteDashboardItem(
  domainDocId: string,
  groupId: string,
  id: string
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const ref = doc(
    db,
    "users",
    user.uid,
    "domains",
    domainDocId,
    "group",
    groupId,
    "items",
    id
  );
  await deleteDoc(ref);
}

/**
 * Reorder sekaligus memastikan ownerUid ada di setiap item.
 * (Ini membantu "backfill ringan" bila ada item lama.)
 */
export async function reorderDashboardItems(
  domainDocId: string,
  groupId: string,
  orderedIds: string[]
) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");
  const batch = writeBatch(db);
  const now = Date.now();

  orderedIds.forEach((id, idx) => {
    const ref = doc(
      db,
      "users",
      user.uid,
      "domains",
      domainDocId,
      "group",
      groupId,
      "items",
      id
    );
    batch.set(
      ref,
      {
        order: idx,
        updatedAt: now,
        ownerUid: user.uid, // 👈 pastikan selalu terisi
      } as Partial<DashboardItemFS>,
      { merge: true }
    );
  });

  await batch.commit();
}

/**
 * (Opsional) Backfill untuk mengisi ownerUid pada semua item lama milik user aktif.
 * Panggil sekali dari halaman admin/dev bila perlu.
 */
export async function backfillOwnerUidForCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  // List semua domain user
  const domainsSnap = await getDocs(
    collection(db, "users", user.uid, "domains")
  );
  for (const d of domainsSnap.docs) {
    const domainDocId = d.id;

    // List semua group
    const groupsSnap = await getDocs(
      collection(db, "users", user.uid, "domains", domainDocId, "group")
    );

    for (const g of groupsSnap.docs) {
      const itemsSnap = await getDocs(
        collection(
          db,
          "users",
          user.uid,
          "domains",
          domainDocId,
          "group",
          g.id,
          "items"
        )
      );

      const batch = writeBatch(db);
      const now = Date.now();

      itemsSnap.forEach((it) => {
        const ref = doc(
          db,
          "users",
          user.uid,
          "domains",
          domainDocId,
          "group",
          g.id,
          "items",
          it.id
        );

        // merge agar tidak menimpa field lain
        batch.set(
          ref,
          {
            ownerUid: user.uid,
            updatedAt: now,
          } as Partial<DashboardItemFS>,
          { merge: true }
        );
      });

      await batch.commit();
    }
  }
}
