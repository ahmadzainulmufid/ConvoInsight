import React, { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  getHistory,
  saveHistory,
  deleteHistoryItem,
  type HistoryItem,
} from "../utils/fileStore";
import { v4 as uuidv4 } from "uuid";

type Step = "prompt" | "output" | "type";

const ManageSettingsPage: React.FC = () => {
  const { section: domainDocId } = useParams();
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("prompt");
  const [selectedType, setSelectedType] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setOutput(`Execution result output: ${prompt}`);
    setStep("output");
  };

  const handleNext = () => setStep("type");

  const handleCancel = () => {
    setPrompt("");
    setOutput(null);
    setSelectedType("");
    setStep("prompt");
  };

  const handleSave = async () => {
    if (!selectedType) {
      toast.error("Please select a type before saving");
      return;
    }

    const newItem: HistoryItem = {
      id: uuidv4(),
      prompt,
      output: output || "",
      type: selectedType,
    };

    const updated = [...history, newItem];
    setHistory(updated);
    await saveHistory(updated);

    toast.success(`Saved with type: ${selectedType}`);

    setPrompt("");
    setOutput(null);
    setSelectedType("");
    setStep("prompt");
  };

  const handleDelete = async (id: string) => {
    const updated = history.filter((h) => h.id !== id);
    setHistory(updated);
    await deleteHistoryItem(id);
    toast.success("History item deleted");
  };

  const variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  };

  return (
    <div className="p-6 text-white space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Prompting User Settings</h1>
        <NavLink
          to={`/domain/${domainDocId}/dashboard/dashboardSetting`}
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Dashboard
        </NavLink>
      </header>

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
              {[
                "Take a tour convoinsight",
                "Create Dashboard",
                "Chat Analytics",
              ].map((opt) => (
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
              ))}
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

      {/* History Section */}
      {history.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">History</h2>
          {history.map((h) => (
            <div
              key={h.id}
              className="bg-[#2A2B32] p-4 rounded-lg space-y-2 border border-[#3a3b42]"
            >
              <p>
                <span className="font-semibold">Prompt:</span> {h.prompt}
              </p>
              <p>
                <span className="font-semibold">Output:</span> {h.output}
              </p>
              <p>
                <span className="font-semibold">Type:</span> {h.type}
              </p>
              <button
                onClick={() => handleDelete(h.id)}
                className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageSettingsPage;
