// src/components/ChatComponents/SuggestedQuestions.tsx
import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  className?: string;
};

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
  className,
}) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasDataset = Array.isArray(dataset)
    ? dataset.length > 0
    : Boolean(dataset);

  useEffect(() => {
    if (!hasDataset) {
      setSuggestions([]);
      setLoading(false);
      setError("no-dataset");
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);

    async function fetchSuggestions() {
      try {
        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain, dataset }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const sug = (data.suggestions ?? []).filter(
          (s: string) => typeof s === "string" && s.trim().length > 0
        );

        if (!ignore && sug.length > 0) {
          setSuggestions(sug);
        } else if (!ignore) {
          // fallback default jika kosong
          setSuggestions(defaultQuestions);
        }
      } catch (err) {
        console.warn("Failed to fetch suggestions:", err);
        if (!ignore) {
          setError("api-error");
          setSuggestions([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchSuggestions();
    return () => {
      ignore = true;
    };
  }, [domain, dataset, hasDataset]);

  return (
    <div
      className={`mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 flex flex-col gap-2 text-gray-300 ${className}`}
    >
      {loading ? (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-lg bg-gray-700/50 animate-pulse"
            />
          ))}
        </>
      ) : error === "no-dataset" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ Please upload the dataset first to display suggested questions.
        </div>
      ) : error === "api-error" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ Suggested questions are having problems. Please type your question
          manually.
        </div>
      ) : suggestions.length > 0 ? (
        suggestions.map((q, i) => (
          <button
            key={i}
            onClick={() => onQuestionClick(q)}
            className="p-3 bg-gray-700/50 rounded-lg text-left text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            {q}
          </button>
        ))
      ) : (
        <div className="text-center text-gray-400 text-sm py-3">
          There are no suggested questions at this time.
        </div>
      )}
    </div>
  );
};

export default SuggestedQuestions;
