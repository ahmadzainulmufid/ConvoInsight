import { useState, useEffect } from "react";
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

/** Format ke koma desimal, 2 desimal untuk non-integer; pertahankan % bila ada */
function toCommaNumber(val: string): string {
  const trimmed = val.trim();
  const hasPct = trimmed.endsWith("%");
  const raw = hasPct ? trimmed.slice(0, -1) : trimmed;

  // normalisasi: jadikan titik sebagai desimal untuk parsing
  // (kalau input sudah "6,35" kita ubah sementara ke "6.35")
  const normalized = raw.replace(/\s/g, "").replace(",", ".");
  const n = Number(normalized);
  if (Number.isNaN(n)) return trimmed; // biarkan apa adanya

  // jika bilangan bulat, jangan paksa 2 desimal
  let out = Math.round(n) === n ? String(Math.trunc(n)) : n.toFixed(2);

  // kembalikan koma sebagai pemisah desimal
  out = out.replace(".", ",");

  return hasPct ? `${out}%` : out;
}

/** Bersihkan noise LLM (code-block, komentar, print, execute_code, dsb) */
function sanitizeLlmText(llm: string): string {
  const withoutBlocks = llm
    // hapus code block ``` ... ```
    .replace(/```[\s\S]*?```/g, " ")
    // hapus tag HTML
    .replace(/<[^>]+>/g, " ");

  const kept = withoutBlocks
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((line) => {
      if (!line) return false;
      if (line.startsWith("#")) return false;
      if (/^print\s*\(/i.test(line)) return false;
      if (/execute_code/i.test(line)) return false;
      if (/^data\s*=/i.test(line)) return false;
      if (/^\[\]$/.test(line)) return false;
      return true;
    })
    .join(" ");

  return kept.replace(/\s{2,}/g, " ").trim();
}

/** Ambil dua pasangan pertama "Label: Value" (value boleh ada % dan desimal ,/. ) */
function parseLlmKpi(llm: string): ParsedLlmKpi[] {
  const cleaned = decodeHtmlEntities(sanitizeLlmText(llm));

  // Cari pasangan "Label: Value"
  const pairRe =
    /([A-Za-z0-9À-ÿ()[\]/._\- ]+?)\s*:\s*([0-9]+(?:[.,][0-9]+)?%?)/g;

  const pairs: { label: string; value: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = pairRe.exec(cleaned)) && pairs.length < 4) {
    const label = (m[1] ?? "").trim();
    const value = (m[2] ?? "").trim();
    if (label && value) {
      pairs.push({ label, value });
    }
  }

  // Jika ketemu minimal dua pasangan → ambil dua pertama
  if (pairs.length >= 2) {
    const a = pairs[0];
    const b = pairs[1];
    return [
      {
        mainTitle: a.label, // label kiri bawah
        mainValue: toCommaNumber(a.value), // angka besar kiri
        subItems: [
          {
            label: b.label, // label kanan bawah
            value: toCommaNumber(b.value), // angka kanan atas
          },
        ],
      },
    ];
  }

  // Fallback: cari dua angka pertama (dengan/ tanpa %)
  const numRe = /([0-9]+(?:[.,][0-9]+)?%?)/g;
  const nums: string[] = [];
  while ((m = numRe.exec(cleaned)) && nums.length < 2) {
    nums.push(m[1]);
  }
  if (nums.length) {
    return [
      {
        mainTitle: "KPI",
        mainValue: toCommaNumber(nums[0]),
        subItems: nums[1]
          ? [{ label: "KPI 2", value: toCommaNumber(nums[1]) }]
          : [],
      },
    ];
  }

  // Kalau tetap tidak ada angka, tampilkan potongan awal teks
  return [
    {
      mainTitle: "Info",
      mainValue: cleaned.slice(0, 80),
      subItems: [],
    },
  ];
}

export default function ManageKpiOutput({
  kpiType,
  datasets,
  selectedDatasetIds,
  selectedColumns,
  llmResult,
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
          setLlmKpiData(parseLlmKpi(llmResult));
        } else {
          setLlmKpiData([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [kpiType, llmResult, datasets, selectedDatasetIds, selectedColumns]);

  if (loading) return <p className="text-gray-400">Loading KPI...</p>;

  // Dataset KPI
  if (kpiType === "dataset") {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        {datasetKpiData.map((k) => (
          <KpiCard
            key={k.col}
            color="blue"
            title={k.col}
            mainValue={toCommaNumber(k.avg.toFixed(2))}
            subItems={[
              { label: "Min", value: toCommaNumber(k.min.toFixed(2)) },
              { label: "Max", value: toCommaNumber(k.max.toFixed(2)) },
              { label: "Rows", value: String(k.totalRows) },
            ]}
          />
        ))}
      </div>
    );
  }

  // LLM KPI
  if (kpiType === "llm" && llmKpiData.length > 0) {
    return (
      <div className="flex flex-wrap gap-4 mt-4">
        {llmKpiData.map((kpi, idx) => (
          <KpiCard
            key={idx}
            title={kpi.mainTitle} // label kiri bawah
            mainValue={kpi.mainValue} // angka besar kiri
            unit={kpi.unit}
            subItems={kpi.subItems} // item pertama ditampilkan kanan atas + label kanan bawah (umumnya)
          />
        ))}
      </div>
    );
  }

  return <p className="text-gray-500">No KPI data to display.</p>;
}
