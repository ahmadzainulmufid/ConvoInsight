import { useEffect, useState } from "react";
import KpiCard from "./KpiCard";
import Papa from "papaparse";

type DatasetMeta = { id: string; signed_url?: string };
type DatasetSummary = {
  col: string;
  sum: number;
  avg: number;
  min: number;
  max: number;
  totalRows: number;
};
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
  prompt?: string;
  forceSingleOutput?: boolean; // 👈 PROP BARU DITAMBAHKAN DI SINI
};

// ==================================================================
// 👇 FUNGSI BARU DITAMBAHKAN DI SINI
// Fungsi ini tugasnya hanya untuk memastikan outputnya tunggal.
// ==================================================================
function forceSingleOutputKpi(kpi: ParsedLlmKpi | null): ParsedLlmKpi | null {
  if (!kpi) {
    return null;
  }
  // Buat objek baru dengan subItems yang sudah dikosongkan
  return {
    ...kpi,
    subItems: [],
  };
}

// Fungsi asli Anda, tidak diubah sama sekali
function parseLlmKpi(llm: string, prompt?: string): ParsedLlmKpi | null {
  const cleanLlm = llm
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const genericRegex = /([\w\s().,%#]+?)\s*[:=-]?\s*([\d,.]+)/gi;
  let match;
  const allItems: { label: string; value: string }[] = [];
  while ((match = genericRegex.exec(cleanLlm)) !== null) {
    if (match[1] && match[1].trim().length > 1 && match[2]) {
      allItems.push({ label: match[1].trim(), value: match[2].trim() });
    }
  }

  const itemsToDisplay = allItems.filter(
    (item) => !item.label.toLowerCase().includes("takers")
  );

  if (itemsToDisplay.length === 0) {
    if (allItems.length > 0) {
      return {
        mainTitle: "Info",
        mainValue: "Only 'Takers' found and removed.",
        subItems: [],
      };
    }
    return {
      mainTitle: "Info",
      mainValue: cleanLlm.slice(0, 100) + "...",
      subItems: [],
    };
  }

  if (prompt && prompt.includes("(single)")) {
    const firstItem = itemsToDisplay[0];
    return {
      mainTitle: firstItem.label,
      mainValue: firstItem.value,
      subItems: [],
    };
  }

  const firstItem = itemsToDisplay.shift()!;
  return {
    mainTitle: firstItem.label,
    mainValue: firstItem.value,
    subItems: itemsToDisplay,
  };
}

export default function ManageKpiOutput({
  kpiType,
  datasets,
  selectedDatasetIds,
  selectedColumns,
  llmResult,
  prompt,
  forceSingleOutput,
}: Props) {
  const [datasetKpiData, setDatasetKpiData] = useState<DatasetSummary[]>([]);
  const [llmKpiData, setLlmKpiData] = useState<ParsedLlmKpi | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ==================================================================
    // 👇 FUNGSI processDataset DIPINDAHKAN KE DALAM useEffect
    // Ini adalah pola yang lebih aman dan menghilangkan error.
    // ==================================================================
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
        return {
          col,
          sum,
          avg: values.length ? sum / values.length : 0,
          min: values.length ? Math.min(...values) : 0,
          max: values.length ? Math.max(...values) : 0,
          totalRows: parsed.length,
        };
      });
    }

    (async () => {
      setLoading(true);
      try {
        if (kpiType === "dataset") {
          const summary = await processDataset();
          setDatasetKpiData(summary);
        } else if (llmResult) {
          let parsedData = parseLlmKpi(llmResult, prompt);
          if (forceSingleOutput) {
            parsedData = forceSingleOutputKpi(parsedData);
          }
          setLlmKpiData(parsedData);
        }
      } finally {
        setLoading(false);
      }
    })();
    // ==================================================================
    // 👇 Dependency array diperbarui. Tidak ada lagi warning dari ESLint.
    // ==================================================================
  }, [
    kpiType,
    llmResult,
    prompt,
    forceSingleOutput,
    datasets,
    selectedDatasetIds,
    selectedColumns,
  ]);

  if (loading) return <p className="text-gray-400">Loading KPI...</p>;

  // ... (Bagian render tidak ada yang berubah)
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

  if (kpiType === "llm" && llmKpiData) {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        <KpiCard
          color="blue"
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
