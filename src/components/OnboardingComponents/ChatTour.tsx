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
          <h2 className="text-2xl font-bold mb-3">💬 Step 6: Start Chatting</h2>
          <p className="text-gray-300 mb-6 leading-relaxed">
            Welcome to{" "}
            <span className="text-indigo-400 font-semibold">
              ConvoInsight Chat
            </span>{" "}
            — here you can ask anything about your datasets and get instant AI
            insights.
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

export default function ChatTour({ onFinish }: { onFinish: () => void }) {
  const [showFinishModal, setShowFinishModal] = useState(false);

  return (
    <TourProvider
      steps={[
        {
          selector: ".chat-dataset-dropdown",
          content: "Select which dataset(s) you want to use for your analysis.",
        },
        {
          selector: ".chat-input-box",
          content:
            "Type your question here to start a conversation with ConvoInsight.",
        },
        {
          selector: ".chat-suggested-section",
          content:
            "You can also use suggested questions to quickly explore insights.",
        },
        {
          selector: ".chat-history-list",
          content:
            "This area shows all your previous chats so you can revisit them anytime.",
        },
        {
          selector: ".chat-add-btn",
          content:
            "Click here to start a brand new conversation with ConvoInsight.",
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
        close: () => ({ display: "none" }),
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
            <h2 className="text-2xl font-bold mb-3">🎉 Chat Setup Complete!</h2>
            <p className="text-gray-300 mb-6 leading-relaxed">
              You’re now ready to chat with ConvoInsight — ask any question and
              get instant AI insights from your datasets!
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
