import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import useSectionFromPath from "../utils/useSectionFromPath";
import { getDatasetBlob } from "../utils/fileStore";

/** ---------------- Types ---------------- */
type BuiltInKPIKey =
  | "active_users"
  | "conversion_rate"
  | "total_revenue"
  | "retention_rate"
  | "avg_session_duration"
  | "ctr"
  | "cpa";

// Tambahkan pola kustom untuk kolom dataset
type KPIKey = BuiltInKPIKey | `column:${string}`; // e.g. column:<datasetId>:<columnName>

type KPIItem = {
  key: KPIKey;
  label: string;
  unit?: string;
};

type TabKey = "data" | "llm";

type DatasetMeta = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

type DatasetsList = DatasetMeta[];

/** ---------------- Built-in KPI Catalog ---------------- */
const BUILTIN_KPIS: KPIItem[] = [
  { key: "active_users", label: "Active Users" },
  { key: "conversion_rate", label: "Conversion Rate", unit: "%" },
  { key: "total_revenue", label: "Total Revenue", unit: "IDR" },
  { key: "retention_rate", label: "Retention Rate", unit: "%" },
  { key: "avg_session_duration", label: "Avg. Session Duration", unit: "min" },
  { key: "ctr", label: "CTR", unit: "%" },
  { key: "cpa", label: "CPA", unit: "IDR" },
];

/** ---------------- LocalStorage Keys ---------------- */
const kpiLSKey = (section: string | null) =>
  `config_selected_kpis_${section ?? "default"}`;

/** ---------------- Helpers ---------------- */
function classNames(...arr: Array<string | false | undefined>) {
  return arr.filter(Boolean).join(" ");
}

// CSV line split dengan dukungan quote & escaped quote
function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

/** Pemetaan heuristik nama kolom → KPI bawaan */
function mapColumnToBuiltinKPI(column: string): KPIItem | null {
  const n = normalize(column);
  if (["active users", "users_active", "activeusers"].includes(n))
    return { key: "active_users", label: "Active Users" };
  if (["conversion rate", "conv rate", "cr"].includes(n))
    return { key: "conversion_rate", label: "Conversion Rate", unit: "%" };
  if (["revenue", "total revenue", "pendapatan"].includes(n))
    return { key: "total_revenue", label: "Total Revenue", unit: "IDR" };
  if (["retention", "retention rate"].includes(n))
    return { key: "retention_rate", label: "Retention Rate", unit: "%" };
  if (
    [
      "avg session duration",
      "average session duration",
      "session duration",
    ].includes(n)
  )
    return {
      key: "avg_session_duration",
      label: "Avg. Session Duration",
      unit: "min",
    };
  if (["ctr", "click through rate"].includes(n))
    return { key: "ctr", label: "CTR", unit: "%" };
  if (["cpa", "cost per acquisition"].includes(n))
    return { key: "cpa", label: "CPA", unit: "IDR" };
  return null;
}

