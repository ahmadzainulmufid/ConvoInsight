import { getDatasetBlob } from "../utils/fileStore";
import type { PlotData, Layout, Config } from "plotly.js";

export type DataCell = string | number | boolean | null;
export type DataRow = Record<string, DataCell>;

export type PlotlySpec = {
  data: PlotData[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
};

export type ChartItem =
  | {
      title: string;
      data_uri: string; // gambar statis dari backend (matplotlib)
      plotly?: PlotlySpec; // opsional: kalau backend kirim spesifikasi plotly juga
    }
  | {
      title: string;
      plotly: PlotlySpec; // native plotly
      data_uri?: string; // opsional fallback image
    };

export type AskResult = {
  sql: string;
  columns: string[];
  rows: DataRow[];
  answer: string;
  analysis?: string;
  charts?: ChartItem[];
  error?: string;
};

// ---------------- type guards util ----------------
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isDataRowArray = (v: unknown): v is DataRow[] =>
  Array.isArray(v) && v.every((x) => isObject(x));

const isPlotDataArray = (v: unknown): v is PlotData[] =>
  Array.isArray(v) && v.every((x) => isObject(x));

const isPlotlySpec = (v: unknown): v is PlotlySpec => {
  if (!isObject(v)) return false;
  if (!("data" in v) || !isPlotDataArray((v as Record<string, unknown>).data))
    return false;
  // layout & config opsional, tapi jika ada harus object
  const layoutOk =
    !("layout" in v) || isObject((v as Record<string, unknown>).layout);
  const configOk =
    !("config" in v) || isObject((v as Record<string, unknown>).config);
  return layoutOk && configOk;
};

const isChartItem = (v: unknown): v is ChartItem => {
  if (!isObject(v) || typeof v.title !== "string") return false;

  const hasDataUri = "data_uri" in v && typeof v.data_uri === "string";
  const hasPlotly = "plotly" in v && isPlotlySpec(v.plotly);

  // Salah satu harus ada; kalau ada dua juga valid
  return hasDataUri || hasPlotly;
};

const isChartItemArray = (v: unknown): v is ChartItem[] =>
  Array.isArray(v) && v.every((x) => isChartItem(x));

const isAskResult = (v: unknown): v is AskResult => {
  if (!isObject(v)) return false;
  if (typeof v.sql !== "string") return false;
  if (!isStringArray(v.columns)) return false;
  if (!isDataRowArray(v.rows)) return false;
  if (typeof v.answer !== "string") return false;
  if ("analysis" in v && typeof v.analysis !== "string") return false;
  if ("charts" in v && !isChartItemArray(v.charts)) return false;
  if ("error" in v && typeof v.error !== "string") return false;
  return true;
};

// ---------------- error shapes ----------------
type ApiErrorString = { error: string };
type ApiErrorObj = { error: { message?: string } };
type ApiMessage = { message: string };

const isApiErrorString = (v: unknown): v is ApiErrorString =>
  isObject(v) && typeof v.error === "string";

const isApiErrorObj = (v: unknown): v is ApiErrorObj =>
  isObject(v) &&
  "error" in v &&
  isObject(v.error) &&
  (!("message" in (v.error as Record<string, unknown>)) ||
    typeof (v.error as Record<string, unknown>).message === "string");

const isApiMessage = (v: unknown): v is ApiMessage =>
  isObject(v) && typeof v.message === "string";

// ---------------- main API ----------------
export async function askDataset(
  datasetId: string,
  question: string
): Promise<AskResult> {
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

  const res = await fetch("http://localhost:5000/api/ask-dataset", {
    method: "POST",
    body: form,
  });

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    let msg: string | undefined;
    if (isApiErrorObj(data)) {
      msg = data.error.message;
    } else if (isApiErrorString(data)) {
      msg = data.error;
    } else if (isApiMessage(data)) {
      msg = data.message;
    }
    throw new Error(msg ?? `HTTP ${res.status}`);
  }

  if (!isAskResult(data)) {
    throw new Error("Unexpected API shape for AskResult.");
  }

  return data;
}
