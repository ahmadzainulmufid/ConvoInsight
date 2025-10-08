import { motion } from "framer-motion";
import type { HydratedDashboardItem } from "../../pages/ManageSettings";

type Props = {
  item: HydratedDashboardItem | null;
  onClose: () => void;
};

export default function ItemDetailModal({ item, onClose }: Props) {
  if (!item) return null;

  // FUNGSI BARU: Untuk mengubah format bintang menjadi HTML tebal/miring
  const formatMarkdown = (text: string) => {
    if (!text) return "";
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Mengubah **tebal**
      .replace(/\*(.*?)\*/g, "<em>$1</em>"); // Mengubah *miring*
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
        className="bg-[#2A2B32] border border-[#3a3b42] rounded-xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col"
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

        <div className="p-6 overflow-y-auto space-y-4">
          {item.prompt && (
            <div>
              <h3 className="font-semibold text-gray-400 mb-1">Prompt</h3>
              <p className="text-gray-200 bg-black/20 p-3 rounded-md whitespace-pre-wrap">
                {item.prompt}
              </p>
            </div>
          )}

          {item.result && (
            <div>
              <h3 className="font-semibold text-gray-400 mb-2">Output</h3>
              <div className="space-y-4">
                {item.result.chartHtml && (
                  <div className="w-full overflow-hidden rounded-lg bg-gray-800/30">
                    <iframe
                      srcDoc={item.result.chartHtml}
                      title="chart-detail"
                      className="w-full"
                      style={{ height: "500px", border: "none" }}
                    />
                  </div>
                )}
                <div
                  className="text-gray-200 leading-relaxed space-y-2 [&_p]:my-2 [&_table]:w-full [&_td]:border [&_td]:p-2"
                  // DIUBAH: Gunakan fungsi formatMarkdown sebelum menampilkan
                  dangerouslySetInnerHTML={{
                    __html: formatMarkdown(item.result.text),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
