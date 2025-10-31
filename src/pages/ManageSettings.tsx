import { useState, useEffect, useCallback, useMemo } from "react";
import { NavLink, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

import DashboardGroupOutput from "../components/ManageComponents/ManageGroupOutput";
import ItemDetailModal from "../components/ManageComponents/ItemDetailModal";
import ManageKpiOutput from "../components/ManageComponents/ManageKpiOutput";

import { queryDomain } from "../utils/queryDomain";
import { cleanHtmlResponse } from "../utils/cleanHtmlResponse";
import { fetchChartHtml } from "../utils/fetchChart";

import {
  getDomainDocId,
  saveChatMessage,
  fetchMessagesOnce,
} from "../service/chatStore";

import {
  listenDashboardItems,
  upsertDashboardItem,
  deleteDashboardItem as fsDeleteItem,
  reorderDashboardItems,
} from "../service/dashboardStore";

import { auth, db } from "../utils/firebaseSetup";
import { addNotification } from "../service/notificationStore";
import ManageSettingsTour from "../components/OnboardingComponents/ManageSettingsTour";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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
  createdAt?: number;
  order?: number;
};

type ExecutionResult = { text: string; chartHtml?: string };

export type HydratedDashboardItem = DashboardItem & {
  result?: ExecutionResult;
};

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

