import { motion } from "framer-motion";
import type { HydratedDashboardItem } from "../../pages/ManageSettings";
import ManageKpiOutput from "./ManageKpiOutput";

type Props = {
  item: HydratedDashboardItem | null;
  onClose: () => void;
};

export default function ItemDetailModal({ item, onClose }: Props) {
  if (!item) return null;

  const formatMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>");
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[#151923] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 w-full max-w-5xl max-h-[90vh] flex flex-col animate-fade-in"
      >
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-semibold tracking-tight capitalize text-white">
            {item.type} Detail
          </h2>
          <button
            onClick={onClose}
            className="h-9 w-9 grid place-items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-2xl leading-none transition"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-5">
          {item.prompt && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Prompt</h3>
              <p className="text-gray-200 bg-[#0d1017]/70 border border-white/5 px-4 py-3 rounded-xl text-sm leading-relaxed">
                {item.prompt}
              </p>
            </div>
          )}

          {item.result && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Output</h3>

              {item.type === "kpi" ? (
                <ManageKpiOutput
                  kpiType="llm"
                  llmResult={item.result.text}
                  datasets={[]}
                  selectedDatasetIds={[]}
                  selectedColumns={[]}
                />
              ) : (
                <div className="space-y-2">
                  {item.result.chartHtml && (
                    <div className="overflow-hidden rounded-xl bg-black/20">
                      <iframe
                        srcDoc={item.result.chartHtml}
                        title="chart-detail"
                        className="w-full"
                        style={{
                          height: "480px",
                          border: "none",
                          margin: 0,
                          padding: 0,
                        }}
                      />
                    </div>
                  )}
                  {item.result.text && (
                    <div
                      className="text-gray-200 leading-relaxed text-sm [&_p]:my-1 [&_table]:w-full [&_td]:border [&_td]:border-white/10 [&_td]:p-1.5"
                      dangerouslySetInnerHTML={{
                        __html: formatMarkdown(item.result.text),
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