/** ---------------- Small UI Bits ---------------- */
function Pill({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove?: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2A2B32] text-gray-200 border border-[#3a3b42]">
      {children}
      {onRemove && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-200"
          aria-label="Remove"
          title="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
}) {
  const base =
    "px-3 py-2 rounded-md text-sm transition disabled:opacity-60 disabled:cursor-not-allowed";
  const styles: Record<typeof variant, string> = {
    primary: "bg-indigo-600 hover:bg-indigo-500 text-white",
    secondary:
      "bg-[#2A2B32] hover:bg-[#343541] text-gray-100 border border-[#3a3b42]",
    danger: "bg-rose-600 hover:bg-rose-500 text-white",
    ghost: "bg-transparent hover:bg-[#2A2B32] text-gray-200",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={classNames(base, styles[variant])}
    >
      {children}
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-60"
    >
      <option value="">{placeholder || "Select..."}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** ---------------- LLM Suggestions (mock) ---------------- */
async function fetchLlmSuggestions(): Promise<KPIItem[]> {
  await new Promise((r) => setTimeout(r, 600));
  return [
    { key: "conversion_rate", label: "Conversion Rate", unit: "%" },
    { key: "total_revenue", label: "Total Revenue", unit: "IDR" },
    { key: "retention_rate", label: "Retention Rate", unit: "%" },
  ];
}

/** ---------------- Page ---------------- */
const ConfigurationPage: React.FC = () => {
  const section = useSectionFromPath();

  // selected KPIs (persist per section)
  const [selectedKpis, setSelectedKpis] = useState<KPIItem[]>(() => {
    const raw = localStorage.getItem(kpiLSKey(section));
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as KPIItem[];
      return parsed.filter((x) => !!x?.key && !!x?.label);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(kpiLSKey(section), JSON.stringify(selectedKpis));
  }, [selectedKpis, section]);

  // panels
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("data");

  // ------- From Data (dataset-backed) -------
  const [datasets, setDatasets] = useState<DatasetsList>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>("");
  const [datasetColumns, setDatasetColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Load dataset list for current section
  useEffect(() => {
    const storageKey = section ? `datasets_${section}` : "datasets";
    const raw = localStorage.getItem(storageKey);
    const list: DatasetsList = raw ? JSON.parse(raw) : [];
    setDatasets(list);
  }, [section]);

  // Load columns when dataset changes
  useEffect(() => {
    async function loadColumns() {
      setDatasetColumns([]);
      setSelectedColumn("");
      if (!selectedDatasetId) return;

      setLoadingColumns(true);
      try {
        // ✅ Ambil Blob dari IndexedDB
        const blob = await getDatasetBlob(selectedDatasetId);
        if (!blob) {
          toast.error("File content not found for this dataset.");
          return;
        }

        const kind =
          sessionStorage.getItem(`ds_file_kind_${selectedDatasetId}`) || "csv";
        if (kind !== "csv") {
          toast.error("Only CSV preview is supported for now.");
          return;
        }

        // baca teks CSV
        const text = await blob.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        if (!lines.length) {
          toast("Empty file.");
          return;
        }
        const hdrs = splitCSVLine(lines[0])
          .map((h) => h.trim())
          .filter(Boolean);
        setDatasetColumns(hdrs);
      } catch {
        toast.error("Failed to read CSV headers.");
      } finally {
        setLoadingColumns(false);
      }
    }
    void loadColumns();
  }, [selectedDatasetId]);

  const datasetOptions = useMemo(
    () =>
      datasets.map((d) => ({
        value: d.id,
        label: d.name,
      })),
    [datasets]
  );

  const columnOptions = useMemo(
    () => datasetColumns.map((c) => ({ value: c, label: c })),
    [datasetColumns]
  );

  function addKpiFromDatasetColumn() {
    if (!selectedDatasetId || !selectedColumn) {
      toast("Pick dataset and column first");
      return;
    }
    // coba mapping ke KPI built-in
    const builtin = mapColumnToBuiltinKPI(selectedColumn);
    let newItem: KPIItem;
    if (builtin) {
      newItem = builtin;
    } else {
      // fallback: KPI kustom berbasis kolom dataset
      const key: KPIKey = `column:${selectedDatasetId}:${selectedColumn}`;
      newItem = { key, label: selectedColumn };
    }

    if (selectedKpis.some((k) => k.key === newItem.key)) {
      toast("KPI already added");
      return;
    }
    setSelectedKpis((prev) => [...prev, newItem]);
    toast.success(`Added KPI: ${newItem.label}`);
    // optional: reset pilihan kolom
    setSelectedColumn("");
  }

  // ------- From LLM -------
  const [llmLoading, setLlmLoading] = useState(false);
  const [llmOptions, setLlmOptions] = useState<KPIItem[]>([]);
  const [pickedFromLlm, setPickedFromLlm] = useState("");

  const llmOptionsForSelect = useMemo(
    () =>
      llmOptions
        .filter((x) => !selectedKpis.some((s) => s.key === x.key))
        .map((x) => ({ value: x.key, label: x.label })),
    [llmOptions, selectedKpis]
  );

  async function handleFetchLLM() {
    setLlmLoading(true);
    try {
      const suggestions = await fetchLlmSuggestions();
      setLlmOptions(suggestions);
      if (suggestions.length === 0) toast("No suggestions from LLM");
      else toast.success("LLM suggestions loaded");
    } catch {
      toast.error("Failed to load LLM suggestions");
    } finally {
      setLlmLoading(false);
    }
  }

  function addKpiFromLLM() {
    if (!pickedFromLlm) {
      toast("Pick an LLM KPI first");
      return;
    }
    const found =
      BUILTIN_KPIS.find((x) => x.key === (pickedFromLlm as BuiltInKPIKey)) ??
      llmOptions.find((x) => x.key === (pickedFromLlm as KPIKey));
    if (!found) {
      toast("Invalid KPI");
      return;
    }
    if (selectedKpis.some((k) => k.key === found.key)) {
      toast("KPI already added");
      return;
    }
    setSelectedKpis((prev) => [...prev, found]);
    toast.success(`Added KPI: ${found.label}`);
    setPickedFromLlm("");
  }

  // ------- Remove KPIs -------
  const [showRemovePanel, setShowRemovePanel] = useState(false);
  const [toRemove, setToRemove] = useState<Set<KPIKey>>(new Set());
  function removeSelectedKeys() {
    if (toRemove.size === 0) {
      toast("No KPI selected to remove");
      return;
    }
    setSelectedKpis((prev) => prev.filter((k) => !toRemove.has(k.key)));
    setToRemove(new Set());
    setShowRemovePanel(false);
    toast.success("Removed selected KPIs");
  }

  return (
    <div className="relative min-h-screen flex bg-[#1a1b1e]">
      <main className="flex-1 overflow-y-auto pb-40 px-6 md:px-8 py-6 space-y-8">
        {/* Header */}
        <section className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Configuration Settings
          </h2>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddPanel((s) => !s);
                setShowRemovePanel(false);
              }}
            >
              + Add KPI
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowRemovePanel((s) => !s);
                setShowAddPanel(false);
              }}
            >
              − Remove KPI
            </Button>
          </div>
        </section>

        {/* Selected chips */}
        <section className="space-y-3">
          <p className="text-sm text-gray-300">Selected KPIs</p>
          {selectedKpis.length === 0 ? (
            <div className="text-gray-400 text-sm">
              No KPIs selected yet. Click <b>Add KPI</b> to start.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedKpis.map((k) => (
                <Pill
                  key={k.key}
                  onRemove={() => {
                    setSelectedKpis((prev) =>
                      prev.filter((x) => x.key !== k.key)
                    );
                    toast.success(`Removed: ${k.label}`);
                  }}
                >
                  {k.label}
                </Pill>
              ))}
            </div>
          )}
        </section>

        {/* Add Panel */}
        {showAddPanel && (
          <section className="rounded-xl border border-[#2a2b32] bg-[#232427] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Add KPI</h3>
              <div className="inline-flex rounded-md overflow-hidden border border-[#3a3b42]">
                <button
                  className={classNames(
                    "px-3 py-1 text-sm",
                    activeTab === "data"
                      ? "bg-[#343541] text-white"
                      : "text-gray-300 hover:bg-[#2A2B32]"
                  )}
                  onClick={() => setActiveTab("data")}
                >
                  From Data
                </button>
                <button
                  className={classNames(
                    "px-3 py-1 text-sm",
                    activeTab === "llm"
                      ? "bg-[#343541] text-white"
                      : "text-gray-300 hover:bg-[#2A2B32]"
                  )}
                  onClick={() => setActiveTab("llm")}
                >
                  From LLM
                </button>
              </div>
            </div>

            {/* From Data */}
            {activeTab === "data" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-300">
                  Pick a dataset & column:
                </p>
                <div className="grid gap-3 md:grid-cols-3">
                  <Select
                    value={selectedDatasetId}
                    onChange={setSelectedDatasetId}
                    options={datasetOptions}
                    placeholder={
                      datasets.length ? "Select Dataset" : "No datasets found"
                    }
                    disabled={!datasets.length}
                  />
                  <Select
                    value={selectedColumn}
                    onChange={setSelectedColumn}
                    options={columnOptions}
                    placeholder={
                      loadingColumns ? "Loading columns..." : "Select Column"
                    }
                    disabled={
                      !selectedDatasetId ||
                      loadingColumns ||
                      !datasetColumns.length
                    }
                  />
                  <Button
                    onClick={addKpiFromDatasetColumn}
                    disabled={!selectedDatasetId || !selectedColumn}
                  >
                    Add
                  </Button>
                </div>
                <div className="text-xs text-gray-400">
                  Tips: kolom yang namanya mirip{" "}
                  <i>“active users, revenue, conversion rate”</i> otomatis
                  dipetakan ke KPI bawaan. Selain itu akan ditambahkan sebagai
                  KPI kustom berbasis kolom.
                </div>
              </div>
            )}

            {/* From LLM */}
            {activeTab === "llm" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-300 flex-1">
                    Fetch suggested KPIs from LLM, then select one to add.
                  </p>
                  <Button
                    variant="secondary"
                    onClick={handleFetchLLM}
                    disabled={llmLoading}
                  >
                    {llmLoading ? "Loading..." : "Get Suggestions"}
                  </Button>
                </div>
                <div className="grid md:grid-cols-[1fr_auto] gap-3">
                  <Select
                    value={pickedFromLlm}
                    onChange={setPickedFromLlm}
                    options={llmOptionsForSelect}
                    placeholder={
                      llmOptions.length === 0
                        ? "Fetch suggestions first"
                        : "Select KPI"
                    }
                    disabled={llmOptions.length === 0}
                  />
                  <Button onClick={addKpiFromLLM} disabled={!llmOptions.length}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Remove Panel */}
        {showRemovePanel && (
          <section className="rounded-xl border border-[#2a2b32] bg-[#232427] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium">Remove KPI</h3>
            </div>
            {selectedKpis.length === 0 ? (
              <div className="text-gray-400 text-sm">
                No KPIs to remove. Add some first.
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  {selectedKpis.map((k) => {
                    const checked = toRemove.has(k.key);
                    return (
                      <label
                        key={k.key}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#2A2B32] text-gray-200"
                      >
                        <input
                          type="checkbox"
                          className="accent-indigo-500"
                          checked={checked}
                          onChange={(e) => {
                            setToRemove((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(k.key);
                              else next.delete(k.key);
                              return next;
                            });
                          }}
                        />
                        <span>{k.label}</span>
                      </label>
                    );
                  })}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => setShowRemovePanel(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={removeSelectedKeys}>
                    Remove Selected
                  </Button>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
};

export default ConfigurationPage;