export default function ManageSettings() {
  const { section: domain } = useParams();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get("group") ?? "default";

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

  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[]>([]);
  const [columns, setColumns] = useState<Record<string, string[]>>({});
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  const [domainDocId, setDomainDocId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] =
    useState<ExecutionResult | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const [viewingItem, setViewingItem] = useState<HydratedDashboardItem | null>(
    null
  );

  const uid = auth.currentUser?.uid;
  const storageKey = uid
    ? `dashboard_items_${uid}_${groupId}`
    : `dashboard_items_${groupId}`;

  const [items, setItems] = useState<DashboardItem[]>([]);
  const [hydratedItems, setHydratedItems] = useState<HydratedDashboardItem[]>(
    []
  );
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const variants = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
  };

  // resolve domainDocId
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        if (!id) {
          toast.error(`Domain "${domain}" not found in database.`);
        }
        setDomainDocId(id);
      } catch {
        toast.error("Failed to verify domain.");
      }
    })();
  }, [domain]);

  // datasets list (for KPI-dataset)
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/domains/${domain}/datasets`);
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
      } catch {
        toast.error("Failed to load datasets");
      }
    })();
  }, [domain]);

  // load columns from signed URLs
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

  const resetForm = () => {
    setItemType(null);
    setKpiType(null);
    setPrompt("");
    setIncludeInsight(false);
    setSelectedDatasetIds([]);
    setSelectedColumns([]);
    setExecutionResult(null);
    setCurrentSessionId(null);
  };
  const goToStep = (next: typeof step) => {
    if (["select-type", "list"].includes(next)) resetForm();
    setStep(next);
  };

  // 🔁 realtime items from Firestore (cross-browser)
  useEffect(() => {
    if (!domainDocId) return;
    const unsub = listenDashboardItems(domainDocId, groupId, (remote) => {
      // urutkan kalau ada field order, fallback ke createdAt
      const sorted = [...remote].sort((a, b) => {
        const ao = (a.order ?? 0) - (b.order ?? 0);
        if (ao !== 0) return ao;
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });
      setItems(sorted);
    });
    return () => unsub();
  }, [domainDocId, groupId]);

  // 🧹 migrate once from localStorage -> Firestore (if any leftovers)
  useEffect(() => {
    if (!domainDocId) return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const cached: DashboardItem[] = JSON.parse(raw);
      if (cached.length) {
        cached.forEach((it, idx) =>
          upsertDashboardItem(domainDocId, groupId, { ...it, order: idx })
        );
      }
      localStorage.removeItem(storageKey);
    } catch {
      /* empty */
    }
  }, [domainDocId, groupId, storageKey]);

  // hydrate items (fetch assistant message + chart fallback from chartUrl)
  useEffect(() => {
    if (!domainDocId) {
      setHydratedItems(items);
      setIsLoadingItems(false);
      return;
    }
    (async () => {
      setIsLoadingItems(true);
      const enriched: HydratedDashboardItem[] = await Promise.all(
        items.map(async (item) => {
          if (!item.prompt) return item;
          try {
            const messages = await fetchMessagesOnce(domainDocId, item.id);
            const assistantMessage = messages.find(
              (m) => m.role === "assistant"
            );
            if (assistantMessage) {
              let chartHtml = assistantMessage.chartHtml;
              if (!chartHtml && assistantMessage.chartUrl) {
                try {
                  chartHtml = await fetchChartHtml(
                    API_BASE,
                    assistantMessage.chartUrl
                  );
                } catch {
                  /* empty */
                }
              }
              return {
                ...item,
                result: {
                  text:
                    item.type === "kpi" || item.includeInsight
                      ? assistantMessage.text
                      : "",
                  chartHtml,
                },
              };
            }
          } catch (error) {
            console.error(`Gagal mengambil hasil untuk item ${item.id}`, error);
          }
          return item;
        })
      );
      setHydratedItems(enriched);
      setIsLoadingItems(false);
    })();
  }, [items, domainDocId]);

  const [showTour, setShowTour] = useState(false);

  // 🧭 check onboarding flag
  useEffect(() => {
    const checkTour = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      // ✅ tampilkan ManageSettingsTour jika DashboardSettingTour sudah selesai tapi ManageSettingsTour belum
      if (data.hasSeenDashboardSettingTour && !data.hasSeenManageSettingsTour) {
        setTimeout(() => setShowTour(true), 500);
      }
    };
    checkTour();
  }, []);

  // ✅ Fungsi untuk menyelesaikan tour
  const handleFinishTour = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { hasSeenManageSettingsTour: true });
    setShowTour(false);
  };

  // execute prompt
  const handleExecutePrompt = async () => {
    if (!prompt.trim() || !domain || !domainDocId) {
      toast.error("Prompt and domain must be valid.");
      return;
    }
    setIsExecuting(true);
    setExecutionResult(null);
    const sessionId = `${Date.now()}`;
    setCurrentSessionId(sessionId);
    try {
      await saveChatMessage(domainDocId, sessionId, "user", prompt);

      const res = await queryDomain({
        apiBase: API_BASE,
        domain,
        prompt:
          itemType === "kpi"
            ? `${prompt}. Only return key numeric KPIs for example target, takers, and take-up rate as plain text. Do not explain anything. Just provide the value and the value name. Do not return chart, table, or Plotly output.`
            : prompt,
        sessionId,
        dataset: selectedDatasetIds.length > 0 ? selectedDatasetIds : undefined,
        includeInsight,
      });

      // ambil metadata chart remote agar lintas browser
      const chartUrlFromBE =
        res.chart_url ||
        res.diagram_signed_url ||
        res.diagram_public_url ||
        null;
      const diagramKind = res.diagram_kind ?? null;
      const diagramPath = res.diagram_gs_uri ?? null;

      // preview chart untuk modal saat ini
      let chartHtml: string | undefined;
      if (chartUrlFromBE) {
        try {
          chartHtml =
            (await fetchChartHtml(API_BASE, chartUrlFromBE)) || undefined;
        } catch {
          /* empty */
        }
      }

      const assistantResponse = cleanHtmlResponse(
        res.response ?? "(empty response)"
      );

      await saveChatMessage(
        domainDocId,
        sessionId,
        "assistant",
        assistantResponse,
        chartHtml, // simpan blob lokal agar cepat di browser ini
        undefined, // thinkingSteps
        chartUrlFromBE, // ⬅️ simpan URL remote utk browser lain
        diagramKind,
        diagramPath
      );

      setExecutionResult({ text: assistantResponse, chartHtml });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred.";
      toast.error(`Error: ${errorMessage}`);
      setExecutionResult({
        text: `<p>⚠️ <strong>Error:</strong> ${errorMessage}</p>`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  // save items
  const handleSaveItem = async () => {
    if (!itemType || !currentSessionId) {
      toast.error("Cannot save. No execution data found.");
      return;
    }
    if (!domainDocId) return;
    const newItem: DashboardItem = {
      id: currentSessionId,
      type: itemType,
      prompt: prompt,
      includeInsight,
      datasets: selectedDatasetIds,
      columns: selectedColumns,
      createdAt: Date.now(),
      order: items?.length ?? 0,
    };
    await upsertDashboardItem(domainDocId, groupId, newItem);

    // 🆕 Tambah notifikasi
    await addNotification(
      "insight",
      "New Dashboard Item Added",
      `A new ${itemType} was added to your dashboard group "${groupId}".`
    );

    toast.success(`Saved ${itemType} to dashboard.`);
    goToStep("list");
  };

  const handleSaveKpiDataset = async () => {
    if (!domainDocId) return;
    const newItem: DashboardItem = {
      id: `${Date.now()}`,
      type: "kpi",
      includeInsight,
      datasets: selectedDatasetIds,
      columns: selectedColumns,
      createdAt: Date.now(),
      order: items?.length ?? 0,
    };
    await upsertDashboardItem(domainDocId, groupId, newItem);

    // 🆕 Tambah notifikasi
    await addNotification(
      "dataset",
      "New KPI from Dataset",
      `A new KPI has been added from dataset(s): ${selectedDatasetIds.join(
        ", "
      )}.`
    );

    toast.success("Saved KPI from dataset");
    goToStep("list");
  };

  const handleReorder = async (reordered: DashboardItem[]) => {
    if (!domainDocId) return;
    await reorderDashboardItems(
      domainDocId,
      groupId,
      reordered.map((i) => i.id)
    );
    // local visual order
    setItems(reordered.map((it, idx) => ({ ...it, order: idx })));
  };

  const handleDelete = async (id: string) => {
    if (!domainDocId) return;
    await fsDeleteItem(domainDocId, groupId, id);
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

            {isLoadingItems ? (
              <p className="text-gray-400 text-sm italic">Loading items...</p>
            ) : items.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No items yet.</p>
            ) : (
              <DashboardGroupOutput
                items={hydratedItems}
                onReorder={handleReorder}
                onDelete={handleDelete}
                onViewItem={(item) => setViewingItem(item)}
              />
            )}
          </motion.div>
        )}

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

        {["chart", "table", "kpi-llm"].includes(step) && (
          <motion.div key="prompt-step" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold capitalize">
              {itemType} Prompt
            </h2>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Enter prompt for ${itemType}`}
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
                onClick={() =>
                  goToStep(itemType === "kpi" ? "kpi-type" : "select-type")
                }
                className="px-4 py-2 bg-white/10 rounded"
              >
                Back
              </button>

              <button
                disabled={!prompt.trim() || isExecuting}
                onClick={handleExecutePrompt}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded disabled:opacity-50"
              >
                {isExecuting
                  ? "Executing..."
                  : executionResult
                  ? "Re-execute"
                  : "Execute"}
              </button>

              {executionResult && (
                <button
                  onClick={handleSaveItem}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
                >
                  Save Item
                </button>
              )}
            </div>

            <div className="mt-6">
              {isExecuting && (
                <div className="text-center text-gray-400">
                  <p>Executing prompt...</p>
                </div>
              )}

              {executionResult && (
                <div className="p-4 border border-gray-700 rounded-lg bg-black/20 space-y-4">
                  <h3 className="font-semibold text-gray-300">Output:</h3>

                  {executionResult.chartHtml && (
                    <div className="w-full overflow-hidden rounded-xl bg-gray-800/30">
                      <iframe
                        srcDoc={executionResult.chartHtml}
                        title="chart-preview"
                        className="w-full"
                        style={{ height: "500px", border: "none" }}
                      />
                    </div>
                  )}

                  {includeInsight && executionResult.text && (
                    <div
                      className="text-gray-200 leading-relaxed space-y-2 [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-2"
                      dangerouslySetInnerHTML={{ __html: executionResult.text }}
                    />
                  )}

                  {itemType === "kpi" && kpiType && (
                    <div className="mt-6">
                      <h3 className="font-semibold mb-2 text-gray-300">
                        KPI Preview
                      </h3>
                      <ManageKpiOutput
                        kpiType={kpiType}
                        datasets={datasets}
                        selectedDatasetIds={selectedDatasetIds}
                        selectedColumns={selectedColumns}
                        llmResult={executionResult.text}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

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
                onClick={handleSaveKpiDataset}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}

        {showTour && <ManageSettingsTour onFinish={handleFinishTour} />}

        <AnimatePresence>
          {viewingItem && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ItemDetailModal
                item={viewingItem}
                onClose={() => setViewingItem(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
