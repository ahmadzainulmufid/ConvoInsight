import { useEffect, useState } from "react";
import Papa from "papaparse";
import KpiCard from "./KpiCard";

// Tipe data yang tidak berubah
type DatasetMeta = { id: string; signed_url?: string };
type DatasetSummary = {
  col: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  totalRows: number;
};

// ✨ TIPE BARU untuk hasil parsing LLM yang lebih terstruktur
type ParsedLlmKpi = {
  mainTitle?: string;
  mainValue: string;
  unit?: string;
  subItems: { label: string; value: string }[];
};

type Props = {
  kpiType: "dataset" | "llm";
  datasets: DatasetMeta[];
  selectedDatasetIds: string[];
  selectedColumns: string[];
  llmResult?: string;
};

// 🌟 FUNGSI PARSING BARU YANG LEBIH BAIK
function parseLlmKpi(llm: string): ParsedLlmKpi | null {
  const clean = llm
    .replace(/<[^>]+>/g, "") // Hapus tag HTML
    .replace(/\s+/g, " ") // Normalisasi spasi
    .trim();

  // Regex untuk menangkap pola seperti "Label: 123.45 Unit" atau "Label 123.45"
  const regex = /([\w\s().,%]+?)\s*[:=-]?\s*([\d,.]+)\s*(\w+)?/gi;
  let match;
  const items: { label: string; value: string }[] = [];

  while ((match = regex.exec(clean)) !== null) {
    const label = match[1].trim();
    const value = match[2].trim();
    if (label.toLowerCase() !== "info") {
      // Abaikan label "info"
      items.push({ label, value });
    }
  }

  if (items.length === 0) {
    // Fallback jika tidak ada yang cocok
    return {
      mainTitle: "Info",
      mainValue: clean.slice(0, 100) + "...",
      subItems: [],
    };
  }

  // Ambil item pertama sebagai nilai utama
  const firstItem = items.shift()!;

  return {
    mainTitle: firstItem.label,
    mainValue: firstItem.value,
    subItems: items, // Sisa item menjadi sub-item
  };
}

export default function ManageKpiOutput({
  kpiType,
  datasets,
  selectedDatasetIds,
  selectedColumns,
  llmResult,
}: Props) {
  // State diubah untuk menyimpan tipe data baru
  const [datasetKpiData, setDatasetKpiData] = useState<DatasetSummary[]>([]);
  const [llmKpiData, setLlmKpiData] = useState<ParsedLlmKpi | null>(null);
  const [loading, setLoading] = useState(true);

  // Fungsi processDataset tetap sama, tidak perlu diubah
  // ... (kode processDataset dari file asli Anda bisa ditaruh di sini)
  async function processDataset(): Promise<DatasetSummary[]> {
    const ds = datasets.find((d) => selectedDatasetIds.includes(d.id));
    if (!ds?.signed_url) return [];

    const res = await fetch(ds.signed_url);
    const text = await res.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
    }).data;

    if (!parsed.length) return [];

    const numericCols = selectedColumns
      .map((c) => c.split(":")[1])
      .filter(Boolean);

    return numericCols.map((col) => {
      const values = parsed
        .map((r) => parseFloat(r[col] || ""))
        .filter((v) => !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length ? sum / values.length : 0;
      const min = values.length ? Math.min(...values) : 0;
      const max = values.length ? Math.max(...values) : 0;
      return { col, sum, avg, min, max, totalRows: parsed.length };
    });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (kpiType === "dataset") {
          const summary = await processDataset();
          setDatasetKpiData(summary);
        } else if (llmResult) {
          const parsed = parseLlmKpi(llmResult);
          setLlmKpiData(parsed);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kpiType, datasets, selectedDatasetIds, selectedColumns, llmResult]);

  if (loading) return <p className="text-gray-400">Loading KPI...</p>;

  // Render Dataset KPI (tidak berubah)
  if (kpiType === "dataset") {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        {datasetKpiData.map((k) => (
          <KpiCard
            key={k.col}
            color="blue"
            title={k.col}
            mainValue={k.avg.toFixed(2)}
            subItems={[
              { label: "Min", value: k.min.toFixed(1) },
              { label: "Max", value: k.max.toFixed(1) },
              { label: "Rows", value: k.totalRows.toString() },
            ]}
          />
        ))}
      </div>
    );
  }

  // ✨ RENDER BARU UNTUK LLM KPI - MENJADI SATU KARTU
  if (kpiType === "llm" && llmKpiData) {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        <KpiCard
          color="red"
          title={llmKpiData.mainTitle}
          mainValue={llmKpiData.mainValue}
          unit={llmKpiData.unit}
          subItems={llmKpiData.subItems}
        />
      </div>
    );
  }

  return <p className="text-gray-500">No KPI data to display.</p>;
}
