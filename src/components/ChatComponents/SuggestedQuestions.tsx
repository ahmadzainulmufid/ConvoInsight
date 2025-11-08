import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  className?: string;

  /** NEW: forward manual creds to /suggest */
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
        // Build payload with only defined fields
        const payload: Record<string, unknown> = {
          domain,
          dataset,
        };
        if (provider) payload.provider = provider;
        if (model) payload.model = model;
        if (typeof apiKey === "string") payload.apiKey = apiKey;
        if (typeof userId === "string") payload.userId = userId;

        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        // Attempt to parse JSON safely
        type SuggestResp = {
          suggestions?: unknown;
          detail?: unknown;
        };
        const data: SuggestResp = await res.json().catch(() => ({}));

        if (!res.ok) {
          // Surface backend detail to help debugging, but keep UI friendly
          const detail =
            typeof data.detail === "string"
              ? data.detail
              : `HTTP ${res.status}`;
          throw new Error(detail);
        }

        const rawList = Array.isArray(data.suggestions)
          ? (data.suggestions as unknown[])
          : [];

        const sug = rawList
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);

        if (!ignore) {
          setSuggestions(sug.length > 0 ? sug : defaultQuestions);
        }
      } catch (err: unknown) {
        // Keep console noise helpful for devs
        console.warn("Failed to fetch suggestions:", err);
        if (!ignore) {
          setError("api-error");
          setSuggestions([]);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void fetchSuggestions();

    return () => {
      ignore = true;
    };
    // NOTE: API_BASE is a module constant; no need to include in deps
  }, [domain, dataset, hasDataset, provider, model, apiKey, userId]);

  return (
    <div
      className={`mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 flex flex-col gap-2 text-gray-300 ${className ?? ""}`}
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
