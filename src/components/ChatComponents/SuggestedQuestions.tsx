// src/components/ChatComponents/SuggestedQuestions.tsx

import React from "react";

type Props = {
  // Fungsi yang akan dipanggil saat sebuah pertanyaan diklik
  onQuestionClick: (question: string) => void;
};

// Daftar pertanyaan didefinisikan di dalam komponen ini
const questions = [
  "Compare revenue m1 vs m0",
  "Top 3 drivers of churn",
  "QoQ growth by channel",
  "Show total revenue this month",
];

const SuggestedQuestions: React.FC<Props> = ({ onQuestionClick }) => {
  return (
    <div className="mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
      {questions.map((q) => (
        <button
          key={q}
          // Panggil prop onQuestionClick dengan teks pertanyaan
          onClick={() => onQuestionClick(q)}
          className="p-3 bg-gray-700/50 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
        >
          {q}
        </button>
      ))}
    </div>
  );
};

export default SuggestedQuestions;
