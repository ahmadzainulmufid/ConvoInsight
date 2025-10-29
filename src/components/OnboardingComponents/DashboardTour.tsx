import { useState } from "react";
import { TourProvider, useTour, type StepType } from "@reactour/tour";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

// 🟣 Custom Controls
function CustomControls({
  currentStep,
  steps,
  setCurrentStep,
  setShowFinishModal,
}: {
  currentStep: number;
  steps: StepType[];
  setCurrentStep: (n: number) => void;
  setShowFinishModal: (open: boolean) => void;
}) {
  const { setIsOpen } = useTour();
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    // ✅ Kalau di step terakhir (Step 4), langsung selesai
    if (isLast) {
      setIsOpen(false);
      setShowFinishModal(true);
      return;
    }

    // ✅ Kalau belum terakhir, lanjut ke step berikutnya
    setCurrentStep(currentStep + 1);

    // 🚫 Hapus logika lama step 3
    if (currentStep === 2) {
      sessionStorage.setItem("dashboardStep3Done", "true");
      setIsOpen(false);
    }
  };

  const handleBack = () => {
    if (!isFirst) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex justify-between w-full mt-4">
      <button
        disabled={isFirst}
        onClick={handleBack}
        className={`px-4 py-2 rounded-lg border ${
          isFirst
            ? "border-gray-700 text-gray-500 cursor-not-allowed"
            : "border-indigo-500 text-indigo-400 hover:bg-indigo-600/20"
        }`}
      >
        Back
      </button>
      <button
        onClick={handleNext}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
      >
        {isLast ? "Finish" : "Next"}
      </button>
    </div>
  );
}

// 🟡 Intro “Got it”
function DashboardIntro() {
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
        <h2 className="text-2xl font-bold mb-3">
          📊 Step 7: Dashboard Onboarding
        </h2>
        <p className="text-gray-300 mb-6 leading-relaxed">
          Welcome to{" "}
          <span className="text-indigo-400 font-semibold">
            ConvoInsight Dashboard
          </span>
          ! Here you’ll learn how to create groups, add items, and generate
          insights.
        </p>
        <button
          onClick={() => {
            sessionStorage.setItem("startDashboardTour", "true");
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

// 🧩 Logic (kosong)
function TourLogic() {
  return null;
}

// 🟢 Komponen Utama
export default function DashboardTour({
  onFinish,
  autoStart = false,
  isContinuingTour = false,
}: {
  onFinish: () => void;
  autoStart?: boolean;
  isContinuingTour?: boolean;
}) {
  const [showFinishModal, setShowFinishModal] = useState(false);
  const isContinue = isContinuingTour;
  const startStep = isContinue ? 3 : 0; // Step 4 kalau lanjut

  const steps: StepType[] = [
    {
      selector: ".dashboard-group-name",
      content: "Step 1: Enter a name for your dashboard group here.",
    },
    {
      selector: ".dashboard-create-btn",
      content: "Step 2: Click this button to create your new group.",
    },
    {
      selector: ".dashboard-group-list",
      content:
        "Step 3: Here you can manage your dashboard groups. After this, create one manually!",
    },
    {
      selector: ".dashboard-add-item-btn",
      content:
        "Step 4: Add new items to your dashboard group here, Choose visualization Type, Input prompt, and Optionally include AI-generated.",
    },
  ];

  return (
    <TourProvider
      steps={steps}
      defaultOpen={autoStart}
      startAt={startStep}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#1E1E1E",
          color: "#fff",
          border: "1px solid #6366F1",
          borderRadius: "10px",
          padding: "16px",
          maxWidth: "340px",
        }),
        badge: (base) => ({ ...base, backgroundColor: "#6366F1" }),
        close: () => ({ display: "none" }),
      }}
      disableKeyboardNavigation={["esc"]}
      components={{
        Navigation: ({ currentStep, steps, setCurrentStep }) => (
          <CustomControls
            currentStep={currentStep}
            steps={steps}
            setCurrentStep={setCurrentStep}
            setShowFinishModal={setShowFinishModal}
          />
        ),
      }}
    >
      <TourLogic />

      {!autoStart && !showFinishModal && <DashboardIntro />}

      {showFinishModal && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
            <h2 className="text-2xl font-bold mb-3">
              🎉 Dashboard Setup Complete!
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You’ve finished setting up your ConvoInsight Dashboard! Now you
              can freely build your charts and KPIs.
            </p>
            <button
              onClick={onFinish}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
            >
              Finish
            </button>
          </div>
        </motion.div>
      )}
    </TourProvider>
  );
}
