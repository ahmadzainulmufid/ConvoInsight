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
        className="bg-[#2A2B32] border border-[#3a3b42] rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div className="p-4 border-b border-[#3a3b42] flex justify-between items-center">
          <h2 className="text-lg font-semibold capitalize text-indigo-400">
            {item.type} Detail
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-4 py-3 overflow-y-auto space-y-3">
          {item.prompt && (
            <div>
              <h3 className="font-semibold text-gray-400 mb-1">Prompt</h3>
              <p className="text-gray-200 bg-black/20 p-2 rounded-md text-sm leading-relaxed">
                {item.prompt}
              </p>
            </div>
          )}

          {item.result && (
            <div>
              <h3 className="font-semibold text-gray-400 mb-1">Output</h3>

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
                    <div className="overflow-hidden rounded-md bg-gray-800/20">
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
                      className="text-gray-200 leading-relaxed text-sm [&_p]:my-1 [&_table]:w-full [&_td]:border [&_td]:p-1.5"
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
