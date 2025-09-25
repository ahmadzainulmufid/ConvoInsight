import { get, set, del } from "idb-keyval";

const HISTORY_KEY = "prompt_history";

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

export async function getDatasetBlobText(
  dataset: string
): Promise<string | null> {
  const blob = (await get(`ds_blob_${dataset}`)) as Blob | undefined;
  if (!blob) return null;
  return await blob.text();
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

/** ================== HISTORY ================== **/
export interface HistoryItem {
  id: string;
  prompt: string;
  output: string;
  type: string;
}

export async function getHistory(): Promise<HistoryItem[]> {
  return ((await get(HISTORY_KEY)) as HistoryItem[]) || [];
}

export async function saveHistory(items: HistoryItem[]): Promise<void> {
  await set(HISTORY_KEY, items);
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const current = ((await get(HISTORY_KEY)) as HistoryItem[]) || [];
  const filtered = current.filter((h) => h.id !== id);
  await set(HISTORY_KEY, filtered);
}
