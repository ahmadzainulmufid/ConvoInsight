import { motion } from "framer-motion";

export default function ManageSettingsTour({
  onFinish,
}: {
  onFinish: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="bg-[#151923] text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] border border-indigo-500/40 animate-fade-in max-w-lg text-center shadow-xl">
        <h2 className="text-2xl font-semibold tracking-tight mb-3">🎉 Manage Setting Complete!</h2>

        <p className="text-gray-300 mb-6 leading-relaxed">
          Congratulations! You’ve successfully completed all steps in managing
          your dashboard settings — from adding new items, choosing
          visualization types, to writing prompts for chart generation.
          Everything is now set up for you to generate and explore your insights
          seamlessly!
        </p>

        <button
          onClick={onFinish}
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base transition shadow-lg shadow-indigo-600/20"
        >
          Finish
        </button>
      </div>
    </motion.div>
  );
}
