import React, { useEffect, useState } from "react";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  className?: string;
};

type UserConfig = {
  provider: string;
  token: string | null; // encrypted token returned by /validate-key
  models: string[];
  selectedModel: string;
  verbosity?: string;
  reasoning?: string;
  seed?: number;
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
  const [error, setError] = useState<
    "no-dataset" | "config-missing" | "api-error" | null
  >(null);

  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  const hasDataset = Array.isArray(dataset)
    ? dataset.length > 0
    : Boolean(dataset);

  useEffect(() => {
    // Load user_config (saved by Configuration page) from localStorage
    try {
      const raw = localStorage.getItem("user_config");
      if (raw) {
        const cfg = JSON.parse(raw) as UserConfig;
        setUserConfig(cfg);
      } else {
        setUserConfig(null);
      }
    } catch {
      setUserConfig(null);
    }
  }, []);

  useEffect(() => {
    // Early exits for cases where we don't want to call the API
    if (!hasDataset) {
      setSuggestions([]);
      setLoading(false);
      setError("no-dataset");
      return;
    }

    // Require credentials (provider, model, apiKey token) for /suggest
    const provider = userConfig?.provider?.trim();
    const model = userConfig?.selectedModel?.trim();
    const apiKey = userConfig?.token?.trim();

    if (!provider || !model || !apiKey) {
      setSuggestions([]);
      setLoading(false);
      setError("config-missing");
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
          // Send the same creds shape as /query does.
          body: JSON.stringify({
            domain,
            dataset,
            provider,
            model,
            apiKey, // encrypted token is fine; BE will decrypt
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const sug = (data.suggestions ?? []).filter(
          (s: string) => typeof s === "string" && s.trim().length > 0
        );

        if (!ignore && sug.length > 0) {
          setSuggestions(sug);
        } else if (!ignore) {
          // fallback defaults if API returned empty but successful
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
  }, [domain, dataset, hasDataset, userConfig]);

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
      ) : error === "config-missing" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ AI configuration not found. Set your Provider, Model, and API Key
          on the Configuration page.
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
