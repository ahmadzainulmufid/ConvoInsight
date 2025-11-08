import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  className?: string;

  /** NEW: pass-through creds so /suggest uses the same user key as /query */
  provider?: string;
  model?: string;
  apiKey?: string | null;
  userId?: string | null;
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
  provider,
  model,
  apiKey,
  userId,
}) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasDataset = Array.isArray(dataset)
    ? dataset.length > 0
    : Boolean(dataset);

  useEffect(() => {
    if (!hasDataset) {
      setSuggestions([]);
      setLoading(false);
      setError("no-dataset");
      setErrorMsg(null);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);
    setErrorMsg(null);

    async function fetchSuggestions() {
      try {
        // Build payload ONLY with defined fields
        const payload: Record<string, unknown> = { domain, dataset };
        if (provider) payload.provider = provider;
        if (model) payload.model = model;
        if (userId) payload.userId = userId;
        if (apiKey) payload.apiKey = apiKey;

        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          // Try to surface BE error details (400s, etc.)
          try {
            const j = await res.json();
            if (!ignore) {
              setError("api-error");
              setErrorMsg(
                typeof j?.detail === "string"
                  ? j.detail
                  : "Suggestion service returned an error."
              );
              setSuggestions([]);
            }
          } catch {
            if (!ignore) {
              setError("api-error");
              setErrorMsg("Suggestion service returned an error.");
              setSuggestions([]);
            }
          }
          return;
        }

        const data = await res.json();
        const sug = (data.suggestions ?? []).filter(
          (s: string) => typeof s === "string" && s.trim().length > 0
        );

        if (!ignore && sug.length > 0) {
          setSuggestions(sug);
        } else if (!ignore) {
          setSuggestions(defaultQuestions);
        }
      } catch (err) {
        console.warn("Failed to fetch suggestions:", err);
        if (!ignore) {
          setError("api-error");
          setErrorMsg(
            "Network error while fetching suggestions. Please type your question manually."
          );
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
  }, [domain, dataset, hasDataset, provider, model, apiKey, userId]);

  return (
    <div
      className={`mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 flex flex-col gap-2 text-gray-300 ${className}`}
    >
      {loading ? (
        <>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-700/50 animate-pulse" />
          ))}
        </>
      ) : error === "no-dataset" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ Please upload the dataset first to display suggested questions.
        </div>
      ) : error === "api-error" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ Suggested questions are having problems. Please type your question
          manually{errorMsg ? ` — ${errorMsg}` : ""}.
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
