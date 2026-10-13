import { useState } from "react";
import { TourProvider, useTour, type StepType } from "@reactour/tour";
import { motion } from "framer-motion";

type CustomControlsProps = {
  currentStep: number;
  steps: StepType[];
  setCurrentStep: (n: number) => void;
  setIsOpen: (open: boolean) => void;
  setShowFinishModal: (open: boolean) => void;
};

function TourIntro() {
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
            📊 Step 4: Manage Your Datasets
          </h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            On this page, you can upload dataset files (CSV, Excel, Parquet) or
            connect external data sources such as PostgreSQL, Snowflake, and
            BigQuery for use in ConvoInsight.
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

function CustomControls({
  currentStep,
  steps,
  setCurrentStep,
  setIsOpen,
  setShowFinishModal,
}: CustomControlsProps) {
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

export default function DatasetTour({ onFinish }: { onFinish: () => void }) {
  const [showFinishModal, setShowFinishModal] = useState(false);

  return (
    <TourProvider
      steps={[
        {
          selector: ".dataset-upload-area",
          content: "Upload your dataset file here (CSV, Excel, or Parquet).",
        },
        {
          selector: ".dataset-connectors-row",
          content:
            "Or connect an external database like PostgreSQL or BigQuery.",
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
        close: () => ({
          display: "none",
        }),
      }}
      disableInteraction
      disableKeyboardNavigation={["esc"]}
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
      {showFinishModal ? (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-[#151923] text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] border border-indigo-500/40 animate-fade-in max-w-lg text-center">
            <h2 className="text-2xl font-semibold tracking-tight mb-3">
              🎉 Dataset Setup Completed!
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You’ve completed the dataset setup. You’re now ready to upload or
              connect a data source in ConvoInsight.
            </p>
            <button
              onClick={onFinish}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/20 transition"
            >
              Finish
            </button>
          </div>
        </motion.div>
      ) : (
        <TourIntro />
      )}
    </TourProvider>
  );
}
