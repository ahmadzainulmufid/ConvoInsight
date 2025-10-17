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
};

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

// Fungsi asli Anda, tidak diubah sama sekali
function parseLlmKpi(llm: string): ParsedLlmKpi[] {
  const cleanLlm = decodeHtmlEntities(
    llm
      .replace(/<[^>]+>/g, "")
      .replace(/\s+\n/g, "\n")
      .trim()
  );

  const lines = cleanLlm
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const regex = /([^:]+?):\s*([\d.,N/A]+%?)/g;
  const group: ParsedLlmKpi[] = [];

  const formatValue = (val: string): string => {
    if (!val || val.includes(",") || val.includes(".") || val.includes("%"))
      return val;
    if (/^\d+$/.test(val) && val.length > 3) {
      const asNumber = parseFloat(val);
      const formatted = (asNumber / 1000).toFixed(2).replace(".", ",");
      return formatted;
    }
    return val;
  };

  for (const line of lines) {
    if (!line.includes(":")) continue;
    const matches = [...line.matchAll(regex)];
    if (matches.length > 0) {
      const [first, ...rest] = matches;

      const label = first[1]?.trim();
      const value = formatValue(first[2]?.trim() || "");

      const subItems = rest.map((m) => ({
        label: m[1]?.trim(),
        value: formatValue(m[2]?.trim() || ""),
      }));

      group.push({
        mainTitle: label,
        mainValue: value,
        subItems,
      });
    }
  }

  if (group.length === 0) {
    return [
      {
        mainTitle: "Info",
        mainValue: cleanLlm.slice(0, 80),
        subItems: [],
      },
    ];
  }

  return group;
}

export default function ManageKpiOutput({
  kpiType,
  datasets,
  selectedDatasetIds,
  selectedColumns,
  llmResult,
  prompt,
}: Props) {
  const [datasetKpiData, setDatasetKpiData] = useState<DatasetSummary[]>([]);
  const [llmKpiData, setLlmKpiData] = useState<ParsedLlmKpi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
          const parsedArray = parseLlmKpi(llmResult);
          setLlmKpiData(parsedArray);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [
    kpiType,
    llmResult,
    prompt,
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

  if (kpiType === "llm" && llmKpiData.length > 0) {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        {llmKpiData.map((kpi, idx) => (
          <KpiCard
            key={idx}
            title={kpi.mainTitle}
            mainValue={kpi.mainValue}
            unit={kpi.unit}
            subItems={kpi.subItems}
          />
        ))}
      </div>
    );
  }

  return <p className="text-gray-500">No KPI data to display.</p>;
}
