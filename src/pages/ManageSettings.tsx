import { useState, useEffect, useCallback, useMemo } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import DashboardGroupOutput from "../components/SupportComponents/ManageGroupOutput";

type DatasetMeta = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  signed_url?: string;
};
type DatasetApiItem = {
  filename: string;
  size?: number;
  updated?: string;
  signed_url?: string;
};

type ItemType = "chart" | "table" | "kpi";
type KPIType = "dataset" | "llm";

export type DashboardItem = {
  id: string;
  type: ItemType;
  prompt?: string;
  datasets?: string[];
  columns?: string[];
  includeInsight: boolean;
};

export default function ManageSettingsPage() {
  const { section: domain } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group") ?? "default";

  /** Step control */
  const [step, setStep] = useState<
    | "list"
    | "select-type"
    | "chart"
    | "table"
    | "kpi-type"
    | "kpi-dataset"
    | "kpi-llm"
  >("list");

  const [itemType, setItemType] = useState<ItemType | null>(null);
  const [kpiType, setKpiType] = useState<KPIType | null>(null);

  const [prompt, setPrompt] = useState("");
  const [includeInsight, setIncludeInsight] = useState(false);

  /** Dataset states */
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  /** Items per group */
  const storageKey = `dashboard_items_${groupId}`;
  const [items, setItems] = useState<DashboardItem[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as DashboardItem[]) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  /** Animation variants */
  const variants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  /** Fetch datasets */
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const res = await fetch(
          `https://convoinsight-be-flask-32684464346.asia-southeast2.run.app/domains/${domain}/datasets`
        );
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();

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
  }, [domain]);

  /** Load columns from CSV */
  const loadColumns = useCallback(async () => {
    if (!selectedDatasetIds.length) {
      setColumns({});
      return;
    }
    const allCols: Record<string, string[]> = {};
    for (const dsId of selectedDatasetIds) {
      const dataset = datasets.find((d) => d.id === dsId);
      if (!dataset?.signed_url) continue;
      try {
        const res = await fetch(dataset.signed_url);
        if (!res.ok) continue;
        const text = await res.text();
        const firstLine = text.split(/\r?\n/).find((l) => l.trim().length);
        if (!firstLine) continue;
        const hdrs = firstLine.split(",").map((h) => h.trim());
        allCols[dsId] = hdrs;
      } catch (e) {
        console.warn("Failed to load header for", dsId, e);
      }
    }
    setColumns(allCols);
  }, [selectedDatasetIds, datasets]);

  useEffect(() => {
    loadColumns();
  }, [loadColumns]);

  const allColumnOptions = useMemo(() => {
    const out: { value: string; label: string }[] = [];
    for (const [ds, cols] of Object.entries(columns)) {
      cols.forEach((c) =>
        out.push({ value: `${ds}:${c}`, label: `${ds} → ${c}` })
      );
    }
    return out;
  }, [columns]);

  /** Reset form */
  const resetForm = () => {
    setItemType(null);
    setKpiType(null);
    setPrompt("");
    setIncludeInsight(false);
    setSelectedDatasetIds([]);
    setSelectedColumns([]);
  };

  const goToStep = (next: typeof step) => {
    if (["select-type", "list"].includes(next)) resetForm();
    setStep(next);
  };

  /** Save item */
  const handleSave = () => {
    if (!itemType) return;
    const newItem: DashboardItem = {
      id: `${Date.now()}`,
      type: itemType,
      prompt: prompt || undefined,
      includeInsight,
      datasets: selectedDatasetIds,
      columns: selectedColumns,
    };
    setItems((prev) => [...prev, newItem]);
    toast.success(`Saved ${itemType}`);
    goToStep("list");
  };

  const handleReorder = (reordered: DashboardItem[]) => setItems(reordered);
  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Item deleted");
  };

  return (
    <div className="p-6 text-white min-h-screen bg-[#1a1b1e]">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Manage Settings</h1>
        <NavLink
          to={`/domain/${domain}/dashboard/dashboardSetting`}
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541]"
        >
          Back to Dashboard Settings
        </NavLink>
      </div>

      <AnimatePresence mode="wait">
        {/* Step list */}
        {step === "list" && (
          <motion.div key="list" {...variants} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Add items to this dashboard group.
            </p>
            <button
              onClick={() => goToStep("select-type")}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 font-medium"
            >
              ➕ Add Item
            </button>
            {items.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No items yet.</p>
            ) : (
              <DashboardGroupOutput
                items={items}
                onReorder={handleReorder}
                onDelete={handleDelete}
              />
            )}
          </motion.div>
        )}

        {/* Step select type */}
        {step === "select-type" && (
          <motion.div key="select-type" {...variants} className="space-y-6">
            <h2 className="text-lg font-semibold">Select Item Type</h2>
            <div className="flex flex-col gap-3">
              {(["chart", "table", "kpi"] as ItemType[]).map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-3 border border-[#3a3b42] px-4 py-2 rounded cursor-pointer ${
                    itemType === t ? "bg-[#2A2B32]" : "hover:bg-[#2A2B32]"
                  }`}
                >
                  <input
                    type="radio"
                    name="itemType"
                    checked={itemType === t}
                    onChange={() => setItemType(t)}
                  />
                  <span className="capitalize">{t}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => goToStep("list")}
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>
              <button
                disabled={!itemType}
                onClick={() =>
                  goToStep(
                    itemType === "kpi"
                      ? "kpi-type"
                      : (itemType as "chart" | "table")
                  )
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {/* Step chart / table */}
        {["chart", "table"].includes(step) && (
          <motion.div key="prompt" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold capitalize">{step} Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Enter prompt for ${step}`}
              rows={4}
              className="w-full rounded bg-[#2A2B32] border border-[#3a3b42] p-3 outline-none"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeInsight}
                onChange={() => setIncludeInsight(!includeInsight)}
              />
              <span className="text-sm text-gray-300">Include Insight</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => goToStep("select-type")}
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>
              <button
                disabled={!prompt.trim()}
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}

        {/* Step KPI type */}
        {step === "kpi-type" && (
          <motion.div key="kpi-type" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold">Select KPI Source</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 border border-[#3a3b42] px-4 py-2 rounded hover:bg-[#2A2B32]">
                <input
                  type="radio"
                  name="kpiType"
                  checked={kpiType === "dataset"}
                  onChange={() => setKpiType("dataset")}
                />
                <span>From Dataset</span>
              </label>
              <label className="flex items-center gap-3 border border-[#3a3b42] px-4 py-2 rounded hover:bg-[#2A2B32]">
                <input
                  type="radio"
                  name="kpiType"
                  checked={kpiType === "llm"}
                  onChange={() => setKpiType("llm")}
                />
                <span>From LLM</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => goToStep("select-type")}
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>
              <button
                disabled={!kpiType}
                onClick={() =>
                  goToStep(kpiType === "dataset" ? "kpi-dataset" : "kpi-llm")
                }
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {/* Step KPI dataset */}
        {step === "kpi-dataset" && (
          <motion.div key="kpi-dataset" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold">Select Dataset & Columns</h2>
            <div className="flex flex-wrap gap-2">
              {datasets.map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center gap-2 bg-[#2A2B32] px-3 py-1 rounded cursor-pointer ${
                    selectedDatasetIds.includes(d.id)
                      ? "ring-2 ring-indigo-500"
                      : "hover:bg-[#343541]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedDatasetIds.includes(d.id)}
                    onChange={() =>
                      setSelectedDatasetIds((prev) =>
                        prev.includes(d.id)
                          ? prev.filter((x) => x !== d.id)
                          : [...prev, d.id]
                      )
                    }
                  />
                  {d.name}
                </label>
              ))}
            </div>

            {Object.keys(columns).length > 0 && (
              <div>
                <p className="text-sm mb-2 text-gray-300">Select Columns:</p>
                <div className="flex flex-wrap gap-2">
                  {allColumnOptions.map((c) => (
                    <label
                      key={c.value}
                      className="flex items-center gap-2 bg-[#2A2B32] px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(c.value)}
                        onChange={() =>
                          setSelectedColumns((prev) =>
                            prev.includes(c.value)
                              ? prev.filter((x) => x !== c.value)
                              : [...prev, c.value]
                          )
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeInsight}
                onChange={() => setIncludeInsight(!includeInsight)}
              />
              <span className="text-sm text-gray-300">Include Insight</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => goToStep("kpi-type")}
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>
              <button
                disabled={
                  selectedDatasetIds.length === 0 ||
                  selectedColumns.length === 0
                }
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}

        {/* Step KPI LLM */}
        {step === "kpi-llm" && (
          <motion.div key="kpi-llm" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold">KPI Prompt</h2>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your KPI prompt"
              rows={4}
              className="w-full rounded bg-[#2A2B32] border border-[#3a3b42] p-3 outline-none"
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeInsight}
                onChange={() => setIncludeInsight(!includeInsight)}
              />
              <span className="text-sm text-gray-300">Include Insight</span>
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => goToStep("kpi-type")}
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>
              <button
                disabled={!prompt.trim()}
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
