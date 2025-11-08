import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  /** Provider+model tetap diteruskan. */
  provider?: string;
  model?: string;
  /** DEPRECATED: diabaikan, jangan kirim apiKey ke BE */
  apiKey?: string | null;
  userId?: string | null;
  className?: string;
};

type SuggestAPIResponse = {
  suggestions?: unknown;
  detail?: unknown;
  elapsed?: number;
  data_info?: unknown;
  data_describe?: unknown;
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
  provider,
  model,
  // apiKey (ignored)
  userId,
  className,
}) => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [errText, setErrText] = useState<string>("");

  const hasDataset = Array.isArray(dataset)
    ? dataset.length > 0
    : Boolean(dataset);

  useEffect(() => {
    if (!hasDataset) {
      setSuggestions([]);
      setLoading(false);
      setError("no-dataset");
      setErrText("");
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);
    setErrText("");

    async function fetchSuggestions() {
      try {
        // Body ke BE TANPA apiKey
        const payload: Record<string, unknown> = {
          domain,
          dataset,
        };
        if (provider) payload.provider = provider;
        if (model) payload.model = model;
        if (userId != null) payload.userId = userId;

        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json: SuggestAPIResponse = await res
          .json()
          .catch(() => ({ detail: "Invalid JSON" }));

        if (!res.ok) {
          const msg =
            typeof json.detail === "string"
              ? json.detail
              : `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const raw = Array.isArray(json.suggestions) ? json.suggestions : [];
        const sug = raw.filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        );

        if (!ignore && sug.length > 0) {
          setSuggestions(sug);
        } else if (!ignore) {
          setSuggestions(defaultQuestions);
        }
      } catch (err: unknown) {
        const msg: string =
          err instanceof Error
            ? err.message
            : typeof err === "string"
            ? err
            : (() => {
                try {
                  return JSON.stringify(err);
                } catch {
                  return "Unknown error";
                }
              })();

        console.warn("Failed to fetch suggestions:", err);
        if (!ignore) {
          setError("api-error");
          setErrText(msg || "");
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
  }, [domain, dataset, hasDataset, provider, model, userId]);

  return (
    <div
      className={`mt-4 w-full max-w-2xl md:max-w-3xl px-2 sm:px-0 flex flex-col gap-2 text-gray-300 ${
        className || ""
      }`}
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
          manually{errText ? ` — ${errText}` : ""}.
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
