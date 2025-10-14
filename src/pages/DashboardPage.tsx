import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiRefreshCw, FiSettings } from "react-icons/fi";
import toast from "react-hot-toast";
import { getDomainDocId, fetchMessagesOnce } from "../service/chatStore";
import { useDashboardSetting } from "../hooks/useDashboardSettings";
import { cleanHtmlResponse } from "../utils/cleanHtmlResponse";
import ManageKpiOutput from "../components/ManageComponents/ManageKpiOutput";

type ExecutionResult = { text: string; chartHtml?: string };
type DashboardItem = {
  id: string;
  type: "chart" | "table" | "kpi";
  prompt?: string;
  includeInsight: boolean;
};
type HydratedDashboardItem = DashboardItem & { result?: ExecutionResult };

export default function DashboardPage() {
  const { section: domain } = useParams();
  const navigate = useNavigate();
  const { group } = useDashboardSetting(domain || "");
  const [domainDocId, setDomainDocId] = useState<string | null>(null);
  const [hydratedItems, setHydratedItems] = useState<
    Record<string, HydratedDashboardItem[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // 🔹 Ambil domainDocId dari Firestore
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        if (!id) {
          toast.error("Domain not found");
          return;
        }
        setDomainDocId(id);
      } catch {
        toast.error("Failed to get domain id");
      }
    })();
  }, [domain]);

  // 🔹 Muat item setiap group dari localStorage + hydrate dari Firestore
  useEffect(() => {
    if (!domainDocId || group.length === 0) return;

    const loadAll = async () => {
      setLoading(true);
      const allItems: Record<string, HydratedDashboardItem[]> = {};

      for (const g of group) {
        const storageKey = `dashboard_items_${g.id}`;
        const raw = localStorage.getItem(storageKey);
        if (!raw) {
          allItems[g.id] = [];
          continue;
        }

        const items: DashboardItem[] = JSON.parse(raw);
        const hydrated = await Promise.all(
          items.map(async (item) => {
            if (!item.prompt) return item;
            try {
              const messages = await fetchMessagesOnce(domainDocId, item.id);
              const assistant = messages.find((m) => m.role === "assistant");
              if (assistant) {
                return {
                  ...item,
                  result: {
                    text:
                      item.type === "kpi" || item.includeInsight
                        ? assistant.text
                        : "",
                    chartHtml: assistant.chartHtml,
                  },
                };
              }
            } catch {
              console.warn("Failed to hydrate item:", item.id);
            }
            return item;
          })
        );
        allItems[g.id] = hydrated;
      }

      setHydratedItems(allItems);
      setLoading(false);
    };

    loadAll();
  }, [domainDocId, group, reloadKey]);

  const handleDashboardSettings = () => {
    navigate(`/domain/${domain}/dashboard/dashboardSetting`);
  };

  const reloadDashboard = () => {
    toast.success("Refreshing dashboard...");
    setReloadKey((prev) => prev + 1);
  };

  return (
    <div className="relative min-h-screen p-6 bg-[#1a1b1e] text-white">
      <h2 className="text-2xl font-bold mb-6">Dashboard {domain}</h2>

      {loading ? (
        <p className="text-gray-400">Loading dashboard...</p>
      ) : group.length === 0 ? (
        <p className="text-gray-400">No dashboard groups yet.</p>
      ) : (
        group.map((g) => {
          // --- LOGIKA PEMISAHAN RENDER KPI DAN ITEM LAIN ---
          const kpiItems =
            hydratedItems[g.id]?.filter((item) => item.type === "kpi") || [];
          const otherItems =
            hydratedItems[g.id]?.filter((item) => item.type !== "kpi") || [];

          return (
            <section key={g.id} className="mb-12">
              <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">
                {g.name}
              </h3>

              {hydratedItems[g.id]?.length === 0 ? (
                <p className="text-gray-500">No items yet.</p>
              ) : (
                <>
                  {/* Render semua KPI dalam satu container flexbox */}
                  {kpiItems.length > 0 && (
                    <div className="flex flex-wrap gap-4 mb-10">
                      {kpiItems.map((item) =>
                        item.result?.text ? (
                          <ManageKpiOutput
                            key={item.id}
                            kpiType="llm"
                            llmResult={item.result.text}
                            prompt={item.prompt}
                            datasets={[]}
                            selectedDatasetIds={[]}
                            selectedColumns={[]}
                          />
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Render item lain (tabel/chart) secara normal (vertikal) */}
                  {otherItems.map((item) => (
                    <div key={item.id} className="space-y-4 mb-10">
                      {item.result?.chartHtml && (
                        <div className="w-full overflow-hidden rounded-lg bg-black/10">
                          <iframe
                            srcDoc={item.result.chartHtml}
                            title={`chart-${item.id}`}
                            className="w-full"
                            style={{ height: "600px", border: "none" }}
                          />
                        </div>
                      )}
                      {item.includeInsight && item.result?.text && (
                        <div
                          className="text-gray-200 leading-relaxed [&_p]:my-2 [&_strong]:font-semibold [&_em]:italic [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2"
                          dangerouslySetInnerHTML={{
                            __html: cleanHtmlResponse(item.result.text),
                          }}
                        />
                      )}
                    </div>
                  ))}
                </>
              )}
            </section>
          );
        })
      )}

      <button
        onClick={reloadDashboard}
        className="fixed top-6 right-16 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow-md transition mr-7"
        title="Refresh Dashboard"
      >
        <FiRefreshCw size={20} className="animate-spin-once" />
      </button>

      <button
        onClick={handleDashboardSettings}
        className="fixed top-6 right-6 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow-md transition"
      >
        <FiSettings size={20} />
      </button>
    </div>
  );
}
