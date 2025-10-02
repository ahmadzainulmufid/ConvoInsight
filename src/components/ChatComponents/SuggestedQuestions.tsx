// src/components/ChatComponents/SuggestedQuestions.tsx
import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string; // tambahkan jika mau passing domain dari luar
  dataset?: string | string[];
};

// Default fallback kalau API gagal
const defaultQuestions = [
  "Compare revenue m1 vs m0",
  "Top 3 drivers of churn",
  "Most profitable segment this quarter",
  "Forecast revenue next month",
];

const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

const SuggestedQuestions: React.FC<Props> = ({
  onQuestionClick,
  domain = "general",
  dataset,
}) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>(defaultQuestions);

  useEffect(() => {
    let ignore = false;

    async function fetchSuggestions() {
      try {
        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            domain,
            dataset,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const sug = (data.suggestions ?? []).filter(
          (s: string) => typeof s === "string" && s.trim().length > 0
        );

        if (!ignore && sug.length === 4) {
          setSuggestions(sug);
        }
      } catch (err) {
        console.warn("Failed to fetch suggestions:", err);
        // fallback ke default
        if (!ignore) setSuggestions(defaultQuestions);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchSuggestions();

    return () => {
      ignore = true;
    };
  }, [domain, dataset]);

  return (
    <div className="mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 flex flex-col gap-2">
      {loading ? (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-gray-700/50 animate-pulse"
            />
          ))}
        </>
      ) : (
        suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q)}
            className="p-3 bg-gray-700/50 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {q}
          </button>
        ))
      )}
    </div>
  );
};

export default SuggestedQuestions;
