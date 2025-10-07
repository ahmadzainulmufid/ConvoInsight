// src/components/SupportComponents/KPIConfigurator.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import MultiSelectDropdown from "../ChatComponents/MultiSelectDropdown";

/** 🎯 Type Definitions **/
type KPIKey =
  | "active_users"
  | "conversion_rate"
  | "total_revenue"
  | "retention_rate"
  | "avg_session_duration"
  | "ctr"
  | "cpa"
  | `column:${string}`;

type KPIItem = { key: KPIKey; label: string; unit?: string };

type DatasetMeta = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  signed_url?: string;
};

// ✅ Tipe sesuai backend Flask response
type DatasetApiItem = {
  filename: string;
  size?: number;
  updated?: string;
  signed_url?: string;
};

export default function KPIConfigurator({
  section,
}: {
  section: string | null;
}) {
  const kpiLSKey = (section: string | null) =>
    `config_selected_kpis_${section ?? "default"}`;

  const [selectedKpis, setSelectedKpis] = useState<KPIItem[]>(() => {
    const raw = localStorage.getItem(kpiLSKey(section));
    if (!raw) return [];
    try {
      return JSON.parse(raw) as KPIItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(kpiLSKey(section), JSON.stringify(selectedKpis));
  }, [selectedKpis, section]);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [selectedColumn, setSelectedColumn] = useState("");

  /** 🔹 Fetch datasets dari backend **/
  useEffect(() => {
    if (!section) return;
    (async () => {
      try {
        const res = await fetch(
          `https://convoinsight-be-flask-32684464346.asia-southeast2.run.app/domains/${section}/datasets`
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();

        // ✅ Gunakan DatasetApiItem agar tidak any
        const apiDatasets: DatasetApiItem[] = data.datasets ?? [];

        const list: DatasetMeta[] = apiDatasets.map((d) => ({
          id: d.filename,
          name: d.filename,
          size: d.size ?? 0,
          uploadedAt: d.updated
            ? new Date(d.updated).toLocaleDateString()
            : "-",
          signed_url: d.signed_url,
        }));

        setDatasets(list);
      } catch (e) {
        console.error("Failed to fetch datasets", e);
        toast.error("Failed to load datasets");
      }
    })();
  }, [section]);

  /** 🔹 Ambil header dari GCS signed_url **/
  const loadColumns = useCallback(async () => {
    if (!selectedDatasetIds.length) {
      setColumns({});
      return;
    }

    const allCols: Record<string, string[]> = {};

    for (const name of selectedDatasetIds) {
      const dataset = datasets.find((d) => d.name === name || d.id === name);
      if (!dataset) continue;

      try {
        const url = dataset.signed_url;
        if (!url) {
          console.warn(`No signed URL for ${dataset.name}`);
          continue;
        }

        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch ${dataset.name}: ${res.status}`);
          continue;
        }

        const text = await res.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        if (!lines.length) continue;
        const hdrs = lines[0].split(",").map((h) => h.trim());
        allCols[dataset.name || dataset.id] = hdrs;
      } catch (e) {
        console.error(`Failed to read headers for ${dataset.name}:`, e);
      }
    }

    setColumns(allCols);
  }, [selectedDatasetIds, datasets]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  /** 🔹 Flatten column list **/
  const columnOptions = useMemo(() => {
    const combined: { value: string; label: string }[] = [];
    for (const [dsId, cols] of Object.entries(columns)) {
      for (const c of cols) {
        combined.push({
          value: `${dsId}:${c}`,
          label: `${dsId} → ${c}`,
        });
      }
    }
    return combined;
  }, [columns]);

  const datasetOptions = useMemo(
    () => datasets.map((d) => d.name || d.id),
    [datasets]
  );

  /** 🔹 Add KPI **/
  const addKPI = () => {
    if (!selectedColumn) {
      toast("Select column");
      return;
    }
    const key: KPIKey = `column:${selectedColumn}`;
    const label = selectedColumn.split(":").slice(-1)[0];
    const item = { key, label };

    if (selectedKpis.find((k) => k.key === key)) {
      toast("Already added");
      return;
    }

    setSelectedKpis([...selectedKpis, item]);
    toast.success(`Added KPI: ${label}`);
  };

  /** 🧱 UI **/
  return (
    <section className="bg-[#2A2B32] p-4 rounded-lg space-y-4 mt-8">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-medium">KPI Configuration</h2>
        <button
          className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
          onClick={() => setShowAddPanel(!showAddPanel)}
        >
          {showAddPanel ? "Close" : "+ Add KPI"}
        </button>
      </div>

      {/* 🧩 Selected KPI list */}
      <div className="flex flex-wrap gap-2">
        {selectedKpis.map((k) => (
          <span
            key={k.key}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#343541] text-gray-200"
          >
            {k.label}
            <button
              onClick={() =>
                setSelectedKpis((prev) => prev.filter((x) => x.key !== k.key))
              }
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {showAddPanel && (
        <div className="space-y-3">
          <MultiSelectDropdown
            options={datasetOptions}
            selectedOptions={selectedDatasetIds}
            onChange={setSelectedDatasetIds}
            placeholder="Select one or more datasets"
          />

          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="w-full rounded bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white"
            disabled={!columnOptions.length}
          >
            <option value="">Select Column</option>
            {columnOptions.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          <button
            onClick={addKPI}
            className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Add KPI
          </button>
        </div>
      )}
    </section>
  );
}
