// ChatPanel.tsx
import React, { useRef, useState } from "react";

/** Bentuk respons awal dari /analyze/upload */
type AnalysisEnqueue = {
  task_id: string;
  status: "queued" | "running" | "done" | "error";
  message?: string;
};

/** Bentuk respons dari /status/{task_id} */
type StatusResponse = {
  status: "queued" | "running" | "done" | "error";
  message?: string;
  result?: unknown; // bebas: teks, objek, dsb
  progress?: number; // 0..100 (opsional)
};

type Props = {
  analyzeEndpoint?: string; // POST multipart/form-data
  statusBase?: string; // GET status/{taskId}
  className?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickAssistantText(data: unknown): string {
  if (typeof data === "string") return data;
  if (isRecord(data)) {
    const simpleKeys = ["answer", "result", "output", "message"] as const;
    for (const k of simpleKeys) {
      const val = data[k];
      if (typeof val === "string") return val;
    }
    const reply = data["reply"];
    if (isRecord(reply) && typeof reply["content"] === "string") {
      return reply["content"] as string;
    }
    const choices = data["choices"];
    if (Array.isArray(choices) && choices.length > 0) {
      const first = choices[0];
      if (isRecord(first)) {
        const message = first["message"];
        if (isRecord(message) && typeof message["content"] === "string") {
          return message["content"] as string;
        }
      }
    }
    try {
      return JSON.stringify(data);
    } catch {
      return "[object]";
    }
  }
  return String(data);
}

const ChatPanel: React.FC<Props> = ({
  analyzeEndpoint = "https://ml-bi-pipeline-api-819767094904.asia-southeast2.run.app/analyze/upload",
  statusBase = "https://ml-bi-pipeline-api-819767094904.asia-southeast2.run.app/status/",
  className,
}) => {
  const [msgs, setMsgs] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState(""); // opsional kalau server tak punya ENV
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [currentTask, setCurrentTask] = useState<string | null>(null);

  const pollAbortRef = useRef<AbortController | null>(null);

  async function pollStatus(taskId: string) {
    const delays = [1200, 1500, 2000, 2500, 3000];
    let attempt = 0;
    pollAbortRef.current?.abort();
    const controller = new AbortController();
    pollAbortRef.current = controller;

    // loop polling
    // berhenti jika AbortController di-abort
    while (!controller.signal.aborted) {
      const res = await fetch(`${statusBase}${taskId}`, {
        signal: controller.signal,
      });
      const ct = res.headers.get("content-type") || "";
      const data: StatusResponse | string = ct.includes("application/json")
        ? await res.json()
        : await res.text();

      if (isRecord(data)) {
        const s = data.status;
        if (typeof data.progress === "number")
          setProgress(Math.max(0, Math.min(100, data.progress)));
        // tampilkan update kecil di area loading (opsional)
        if (s === "done") return data;
        if (s === "error") throw new Error(data.message || "Task failed");
      } else {
        // jika server kirim teks polos
        const txt = String(data).toLowerCase();
        if (txt.includes("done"))
          return { status: "done", message: String(data) } as StatusResponse;
      }

      const delay = delays[Math.min(attempt, delays.length - 1)];
      await new Promise((r) => setTimeout(r, delay));
      attempt += 1;
    }

    throw new Error("Polling dibatalkan");
  }

  async function callApi(query: string) {
    if (!file)
      throw new Error("Pilih file CSV dulu sebelum mengirim pertanyaan.");

    // bangun FormData sesuai backend
    const fd = new FormData();
    fd.append("user_prompt", query);
    fd.append("file", file);
    if (apiKey.trim()) fd.append("openai_api_key", apiKey.trim());

    // enqueue
    const res = await fetch(analyzeEndpoint, { method: "POST", body: fd });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
    }

    const data: AnalysisEnqueue | string = await res
      .json()
      .catch(async () => res.text());
    if (!isRecord(data)) return pickAssistantText(data);

    const tid = typeof data.task_id === "string" ? data.task_id : "";
    const msg =
      typeof data.message === "string" ? data.message : "Task queued.";

    setCurrentTask(tid || null);
    setProgress(2); // indikator awal

    return {
      initialText: `${msg}${tid ? ` (task: ${tid})` : ""}`,
      taskId: tid,
    };
  }

  const cancelPolling = () => {
    pollAbortRef.current?.abort();
    setProgress(null);
    setCurrentTask(null);
    setLoading(false);
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;

    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    setProgress(null);

    try {
      // 1) enqueue
      const enq = await callApi(q);
      if (typeof enq === "string") {
        // kalau backend suatu saat balas sinkron
        setMsgs((m) => [...m, { role: "assistant", text: enq }]);
        setLoading(false);
        return;
      }
      // tampilkan pesan queued
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: `📦 ${enq.initialText}` },
      ]);

      // 2) poll sampai selesai
      if (enq.taskId) {
        const finalData = await pollStatus(enq.taskId);
        const finalText =
          isRecord(finalData) && finalData.result !== undefined
            ? pickAssistantText(finalData.result)
            : isRecord(finalData) && typeof finalData.message === "string"
            ? finalData.message
            : "Analysis finished.";

        setMsgs((m) => [...m, { role: "assistant", text: finalText }]);
      } else {
        // kalau tidak ada task_id, tidak bisa poll → stop di pesan awal
      }
    } catch (err: unknown) {
      let msg = "Unknown error";
      if (err instanceof DOMException && err.name === "AbortError") {
        msg = "Polling dibatalkan.";
      } else if (err instanceof TypeError) {
        msg =
          "Request gagal. Cek CORS di backend (Access-Control-Allow-Origin) atau gunakan proxy.";
      } else if (err instanceof Error) {
        msg = err.message;
      } else {
        try {
          msg = JSON.stringify(err);
        } catch {
          msg = String(err);
        }
      }
      setMsgs((m) => [...m, { role: "assistant", text: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
      setProgress(null);
      setCurrentTask(null);
    }
  };

  return (
    <aside
      className={`bg-[#232427] rounded-2xl border border-[#2a2b32] flex flex-col h-full ${
        className || ""
      }`}
    >
      <div className="p-4 border-b border-[#2a2b32]">
        <h3 className="text-lg font-semibold text-white">Data Analyst</h3>
        <p className="text-xs text-gray-400">
          Specialized in data analysis and visualization
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.length === 0 ? (
          <div className="text-center text-gray-400 text-sm mt-10">
            <div className="text-5xl mb-3">🤖</div>
            No messages yet
            <br />
            Ask me anything about your metrics and visualizations.
          </div>
        ) : (
          msgs.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "text-white" : "text-gray-200"}
            >
              <div
                className={`inline-block px-3 py-2 rounded-xl ${
                  m.role === "user" ? "bg-blue-600/70" : "bg-white/5"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="space-y-2">
            <div className="text-gray-400 text-sm">…processing</div>
            {progress !== null && (
              <div className="w-full bg-[#1f2024] rounded-lg border border-[#2a2b32] h-2 overflow-hidden">
                <div
                  className="h-2 bg-blue-600 transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}
            {currentTask && (
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Task: {currentTask}</span>
                <button
                  type="button"
                  onClick={cancelPolling}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        className="p-3 border-t border-[#2a2b32] flex flex-col gap-2"
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-gray-300"
        />

        {/* Opsional kalau BACKEND tidak punya OPENAI_API_KEY di ENV */}
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="OpenAI API Key (opsional jika server sudah punya)"
          className="bg-[#1f2024] text-white border border-[#2a2b32] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
        />

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me about your data…"
            className="flex-1 bg-[#1f2024] text-white border border-[#2a2b32] rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
};

export default ChatPanel;
