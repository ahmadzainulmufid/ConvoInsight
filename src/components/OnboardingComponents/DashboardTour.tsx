// src/components/OnboardingComponents/DashboardTour.tsx
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function DashboardTour({ onFinish }: { onFinish: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const navigate = useNavigate();

  if (!showIntro) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-[#151923] text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] border border-indigo-500/40 animate-fade-in max-w-lg text-center">
        <h2 className="text-2xl font-semibold tracking-tight mb-3">📊 Dashboard Onboarding</h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Welcome to{" "}
          <span className="text-indigo-400 font-semibold">
            ConvoInsight Dashboard
          </span>
          ! Here you’ll manage groups, add items, and create business insights.
        </p>
        <button
          onClick={() => {
            // ✅ update Firestore flag
            onFinish();

            // ✅ lanjut ke DashboardSetting
            sessionStorage.setItem("startDashboardSettingTour", "true");
            setShowIntro(false);
            navigate("./dashboardSetting");
          }}
          className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/20 transition"
        >
          Got it
        </button>
      </div>
    </motion.div>
  );
}
