import { getDatasetBlob } from "../utils/fileStore";

export type DataCell = string | number | boolean | null;
export type DataRow = Record<string, DataCell>;

export type InsightArtifacts = {
  manipulator?: { type: string; [k: string]: unknown };
  visualizer?: { type: string; url: string };
  analyzer?: { type: string; value: string };
};

export type InsightResult = {
  answer: string;
  artifacts: InsightArtifacts;
  prompts: {
    manipulator_prompt: string;
    visualizer_prompt: string;
    analyzer_prompt: string;
    compiler_instruction: string;
  };
};

export async function askInsight(
  datasetId: string,
  question: string,
  apiBase: string // ⚡️ biar bisa pakai API_BASE dari frontend
): Promise<InsightResult> {
  const blob = await getDatasetBlob(datasetId);
  if (!blob) throw new Error("File dataset tidak ditemukan di IndexedDB.");

  const kind = sessionStorage.getItem(`ds_file_kind_${datasetId}`) || "csv";
  const mime =
    sessionStorage.getItem(`ds_file_mime_${datasetId}`) ||
    (kind === "parquet" ? "application/octet-stream" : "text/csv");

  const form = new FormData();
  const fileName = kind === "parquet" ? "data.parquet" : "data.csv";
  form.append("file", new File([blob], fileName, { type: mime }));
  form.append("question", question);
  form.append("kind", kind);

  const res = await fetch(`${apiBase}/api/insight-dataset`, {
    method: "POST",
    body: form,
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    data = raw;
  }

  if (!res.ok) {
    const obj = (data ?? {}) as { error?: unknown; message?: unknown };
    const msg =
      (typeof obj.error === "string" && obj.error) ||
      (typeof obj.message === "string" && obj.message) ||
      `HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data as InsightResult;
}
