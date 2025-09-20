import { get, set, del } from "idb-keyval";

/** ================== DATASET BLOBS ================== **/
export async function saveDatasetBlob(id: string, blob: Blob): Promise<void> {
  await set(`ds_blob_${id}`, blob);
}

export async function getDatasetBlob(id: string): Promise<Blob | undefined> {
  return (await get(`ds_blob_${id}`)) as Blob | undefined;
}

export async function deleteDatasetBlob(id: string): Promise<void> {
  await del(`ds_blob_${id}`);
}

/** ================== CHART BLOBS ================== **/
export async function saveChartBlob(id: string, blob: Blob): Promise<void> {
  await set(`chart_blob_${id}`, blob);
}

export async function getChartBlob(id: string): Promise<Blob | undefined> {
  return (await get(`chart_blob_${id}`)) as Blob | undefined;
}

export async function deleteChartBlob(id: string): Promise<void> {
  await del(`chart_blob_${id}`);
}
