// src/components/SupportComponents/KPIConfigurator.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { getDatasetBlob } from "../../utils/fileStore";

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
      return JSON.parse(raw);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(kpiLSKey(section), JSON.stringify(selectedKpis));
  }, [selectedKpis, section]);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState("");

  useEffect(() => {
    const key = section ? `datasets_${section}` : "datasets";
    const raw = localStorage.getItem(key);
    const list: DatasetMeta[] = raw ? JSON.parse(raw) : [];
    setDatasets(list);
  }, [section]);

  const loadColumns = useCallback(async () => {
    if (!selectedDatasetId) return;
    try {
      const blob = await getDatasetBlob(selectedDatasetId);
      if (!blob) {
        toast.error("No file content found");
        return;
      }
      const text = await blob.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
      if (!lines.length) return;
      const hdrs = lines[0].split(",").map((h) => h.trim());
      setColumns(hdrs);
    } catch {
      toast.error("Failed to load headers");
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const datasetOptions = useMemo(
    () => datasets.map((d) => ({ value: d.id, label: d.name })),
    [datasets]
  );

  const columnOptions = useMemo(
    () => columns.map((c) => ({ value: c, label: c })),
    [columns]
  );

  const addKPI = () => {
    if (!selectedDatasetId || !selectedColumn) {
      toast("Select dataset and column");
      return;
    }
    const key: KPIKey = `column:${selectedDatasetId}:${selectedColumn}`;
    const item = { key, label: selectedColumn };
    if (selectedKpis.find((k) => k.key === key)) {
      toast("Already added");
      return;
    }
    setSelectedKpis([...selectedKpis, item]);
    toast.success(`Added KPI: ${selectedColumn}`);
  };

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
          <select
            value={selectedDatasetId}
            onChange={(e) => setSelectedDatasetId(e.target.value)}
            className="w-full rounded bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white"
          >
            <option value="">Select Dataset</option>
            {datasetOptions.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="w-full rounded bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white"
            disabled={!columns.length}
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
