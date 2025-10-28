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
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
          <h2 className="text-2xl font-bold mb-3">
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
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
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
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
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
        {
          selector: ".dataset-list-section",
          content:
            "All datasets you have uploaded will appear in this section.",
        },
      ]}
      styles={{
        popover: (base) => ({
          ...base,
          backgroundColor: "#1E1E1E",
          color: "#fff",
          border: "1px solid #6366F1",
          borderRadius: "10px",
          padding: "16px",
        }),
        badge: (base) => ({ ...base, backgroundColor: "#6366F1" }),
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
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="bg-[#111216] text-white p-8 rounded-2xl shadow-xl max-w-lg text-center border border-indigo-500">
            <h2 className="text-2xl font-bold mb-3">
              🎉 Dataset Setup Completed!
            </h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You've completed the dataset wizard. Now, you're ready to upload
              or connect a data source to ConvoInsight.
            </p>
            <button
              onClick={onFinish}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
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
