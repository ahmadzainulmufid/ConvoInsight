import React, { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const ManageSettingsPage: React.FC = () => {
  const { section: domainDocId } = useParams();
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [step, setStep] = useState<"prompt" | "output" | "type">("prompt");
  const [selectedType, setSelectedType] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setOutput(`Output hasil eksekusi: ${prompt}`);
    setStep("output");
  };

  const handleNext = () => setStep("type");

  const handleCancel = () => {
    setPrompt("");
    setOutput(null);
    setSelectedType("");
    setStep("prompt");
  };

  const handleSave = () => {
    if (!selectedType) {
      toast.error("Please select a type before saving");
      return;
    }
    toast.success(`Saved with type: ${selectedType}`);
    setPrompt("");
    setOutput(null);
    setSelectedType("");
    setStep("prompt");
  };

  // Animasi masuk/keluar tiap step
  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="p-6 text-white space-y-6">
      {/* Header utama */}
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Prompting User Settings</h1>
        <NavLink
          to={`/domain/${domainDocId}/dashboard/dashboardSetting`}
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Dashboard
        </NavLink>
      </header>

      <p className="mt-2 text-gray-300">
        Please enter prompting according to your dashboard needs.
      </p>

      <AnimatePresence mode="wait">
        {step === "prompt" && (
          <motion.form
            key="prompt"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            onSubmit={handleSubmit}
            className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
          >
            <label className="block text-sm text-gray-300">New Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="mis. Program Summary, Trend Daily, Daily Transaction Achievement"
              rows={4}
              className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Execute
            </button>
          </motion.form>
        )}

        {step === "output" && output && (
          <motion.div
            key="output"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
          >
            <label className="block text-sm text-gray-300">Output</label>
            <textarea
              value={output}
              readOnly
              rows={4}
              className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none"
            />
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              Next
            </button>
          </motion.div>
        )}

        {step === "type" && (
          <motion.div
            key="type"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
          >
            <label className="block text-sm text-gray-300">
              Select Prompting Type
            </label>
            <div className="space-y-2">
              {["Summary", "Trend Analysis", "Transaction Achievement"].map(
                (opt) => (
                  <label key={opt} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="promptType"
                      value={opt}
                      checked={selectedType === opt}
                      onChange={(e) => setSelectedType(e.target.value)}
                    />
                    {opt}
                  </label>
                )
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              >
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ManageSettingsPage;
