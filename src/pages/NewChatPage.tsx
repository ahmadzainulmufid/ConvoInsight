// src/pages/NewChatPage.tsx
import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";
import ChartGallery, { type ChartItem } from "../components/ChatComponents/ChartGallery";
import { useChatHistory } from "../hooks/useChatHistory";
import { fetchChartHtml } from "../utils/fetchChart";
import { queryDomain } from "../utils/queryDomain";
import { saveChatMessage, listenMessages, getDomainDocId } from "../service/chatStore";
import { FiCopy, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import toast from "react-hot-toast";

/* ----------------------------- Types ----------------------------- */
type Msg = {
  role: "user" | "assistant";
  content: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
  animate?: boolean;
};

type DatasetApiItem = {
  filename: string;
  gcs_path?: string;
  size?: number;
  updated?: string;
};

type QueryOk = {
  session_id: string;
  response?: unknown; // may be string or object in edge cases
  chart_url?: string | null;
  diagram_signed_url?: string | null;
  diagram_kind?: "charts" | "tables" | "";
  execution_time?: number;
  need_visualizer?: boolean;
  need_analyzer?: boolean;
  need_manipulator?: boolean;
};

type QueryErr = {
  code?: string;
  detail?: string;
};

/* ----------------------------- Helpers ----------------------------- */
/** Coerce any unknown value (string/object/array/number) into a readable string */
function asPlainText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    // Favor a compact single-line first; if too long, pretty print
    const s = JSON.stringify(v);
    if (s && s.length <= 1200) return s;
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function cleanResponseText(input: unknown): string {
  const text = asPlainText(input);
  return text
    // remove noisy tail references to HTML file paths or generic placeholders
    .replace(/[*]\s*For a detailed breakdown.*(\r?\n)?/gi, "")
    .replace(/The chart.*\.html[`']?\.?(\r?\n)?/gi, "")
    .replace(/\/?[\w/\\.-]+\.html[`']?/gi, "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function normalizeResponse(text: string): string {
  let out = text;
  // drop bold markdown
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");
  // normalize section headers -> newline based
  out = out.replace(/Next actions:?/gi, "Next actions\n");
  out = out.replace(/Over-performance Drivers:?/gi, "Over-performance Drivers\n");
  out = out.replace(/Under-performance Drivers:?/gi, "Under-performance Drivers\n");
  out = out.replace(/Caveats:?/gi, "Caveats\n");
  out = out.replace(/Confidence:?/gi, "Confidence\n");
  // bullet -> numbered list
  let counter = 1;
  out = out.replace(/^\s*[*-]\s+/gm, () => `${counter++}. `);
  out = out.replace(/\n{3,}/g, "\n\n");
  return out.trim();
}

/* Lightweight input for the inline composer on the message list view */
function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
  isGenerating,
  onStop,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isGenerating?: boolean;
  onStop?: () => void;
  placeholder?: string;
}) {
  const hasText = value.trim().length > 0;

  return (
    <div className="flex items-center w-full rounded-xl bg-gray-700 px-4 py-3">
      <textarea
        className="flex-1 bg-transparent resize-none outline-none text-gray-200 text-sm leading-relaxed max-h-40 overflow-y-auto placeholder-gray-400"
        placeholder={placeholder ?? "Ask Anything"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.nativeEvent as KeyboardEvent).isComposing) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!disabled && !isGenerating && hasText) onSend();
          }
        }}
        rows={1}
        disabled={disabled}
      />

      {isGenerating ? (
        <button
          onClick={onStop}
          className="ml-2 flex items-center justify-center w-8 h-8 rounded-md bg-transparent opacity-60 text-white transition"
          title="Stop"
        >
          ⏹
        </button>
      ) : (
        <button
          onClick={hasText ? onSend : undefined}
          disabled={disabled}
          className={`ml-2 flex items-center justify-center w-8 h-8 rounded-md transition ${
            hasText ? "bg-transparent text-white opacity-60" : "bg-transparent text-white opacity-60"
          }`}
          title="Send"
        >
          {hasText ? "↑" : "➤"}
        </button>
      )}
    </div>
  );
}

