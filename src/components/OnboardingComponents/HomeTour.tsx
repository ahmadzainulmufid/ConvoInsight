import { useState } from "react";
import Joyride from "react-joyride";
import type { Step } from "react-joyride";
import { motion } from "framer-motion";

export default function HomeTour({ onFinish }: { onFinish: () => void }) {
  const [showIntro, setShowIntro] = useState(true);
  const [runTour, setRunTour] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  const steps: Step[] = [
    {
      target: ".home-create-domain",
      content: "Create a new domain to manage datasets.",
      placement: "bottom",
    },
    {
      target: ".home-config-user",
      content: "Go to Configuration User to set your AI provider and API key.",
      placement: "bottom",
    },
    {
      target: ".home-domains",
      content: "Your active domains will appear here.",
      placement: "bottom",
    },
    {
      target: ".home-history",
      content: "This section shows your dashboard and chat history.",
      placement: "top",
    },
    // 🟩 RightSidebar steps
    {
      target: ".right-sidebar-account",
      content: "Manage your account here.",
      placement: "left",
    },
    {
      target: ".right-sidebar-notification",
      content: "View your latest notifications here.",
      placement: "left-start",
    },
    {
      target: ".right-sidebar-help",
      content: "Need help? Click this icon anytime for guidance.",
      placement: "left-end",
    },
  ];

  const handleCallback = (data: { status?: string }) => {
    if (["finished", "skipped"].includes(data.status ?? "")) {
      setRunTour(false);
      setShowFinishModal(true); // ⬅️ Tampilkan modal selesai
    }
  };

  if (showIntro) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
          <h2 className="text-2xl font-bold mb-3">
            🎯 Step 3: Explore Home Dashboard
          </h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            On this page, you can view your created domains, chat history, and
            start using ConvoInsight to analyze your business data.
          </p>
          <button
            onClick={() => {
              setShowIntro(false);
              setRunTour(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
          >
            Got it
          </button>
        </div>
      </motion.div>
    );
  }

  if (showFinishModal) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
          <h2 className="text-2xl font-bold mb-3">🎉 Onboarding Completed!</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            You've completed the main page tour. Now, let's move on to creating
            or opening your first domain.
          </p>
          <button
            onClick={onFinish}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
          >
            Lanjut ke Domain
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous
      showSkipButton
      showProgress
      disableOverlayClose
      disableScrolling
      scrollToFirstStep
      spotlightPadding={8}
      styles={{
        options: {
          zIndex: 10000,
          backgroundColor: "#1E1E1E",
          primaryColor: "#6366F1",
          textColor: "#fff",
          arrowColor: "#1E1E1E",
        },
      }}
      callback={handleCallback}
    />
  );
}
