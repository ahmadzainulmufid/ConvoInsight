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
        const res = await fetch(`${API_BASE}/datasets?domain=${domain}`);
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
    if (!selectedDatasetIds.length || !domain) {
      setColumns({});
      return;
    }

    const allCols: Record<string, string[]> = {};

    for (const dsId of selectedDatasetIds) {
      try {
        // ✅ Ambil header langsung dari API (bukan signed_url)
        const encodedId = encodeURIComponent(dsId);
        const res = await fetch(`${API_BASE}/datasets/${domain}/${encodedId}`);
        if (!res.ok) continue;

        const data = await res.json();
        const records = data.records || [];
        if (records.length === 0) continue;

        const headers = Object.keys(records[0]);
        allCols[dsId] = headers;
      } catch (err) {
        console.warn("Failed to load columns for", dsId, err);
      }
    }

    setColumns(allCols);
  }, [selectedDatasetIds, domain]);

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

    // Ambil konfigurasi user
    const storedConfig = localStorage.getItem("user_config");
    const userConfig = storedConfig ? JSON.parse(storedConfig) : null;

    if (
      !userConfig ||
      !userConfig.provider ||
      !userConfig.selectedModel ||
      !auth.currentUser?.uid
    ) {
      toast.error(
        "AI configuration not found. Please save your API Key on the Configuration page."
      );
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    const sessionId = `${Date.now()}`;
    setCurrentSessionId(sessionId);

    try {
      // Simpan pesan user
      await saveChatMessage(domainDocId, sessionId, "user", prompt);

      // Panggil backend /query
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
        provider: userConfig.provider,
        model: userConfig.selectedModel,
        apiKey: undefined,
        userId: auth.currentUser?.uid,
      });

      // Ambil chart URL
      const chartUrl =
        res.diagram_signed_url ||
        res.diagram_public_url ||
        res.chart_url ||
        null;

      // Ambil chart HTML (jika ada)
      let chartHtml: string | undefined;
      if (chartUrl) {
        try {
          chartHtml = await fetchChartHtml(API_BASE, chartUrl);
        } catch {
          chartHtml = undefined;
        }
      }

      // Bersihkan teks response dari backend
      const cleanedResponse = cleanHtmlResponse(res.response ?? "(empty)");

      // Simpan pesan asisten ke Firestore
      await saveChatMessage(
        domainDocId,
        sessionId,
        "assistant",
        cleanedResponse,
        chartHtml,
        undefined,
        chartUrl,
        res.diagram_kind ?? null,
        res.diagram_gs_uri ?? null
      );

      // Tampilkan hasil langsung di UI
      setExecutionResult({
        text: cleanedResponse,
        chartHtml,
      });

      // Tambahkan notifikasi sukses
      await addNotification(
        "insight",
        "Insight Generated",
        "Your AI insight and chart have been generated successfully!"
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Error executing prompt: ${errorMsg}`);
      setExecutionResult({
        text: `<p>⚠️ <strong>Error:</strong> ${errorMsg}</p>`,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteKpiDataset = async () => {
    if (
      !domainDocId ||
      selectedDatasetIds.length === 0 ||
      selectedColumns.length === 0
    ) {
      toast.error("Please select at least one dataset and column.");
      return;
    }

    // Ambil konfigurasi user (provider + model)
    const storedConfig = localStorage.getItem("user_config");
    const userConfig = storedConfig ? JSON.parse(storedConfig) : null;
    if (
      !userConfig ||
      !userConfig.provider ||
      !userConfig.selectedModel ||
      !auth.currentUser?.uid
    ) {
      toast.error(
        "AI configuration not found. Please save your API Key on the Configuration page."
      );
      return;
    }

    // Build prompt otomatis
    const prompt = `
  From the datasets available for domain ${domain}, compute these KPIs:
  ${selectedColumns.map((c) => `- ${c.split(":")[1]}`).join("\n")}
  Return exactly one line with the format:
  Target WL (Mn): <value>, TUR: <value>%
  
  Formatting rules:
  - Use comma as decimal separator (example: 6,35)
  - No thousands separator (example: 84000)
  - Round to 2 decimals for non-integer numbers
  - If a KPI cannot be derived, write N/A
  - Output only the line, no explanations or text.
  `;

    setIsExecuting(true);
    setExecutionResult(null);
    const sessionId = `${Date.now()}`;
    setCurrentSessionId(sessionId);

    try {
      const res = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt,
        sessionId,
        dataset: selectedDatasetIds,
        includeInsight: false,
        provider: userConfig.provider,
        model: userConfig.selectedModel,
        apiKey: undefined,
        userId: auth.currentUser?.uid,
      });

      const cleanedResponse = cleanHtmlResponse(res.response || "(empty)");

      // Simpan ke Firestore agar histori tetap tersimpan
      await saveChatMessage(domainDocId, sessionId, "user", prompt);
      await saveChatMessage(
        domainDocId,
        sessionId,
        "assistant",
        cleanedResponse
      );

      // Tampilkan hasil di UI
      setExecutionResult({ text: cleanedResponse });
      toast.success("KPI generated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      toast.error(`Error executing KPI: ${msg}`);
      setExecutionResult({ text: `<p>⚠️ <strong>Error:</strong> ${msg}</p>` });
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

  // const handleSaveKpiDataset = async () => {
  //   if (!domainDocId) return;
  //   const prompt = `
  //   From the datasets available for domain ${domain}, compute these KPIs:
  //   ${selectedColumns.map((c) => `- ${c.split(":")[1]}`).join("\n")}
  //   Return exactly one line with format: KPI_NAME: <value>, etc.
  //   `;

  //   const newItem: DashboardItem = {
  //     id: `${Date.now()}`,
  //     type: "kpi",
  //     prompt,
  //     includeInsight: true,
  //     datasets: selectedDatasetIds,
  //     columns: selectedColumns,
  //     createdAt: Date.now(),
  //     order: items?.length ?? 0,
  //   };
  //   await upsertDashboardItem(domainDocId, groupId, newItem);
  //   toast.success("Generated KPI from dataset");

  //   // 🆕 Tambah notifikasi
  //   await addNotification(
  //     "dataset",
  //     "New KPI from Dataset",
  //     `A new KPI has been added from dataset(s): ${selectedDatasetIds.join(
  //       ", "
  //     )}.`
  //   );

  //   toast.success("Saved KPI from dataset");
  //   goToStep("list");
  // };

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
    <div className="max-w-5xl mx-auto p-6 md:p-10 text-white min-h-screen">
      <div className="flex items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Manage Settings</h1>
        <NavLink
          to={`/domain/${domain}/dashboard/dashboardSetting`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition"
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
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-sm font-medium shadow-lg shadow-indigo-600/20 transition"
            >
              ➕ Add Item
            </button>

            {isLoadingItems ? (
              <p className="text-gray-500 text-sm py-8 text-center rounded-2xl border border-dashed border-white/10">
                Loading items...
              </p>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-sm py-8 text-center rounded-2xl border border-dashed border-white/10">
                No items yet.
              </p>
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
            <h2 className="text-lg font-semibold tracking-tight">Select Item Type</h2>
            <div className="flex flex-col gap-3">
              {(["chart", "table", "kpi"] as ItemType[]).map((t) => (
                <label
                  key={t}
                  className={`flex items-center gap-3 border px-4 py-3.5 rounded-xl cursor-pointer transition accent-indigo-500 ${
                    itemType === t
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-white/10 bg-[#151923] hover:bg-[#1b2030]"
                  }`}
                >
                  <input
                    type="radio"
                    name="itemType"
                    checked={itemType === t}
                    onChange={() => setItemType(t)}
                  />
                  <span className="capitalize font-medium">{t}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => goToStep("list")}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10 text-gray-200 transition"
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
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {["chart", "table", "kpi-llm"].includes(step) && (
          <motion.div key="prompt-step" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold tracking-tight capitalize">
              {itemType} Prompt
            </h2>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Enter prompt for ${itemType}`}
              rows={4}
              className="w-full rounded-xl bg-[#151923] border border-white/10 px-4 py-3 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
            />

            <label className="flex items-center gap-2 accent-indigo-500 cursor-pointer">
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
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10 text-gray-200 transition"
              >
                Back
              </button>

              <button
                disabled={!prompt.trim() || isExecuting}
                onClick={handleExecutePrompt}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200 bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30 hover:bg-indigo-500/20 transition disabled:opacity-50"
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
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition"
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
                <div className="p-5 border border-white/5 rounded-2xl bg-[#151923] space-y-4 shadow-[var(--shadow-card)]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Output:</h3>

                  {executionResult.chartHtml && (
                    <div className="w-full overflow-hidden rounded-xl bg-black/20">
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
                      className="text-gray-300 leading-relaxed space-y-2 [&_p]:my-2 [&_strong]:text-white [&_table]:w-full [&_td]:border [&_td]:border-white/10 [&_td]:p-2"
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
            <h2 className="text-lg font-semibold tracking-tight">Select KPI Source</h2>
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 border border-white/10 bg-[#151923] px-4 py-3.5 rounded-xl hover:bg-[#1b2030] cursor-pointer accent-indigo-500 transition">
                <input
                  type="radio"
                  name="kpiType"
                  checked={kpiType === "dataset"}
                  onChange={() => setKpiType("dataset")}
                />
                <span>From Dataset</span>
              </label>
              <label className="flex items-center gap-3 border border-white/10 bg-[#151923] px-4 py-3.5 rounded-xl hover:bg-[#1b2030] cursor-pointer accent-indigo-500 transition">
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
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10 text-gray-200 transition"
              >
                Back
              </button>
              <button
                disabled={!kpiType}
                onClick={() =>
                  goToStep(kpiType === "dataset" ? "kpi-dataset" : "kpi-llm")
                }
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition"
              >
                Next
              </button>
            </div>
          </motion.div>
        )}

        {step === "kpi-dataset" && (
          <motion.div key="kpi-dataset" {...variants} className="space-y-5">
            <h2 className="text-lg font-semibold tracking-tight">Select Dataset & Columns</h2>

            <div className="flex flex-wrap gap-2">
              {datasets.map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm cursor-pointer border transition accent-indigo-500 ${
                    selectedDatasetIds.includes(d.id)
                      ? "border-indigo-500/50 bg-indigo-500/10 text-white"
                      : "border-white/10 bg-[#151923] hover:bg-[#1b2030]"
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
                <p className="text-sm font-medium mb-2 text-gray-300">Select Columns:</p>
                <div className="flex flex-wrap gap-2">
                  {allColumnOptions.map((c) => (
                    <label
                      key={c.value}
                      className="flex items-center gap-2 bg-[#151923] border border-white/10 px-3 py-1.5 rounded-lg text-sm accent-indigo-500"
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
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10 text-gray-200 transition"
              >
                Back
              </button>

              <button
                disabled={
                  selectedDatasetIds.length === 0 ||
                  selectedColumns.length === 0 ||
                  isExecuting
                }
                onClick={handleExecuteKpiDataset}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200 bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/30 hover:bg-indigo-500/20 transition disabled:opacity-50"
              >
                {isExecuting ? "Executing..." : "Execute"}
              </button>
            </div>

            {/* ✅ Pindahkan output ke luar flex agar tidak error dan lebih rapi */}
            {executionResult?.text && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-300 mb-3">Output:</h3>
                <ManageKpiOutput
                  kpiType="llm"
                  datasets={datasets}
                  selectedDatasetIds={selectedDatasetIds}
                  selectedColumns={selectedColumns}
                  llmResult={executionResult.text}
                />
              </div>
            )}
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
