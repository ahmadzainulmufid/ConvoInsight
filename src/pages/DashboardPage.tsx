import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiSettings } from "react-icons/fi";
import toast from "react-hot-toast";
import { getDomainDocId, fetchMessagesOnce } from "../service/chatStore";
import { useDashboardSetting } from "../hooks/useDashboardSettings";
import { cleanHtmlResponse } from "../utils/cleanHtmlResponse";

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
  const [hydratedGroups, setHydratedGroups] = useState<
    { groupName: string; items: HydratedDashboardItem[] }[]
  >([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!domainDocId || group.length === 0) return;

    const loadAllGroups = async () => {
      setLoading(true);
      const result: { groupName: string; items: HydratedDashboardItem[] }[] =
        [];

      for (const g of group) {
        const storageKey = `dashboard_items_${g.id}`;
        const raw = localStorage.getItem(storageKey);
        if (!raw) continue;

        const items: DashboardItem[] = JSON.parse(raw);
        const hydratedItems: HydratedDashboardItem[] = await Promise.all(
          items.map(async (item) => {
            if (!item.prompt) return item;
            try {
              const messages = await fetchMessagesOnce(domainDocId, item.id);
              const assistant = messages.find((m) => m.role === "assistant");
              if (assistant) {
                return {
                  ...item,
                  result: {
                    text: assistant.text,
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

        result.push({
          groupName: g.name,
          items: hydratedItems,
        });
      }

      setHydratedGroups(result);
      setLoading(false);
    };

    loadAllGroups();
  }, [domainDocId, group]);

  const handleDashboardSettings = () => {
    navigate(`/domain/${domain}/dashboard/dashboardSetting`);
  };

  return (
    <div className="relative min-h-screen p-6 bg-[#1a1b1e] text-white">
      <h2 className="text-2xl font-bold mb-4">Dashboard {domain}</h2>

      {loading ? (
        <p className="text-gray-400">Loading dashboard...</p>
      ) : hydratedGroups.length === 0 ? (
        <p className="text-gray-400">No dashboard groups yet.</p>
      ) : (
        hydratedGroups.map((g) => (
          <section key={g.groupName} className="mb-10">
            <h3 className="text-xl font-semibold mb-4">{g.groupName}</h3>

            {g.items.length === 0 ? (
              <p className="text-gray-500">No items yet.</p>
            ) : (
              g.items.map((item) => (
                <div
                  key={item.id}
                  className="mb-6 p-4 rounded-lg bg-[#2A2B32] border border-[#3a3b42] space-y-4"
                >
                  <h4 className="font-semibold text-lg capitalize">
                    {item.type}
                  </h4>

                  {item.result?.chartHtml && (
                    <div className="overflow-hidden rounded-lg bg-black/20">
                      <iframe
                        srcDoc={item.result.chartHtml}
                        title={`chart-${item.id}`}
                        className="w-full"
                        style={{ height: "400px", border: "none" }}
                      />
                    </div>
                  )}

                  {item.result?.text && (
                    <div
                      className="text-gray-200 leading-relaxed [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-2"
                      dangerouslySetInnerHTML={{
                        __html: cleanHtmlResponse(item.result.text),
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </section>
        ))
      )}

      <button
        onClick={handleDashboardSettings}
        className="fixed top-6 right-6 p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white shadow-md transition"
      >
        <FiSettings size={20} />
      </button>
    </div>
  );
}
