import { get, set, del } from "idb-keyval";

/** Simpan Blob dataset ke IndexedDB */
export async function saveDatasetBlob(id: string, blob: Blob): Promise<void> {
  await set(`ds_blob_${id}`, blob);
}

/** Ambil Blob dataset dari IndexedDB */
export async function getDatasetBlob(id: string): Promise<Blob | undefined> {
  return (await get(`ds_blob_${id}`)) as Blob | undefined;
}

/** Hapus Blob dataset dari IndexedDB */
export async function deleteDatasetBlob(id: string): Promise<void> {
  await del(`ds_blob_${id}`);
}
