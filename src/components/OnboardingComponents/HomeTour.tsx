import { useState } from "react";
import { TourProvider, useTour } from "@reactour/tour";
import { motion } from "framer-motion";

function TourSteps() {
  const { setIsOpen } = useTour();
  const [showIntro, setShowIntro] = useState(true);

  if (showIntro) {
    return (
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-[#151923] text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] border border-indigo-500/40 animate-fade-in max-w-lg text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-3">
            🎯 Step 3: Explore Home Dashboard
          </h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            On this page, you can view your created domains, chat history, and
            start using ConvoInsight to analyze your business data.
          </p>
          <button
            onClick={() => {
              setShowIntro(false);
              setIsOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/20 transition"
          >
            Got it
          </button>
        </div>
      </motion.div>
    );
  }

  return null;
}

// 🔹 Komponen kontrol custom (Next, Back, dan tanpa X)
function CustomControls({
  currentStep,
  steps,
  setCurrentStep,
  setIsOpen,
  setShowFinishModal,
}: {
  currentStep: number;
  steps: unknown[];
  setCurrentStep: (n: number) => void;
  setIsOpen: (open: boolean) => void;
  setShowFinishModal: (open: boolean) => void;
}) {
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div className="flex justify-between w-full mt-4">
      <button
        disabled={isFirst}
        onClick={() => setCurrentStep(currentStep - 1)}
        className={`px-4 py-2 rounded-lg border ${
          isFirst
            ? "border-gray-700 text-gray-500 cursor-not-allowed"
            : "border-indigo-500 text-indigo-400 hover:bg-indigo-600/20"
        }`}
      >
        Back
      </button>

      <button
        onClick={() => {
          if (isLast) {
            setIsOpen(false);
            setShowFinishModal(true);
          } else {
            setCurrentStep(currentStep + 1);
          }
        }}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20 transition"
      >
        {isLast ? "Finish" : "Next"}
      </button>
    </div>
  );
}

export default function HomeTour({ onFinish }: { onFinish: () => void }) {
  const [showFinishModal, setShowFinishModal] = useState(false);

  return (
    <TourProvider
      steps={[
        {
          selector: ".home-create-domain",
          content: "Create a new domain to manage datasets.",
        },
        {
          selector: ".home-config-user",
          content:
            "Go to Configuration User to set your AI provider and API key.",
        },
        {
          selector: ".home-domains",
          content: "Your active domains will appear here.",
        },
        {
          selector: ".home-history",
          content: "This section shows your dashboard and chat history.",
        },
        {
          selector: ".right-sidebar-account",
          content: "Manage your account here.",
        },
        {
          selector: ".right-sidebar-notification",
          content: "View your latest notifications here.",
        },
        {
          selector: ".right-sidebar-help",
          content: "Need help? Click this icon anytime for guidance.",
        },
      ]}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#151923",
          color: "#fff",
          border: "1px solid rgba(99,102,241,0.45)",
          boxShadow: "0 20px 50px -12px rgba(0,0,0,0.7)",
          borderRadius: "16px",
          padding: "16px",
        }),
        badge: (base) => ({ ...base, backgroundColor: "#6366F1" }),
      }}
      showCloseButton={false}
      showDots={true}
      showNavigation={true}
      disableInteraction
      disableKeyboardNavigation={["esc"]}
      components={{
        // custom navigasi (Back / Next)
        Navigation: ({ currentStep, steps, setCurrentStep, setIsOpen }) => (
          <CustomControls
            currentStep={currentStep}
            steps={steps}
            setCurrentStep={setCurrentStep}
            setIsOpen={setIsOpen}
            setShowFinishModal={setShowFinishModal}
          />
        ),
      }}
    >
      {showFinishModal ? (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-[#151923] text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] border border-indigo-500/40 animate-fade-in max-w-lg text-center">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              🎉 Onboarding Completed!
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You've completed the main page tour. Now, let's move on to
              creating or opening your first domain.
            </p>
            <button
              onClick={onFinish}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/20 transition"
            >
              Continue to Domain Detail
            </button>
          </div>
        </motion.div>
      ) : (
        <TourSteps />
      )}
    </TourProvider>
  );
}
