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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
        <h2 className="text-2xl font-bold mb-3">📊 Dashboard Onboarding</h2>
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
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
        >
          Got it
        </button>
      </div>
    </motion.div>
  );
}
