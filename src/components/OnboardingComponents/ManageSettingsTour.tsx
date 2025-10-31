import { motion } from "framer-motion";

export default function ManageSettingsTour({
  onFinish,
}: {
  onFinish: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-[#111216] text-white p-8 rounded-2xl border border-indigo-500 text-center max-w-lg shadow-xl">
        <h2 className="text-2xl font-bold mb-3">🎉 Manage Setting Complete!</h2>

        <p className="text-gray-300 mb-6 leading-relaxed">
          Congratulations! You’ve successfully completed all steps in managing
          your dashboard settings — from adding new items, choosing
          visualization types, to writing prompts for chart generation.
          Everything is now set up for you to generate and explore your insights
          seamlessly!
        </p>

        <button
          onClick={onFinish}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg transition"
        >
          Finish
        </button>
      </div>
    </motion.div>
  );
}