/* ----------------------------- Page ----------------------------- */
export default function NewChatPage() {
  const { section: domain } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { add } = useChatHistory(domain);

  const [domainDocId, setDomainDocId] = useState<string | null>(null);

  const openedId = searchParams.get("id");
  const isNewConversation = !openedId;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const [controller, setController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("general");

  const API_BASE = import.meta.env.VITE_API_URL || "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

  /* Resolve Firestore domain doc id, but don't crash if blocked/unauth */
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        setDomainDocId(id ?? null);
      } catch (e) {
        console.error("Failed to resolve domain docId (continuing without Firestore):", e);
        setDomainDocId(null);
      }
    })();
  }, [domain]);

  /* Subscribe to existing messages if we have Firestore & a chat id */
  useEffect(() => {
    if (!domainDocId || !openedId) return;
    const unsub = listenMessages(domainDocId, openedId, (msgs) => {
      const mapped: Msg[] = msgs.map((m) => {
        const charts = m.chartHtml ? [{ html: m.chartHtml }] : undefined;
        return { role: m.role, content: m.text, charts, animate: false };
      });
      setMessages(mapped);
      setTimeout(() => scrollToBottom("auto"), 0);
    });
    return () => unsub();
  }, [domainDocId, openedId]);

  /* Load dataset filenames for selector (supports items|datasets variant) */
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/domains/${domain}/datasets`);
        if (!res.ok) return;
        const data = await res.json();
        const arr: DatasetApiItem[] = (data.datasets ?? data.items ?? []) as DatasetApiItem[];
        setAvailableDatasets(arr.map((d) => d.filename).filter(Boolean));
      } catch (err) {
        console.error("Failed to load datasets", err);
      }
    })();
  }, [domain, API_BASE]);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = (behavior: "auto" | "smooth" = "smooth") => {
    endOfMessagesRef.current?.scrollIntoView({ behavior });
  };

  const title = "ConvoInsight";
  const subtitle = domain
    ? `Chat on domain “${domain}” (uses all uploaded datasets in this domain)`
    : "Select a domain in the URL to start";

  const safeSave = async (...args: Parameters<typeof saveChatMessage>) => {
    try {
      await saveChatMessage(...args);
    } catch (e) {
      // Ad blockers or expired Firebase key will throw here; don't break chat UX
      console.warn("Skipping Firestore save:", (e as Error)?.message ?? e);
    }
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);
    setIsGenerating(true);

    const abortCtrl = new AbortController();
    setController(abortCtrl);

    // Create a chat id locally (URL param) if first user message
    const userMsgCount = nextMsgs.filter((m) => m.role === "user").length;
    let sessionId = searchParams.get("id");
    if (!openedId && userMsgCount === 1) {
      const id = `${Date.now()}`;
      sessionId = id;

      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, { replace: true });

      add({
        id,
        title: text.length > 50 ? text.slice(0, 50) + "…" : text,
        section: domain!,
        createdAt: Date.now(),
      });
    }

    // best-effort persistence of the user message
    if (domainDocId) {
      await safeSave(domainDocId, sessionId!, "user", text);
    }

    try {
      const res: QueryOk & QueryErr = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt: text,
        sessionId,
        signal: abortCtrl.signal,
        dataset: selectedDataset !== "general" ? selectedDataset : undefined,
      });

      // Server-side error surfaced cleanly
      if ((res as QueryErr).detail || (res as QueryErr).code) {
        const errText = `${(res as QueryErr).code ?? "ERROR"} — ${(res as QueryErr).detail ?? "Request failed."}`;
        const assistantErr: Msg = { role: "assistant", content: errText, animate: true };
        setMessages((cur) => [...cur, assistantErr]);
        setTimeout(() => scrollToBottom("smooth"), 0);
        if (domainDocId) await safeSave(domainDocId, sessionId!, "assistant", errText);
        return;
      }

      // Try chart sources (local dev chart_url first; otherwise GCS signed URL)
      let charts: ChartItem[] | undefined;
      let chartHtml: string | undefined;

      const tryLoadChart = async (url: string) => {
        try {
          const html = await fetchChartHtml(API_BASE, url);
          if (html) {
            chartHtml = html;
            charts = [{ html }];
          }
        } catch (e) {
          console.warn("Fetch chart HTML failed:", e);
        }
      };

      if (res.chart_url) {
        await tryLoadChart(res.chart_url);
      } else if (res.diagram_signed_url) {
        try {
          const r = await fetch(res.diagram_signed_url);
          if (r.ok) {
            const html = await r.text();
            chartHtml = html;
            charts = [{ html }];
          }
        } catch (e) {
          console.warn("Fetch diagram_signed_url failed:", e);
        }
      }

      // Normalize response text regardless of type
      const cleaned = cleanResponseText(res.response ?? "(empty)");
      const assistantMsg: Msg = {
        role: "assistant",
        chartUrl: res.chart_url ?? null,
        charts,
        animate: true,
        content: normalizeResponse(cleaned),
      };

      setMessages((cur) => [...cur, assistantMsg]);
      setTimeout(() => scrollToBottom("smooth"), 0);

      if (domainDocId) {
        await safeSave(domainDocId, sessionId!, "assistant", assistantMsg.content, chartHtml);
      }
    } catch (err: unknown) {
      let fallbackMsg: Msg;

      if (err instanceof DOMException && err.name === "AbortError") {
        fallbackMsg = { role: "assistant", content: "Response terminated by user", animate: true };
      } else {
        const errorMsg = err instanceof Error ? err.message : "Failed to process the request";
        console.error(errorMsg);
        fallbackMsg = {
          role: "assistant",
          content:
            "There was a problem processing the message.\n\nTip: ensure your backend has a valid GEMINI_API_KEY and Plotly installed; if you’re on local dev without GCS/Firebase, that’s fine—chat will still work.",
          animate: true,
        };
      }

      setMessages((cur) => [...cur, fallbackMsg]);
      setTimeout(() => scrollToBottom("smooth"), 0);

      if (domainDocId) {
        await safeSave(domainDocId, sessionId!, "assistant", fallbackMsg.content);
      }
    } finally {
      setSending(false);
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      {isNewConversation ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 max-w-7xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center px-2 sm:px-0">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{title}</h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="w-full flex justify-center">
              <div className="w-full max-w-2xl md:max-w-3xl px-2 sm:px-0">
                {/* Dataset Selector */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Dataset</label>
                  <select
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                    className="w-full rounded-md bg-[#1f2024] border border-[#2a2b32] text-gray-100 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General (all datasets)</option>
                    {availableDatasets.map((ds) => (
                      <option key={ds} value={ds}>
                        {ds}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chat Input */}
                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSend={handleSend}
                  isGenerating={isGenerating}
                  onStop={() => {
                    controller?.abort();
                    setIsGenerating(false);
                  }}
                  placeholder="Ask Anything"
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500 text-center px-3">
              Tips: “Compare revenue m1 vs m0”, “Top 3 drivers of churn”, “QoQ growth by channel”
            </p>
          </div>

          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)]">
            <div ref={chatScrollRef} className="flex-1 space-y-6 py-4 overflow-y-auto scrollbar-hide">
              <div className="sticky top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#1a1b1e] to-transparent z-10 pointer-events-none" />

              {messages.map((m, i) => (
                <div key={i} className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl">
                  {m.role === "assistant" ? (
                    <div className="space-y-3">
                      {m.charts && m.charts.length > 0 && <ChartGallery charts={m.charts} />}
                      <p className="text-gray-200 leading-relaxed whitespace-pre-line">{m.content}</p>
                    </div>
                  ) : (
                    <div className="mb-8 relative group">
                      {editingIndex === i ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full rounded-lg border border-gray-600 bg-[#1f2026] text-gray-200 p-2 text-sm"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end text-sm">
                            <button
                              onClick={() => {
                                const next = [...messages];
                                next[i].content = editText;
                                setMessages(next);
                                setEditingIndex(null);
                              }}
                              className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                            >
                              <FiCheck size={14} /> Save
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-1"
                            >
                              <FiX size={14} /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <AnimatedMessageBubble message={{ role: m.role, content: m.content }} animate={m.animate ?? false} />
                          <div className="flex justify-end gap-2 mt-2 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(m.content);
                                toast.success("Message copied!");
                              }}
                              className="text-gray-500 hover:text-gray-300 bg-transparent p-1"
                            >
                              <FiCopy size={12} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingIndex(i);
                                setEditText(m.content);
                              }}
                              className="text-gray-500 hover:text-gray-300 bg-transparent p-1"
                            >
                              <FiEdit2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div ref={endOfMessagesRef} />

              {sending && (
                <div className="text-sm text-gray-400 animate-pulse pl-4 w-full max-w-3xl px-2 sm:px-0">
                  Assistant is typing...
                </div>
              )}
              {messages.length === 0 && (
                <div className="text-gray-400 text-sm pl-4 w-full max-w-3xl px-2 sm:px-0">No Message Yet</div>
              )}

              <div className="sticky bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#1a1b1e] to-transparent z-10 pointer-events-none" />
            </div>

            <div className="bg-[#1a1b1e] px-2 sm:px-0 py-4">
              <div className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl">
                {/* Dataset Selector */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">Dataset</label>
                  <select
                    value={selectedDataset}
                    onChange={(e) => setSelectedDataset(e.target.value)}
                    className="w-full rounded-md bg-[#1f2024] border border-[#2a2b32] text-gray-100 text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General (all datasets)</option>
                    {availableDatasets.map((ds) => (
                      <option key={ds} value={ds}>
                        {ds}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Chat Input */}
                <ChatInput
                  value={message}
                  onChange={setMessage}
                  onSend={handleSend}
                  placeholder="Ask Anything"
                  disabled={sending}
                  isGenerating={isGenerating}
                  onStop={() => {
                    controller?.abort();
                    setIsGenerating(false);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}
