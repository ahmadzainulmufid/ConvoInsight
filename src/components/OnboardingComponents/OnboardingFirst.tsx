import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import introVideo from "/videos/intro.mp4";
import domainVideo from "/videos/domain-dataset.mp4";

export default function OnboardingModal({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const slides = [
    {
      title: "Welcome to ConvoInsight",
      video: introVideo,
      text: "ConvoInsight is an AI-powered Business Intelligence assistant. You can ask questions about your business data, and ConvoInsight will respond with insights, graphs, and automated analysis.",
    },
    {
      title: "Starting from Domain and Dataset",
      video: domainVideo,
      text: "Get started by creating a domain, uploading your dataset, and let ConvoInsight help you understand your business performance in a smarter way.",
    },
  ];

  const next = () => {
    if (step < slides.length - 1) {
      setStep(step + 1);
    } else {
      // 👇 ketika step terakhir → tandai onboarding selesai dan arahkan ke halaman domain
      onFinish();
      navigate("/domain/new");
    }
  };

  const prev = () => step > 0 && setStep(step - 1);

  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center bg-black/80 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-[#0B0C0E] text-white rounded-3xl p-10 w-[90%] max-w-4xl shadow-2xl flex flex-col items-center relative"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="flex flex-col items-center text-center w-full"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -80) next();
              else if (info.offset.x > 80) prev();
            }}
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -80 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-3xl font-bold mb-6">{slides[step].title}</h2>

            <video
              src={slides[step].video}
              autoPlay
              loop
              muted
              playsInline
              className="rounded-xl mb-6 w-full max-h-[400px] object-cover border border-gray-700"
            />

            <p className="text-gray-300 mb-10 text-base leading-relaxed max-w-2xl">
              {slides[step].text}
            </p>

            {/* Indikator */}
            <div className="flex justify-center mb-10 space-x-3">
              {slides.map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i === step ? "bg-indigo-500 scale-110" : "bg-gray-600"
                  }`}
                />
              ))}
            </div>

            {/* Tombol bawah */}
            <div className="flex justify-between items-center w-full mt-auto px-6">
              {step > 0 ? (
                <button
                  onClick={prev}
                  className="flex items-center gap-2 text-gray-400 hover:text-white font-medium transition"
                >
                  <FiArrowLeft size={20} />
                  Back
                </button>
              ) : (
                <div />
              )}

              <div className="flex gap-4">
                <button
                  onClick={onFinish}
                  className="text-gray-400 hover:text-white py-2 font-medium"
                >
                  Skip ahead
                </button>
                <button
                  onClick={next}
                  className="bg-indigo-600 hover:bg-indigo-700 py-2 px-6 rounded-lg font-semibold text-white"
                >
                  {step < slides.length - 1 ? "Next" : "Start Tour"}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
