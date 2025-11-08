// src/components/ChatComponents/SuggestedQuestions.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "../../utils/firebaseSetup";

type Props = {
  onQuestionClick: (question: string) => void;
  domain?: string;
  dataset?: string | string[];
  className?: string;
};

type UserConfig = {
  provider: string;          // e.g. "GEMINI" | "OPENAI" | ...
  token: string | null;      // encrypted or plaintext; we pass as-is (BE will decrypt)
  models: string[];
  selectedModel: string;     // e.g. "gemini/gemini-2.5-pro"
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
  const { user } = useAuthUser();

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<
    | null
    | "no-dataset"
    | "api-error"
    | "config-missing"
  >(null);

  // read user_config once
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user_config");
      if (stored) setUserConfig(JSON.parse(stored));
      else setUserConfig(null);
    } catch {
      setUserConfig(null);
    }
  }, []);

  const hasDataset = useMemo(() => {
    if (Array.isArray(dataset)) return dataset.length > 0;
    return Boolean(dataset);
  }, [dataset]);

  useEffect(() => {
    // guard: dataset wajib ada
    if (!hasDataset) {
      setSuggestions([]);
      setLoading(false);
      setError("no-dataset");
      return;
    }

    // guard: config wajib ada supaya /suggest dapat kredensial
    if (!userConfig || !userConfig.provider || !userConfig.selectedModel) {
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
        const body = {
          domain,
          dataset,
          // kirim kredensial dinamis – BE akan decrypt token jika terenkripsi
          provider: userConfig?.provider,
          model: userConfig?.selectedModel,
          apiKey: userConfig?.token ?? undefined,
          userId: user?.uid ?? undefined,
        };

        const res = await fetch(`${API_BASE}/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          // biarkan FE kasih pesan ramah
          console.warn("Fetch /suggest failed:", res.status, await res.text());
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        const sug = (data.suggestions ?? []).filter(
          (s: unknown) => typeof s === "string" && s.trim().length > 0
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
  }, [domain, dataset, hasDataset, userConfig, user?.uid]);

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
      ) : error === "config-missing" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ AI configuration not found. Save your API key & model on the Configuration page.
        </div>
      ) : error === "api-error" ? (
        <div className="text-center text-gray-400 text-sm py-3">
          ⚠️ Suggested questions are having problems. Please type your question manually.
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
