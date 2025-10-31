import { useState } from "react";
import { TourProvider, type StepType } from "@reactour/tour";
import { motion } from "framer-motion";

// 🟣 Custom navigation buttons (Back / Next / Finish)
function CustomControls({
  currentStep,
  steps,
  setCurrentStep,
  setIsOpen,
  setShowFinishModal,
}: {
  currentStep: number;
  steps: StepType[];
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
        className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
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
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
      >
        {isLast ? "Finish" : "Next"}
      </button>
    </div>
  );
}

export default function DashboardSettingTour({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [showFinishModal, setShowFinishModal] = useState(false);

  const steps: StepType[] = [
    {
      selector: ".dashboard-group-name",
      content: "Step 1: Enter a name for your new dashboard group here.",
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
  ];

  return (
    <TourProvider
      steps={steps}
      defaultOpen
      disableKeyboardNavigation={["esc"]}
      styles={{
        popover: (base) => ({
          ...base,
          background: "#1E1E1E",
          color: "#fff",
          border: "1px solid #6366F1",
          borderRadius: "10px",
          padding: "18px",
          maxWidth: "360px",
        }),
        badge: (base) => ({ ...base, backgroundColor: "#6366F1" }),
        close: () => ({ display: "none" }), // 🚫 hilangkan tombol X
      }}
      components={{
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
      {showFinishModal && (
        <motion.div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-[#111216] text-white p-8 rounded-2xl border border-indigo-500 text-center max-w-lg">
            <h2 className="text-2xl font-bold mb-3">
              🎉 Dashboard Setting Complete!
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You’ve finished setting up your dashboard group. Click{" "}
              <strong>Manage</strong> manually to continue building your
              dashboard items.
            </p>
            <button
              onClick={() => {
                setShowFinishModal(false);
                onFinish();
              }}
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
