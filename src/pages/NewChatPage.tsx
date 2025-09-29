import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";
import { queryDomain } from "../utils/queryDomain";
import ChartGallery, {
  type ChartItem,
} from "../components/ChatComponents/ChartGallery";
import { useChatHistory } from "../hooks/useChatHistory";
import { fetchChartHtml } from "../utils/fetchChart";
import {
  saveChatMessage,
  listenMessages,
  getDomainDocId,
} from "../service/chatStore";
import { FiCopy, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import MultiSelectDropdown from "../components/ChatComponents/MultiSelectDropdown";
import SuggestedQuestions from "../components/ChatComponents/SuggestedQuestions";

/** Type Definitions **/
type Msg = {
  role: "user" | "assistant";
  content: string;
  cleanText?: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
  animate?: boolean;
};

type DatasetApiItem = {
  filename: string;
  gcs_path: string;
  size: number;
  updated?: string;
};

/** 🧹 Clean text from noise, URLs, undefined, etc. */
function cleanResponseText(text: string): string {
  return text
    .replace(/[\w/\\-]*\.html[`']?/gi, "")
    .replace(/See chart.*(\r?\n)?/gi, "")
    .replace(/[*-]\s*For a detailed breakdown.*(\r?\n)?/gi, "")
    .replace(/\bundefined\b/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** ✨ Convert clean text to rich formatted HTML */
function formatResponseText(text: string): string {
  let formatted = cleanResponseText(text);
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  formatted = formatted.replace(/(^|\s)\*(.*?)\*(\s|$)/g, "$1<em>$2</em>$3");
  formatted = formatted.replace(/^\s*[-*]\s+(.*)$/gm, "<li>$1</li>");
  formatted = formatted.replace(/^\s*\d+\.\s+(.*)$/gm, "<li>$1</li>");
  formatted = formatted.replace(/(<li>.*<\/li>)/gs, (match) => {
    const items = match.split(/\n+/).filter(Boolean);
    return `<ul class="list-disc pl-5 space-y-1">${items.join("")}</ul>`;
  });
  formatted = formatted.replace(/\n{2,}/g, "</p><p>");
  if (!/^<p>/.test(formatted)) formatted = `<p>${formatted}</p>`;
  return formatted.trim();
}

/** Chat Input Component **/
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
        >
          ⏹
        </button>
      ) : (
        <button
          onClick={hasText ? onSend : undefined}
          disabled={disabled}
          className="ml-2 flex items-center justify-center w-8 h-8 rounded-md transition bg-transparent text-white opacity-60"
        >
          {hasText ? "↑" : "➤"}
        </button>
      )}
    </div>
  );
}

/** Main Chat Page **/
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
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

  /** Resolve Firestore Domain ID **/
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        if (!id) console.error(`Domain "${domain}" not found`);
        setDomainDocId(id);
      } catch (e) {
        console.error("Failed to resolve domain docId", e);
      }
    })();
  }, [domain]);

  /** Listen to Saved Messages **/
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

  /** Fetch Datasets **/
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/domains/${domain}/datasets`);
        if (res.ok) {
          const data = await res.json();
          setAvailableDatasets(
            (data.datasets as DatasetApiItem[]).map((d) => d.filename)
          );
        }
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
    ? `Chat on domain “${domain}” (uses selected datasets in this domain)`
    : "Select a domain in the URL to start";

  /** Handle Send **/
  const handleSend = async (prompt?: string) => {
    const text = (prompt || message).trim();
    if (!text || sending) return;
    if (!domainDocId) return console.error("Domain not found");

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);
    setIsGenerating(true);

    const abortCtrl = new AbortController();
    setController(abortCtrl);

    const userMsgCount = nextMsgs.filter((m) => m.role === "user").length;
    let sessionId = searchParams.get("id");

    if (!openedId && userMsgCount === 1) {
      const id = `${Date.now()}`;
      sessionId = id;
      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });
      add({
        id,
        title: text.length > 50 ? text.slice(0, 50) + "…" : text,
        section: domain!,
        createdAt: Date.now(),
      });
    }

    try {
      await saveChatMessage(domainDocId, sessionId!, "user", text);

      const res = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt: text,
        sessionId,
        signal: abortCtrl.signal,
        dataset: selectedDatasets.length > 0 ? selectedDatasets : undefined,
      });

      let charts: ChartItem[] | undefined;
      let chartHtml: string | undefined;
      const chartUrl: string | null | undefined = res.chart_url ?? null;

      if (chartUrl) {
        try {
          const html = await fetchChartHtml(API_BASE, chartUrl);
          if (html) {
            chartHtml = html;
            charts = [{ html }];
          }
        } catch (e) {
          console.warn("Fetch chart HTML failed:", e);
        }
      }

      const cleanResponse = cleanResponseText(res.response ?? "(empty)");
      const formatted = formatResponseText(cleanResponse);

      const assistantMsg: Msg = {
        role: "assistant",
        chartUrl,
        charts,
        animate: true,
        content: formatted,
        cleanText: cleanResponse,
      };

      setMessages((cur) => [...cur, assistantMsg]);
      setTimeout(() => scrollToBottom("smooth"), 0);

      await saveChatMessage(
        domainDocId,
        sessionId!,
        "assistant",
        assistantMsg.content,
        chartHtml
      );
    } catch (err: unknown) {
      console.error(err);
      const fallbackMsg: Msg = {
        role: "assistant",
        content: "⚠️ There was a problem processing the message.",
        animate: true,
      };
      setMessages((cur) => [...cur, fallbackMsg]);
      setTimeout(() => scrollToBottom("smooth"), 0);

      await saveChatMessage(
        domainDocId,
        sessionId!,
        "assistant",
        fallbackMsg.content
      );
    } finally {
      setSending(false);
      setIsGenerating(false);
    }
  };

  /** UI **/
  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      {isNewConversation ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 max-w-7xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center px-2 sm:px-0">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="w-full flex justify-center">
              <div className="w-full max-w-2xl md:max-w-3xl px-2 sm:px-0">
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Dataset
                  </label>
                  <MultiSelectDropdown
                    options={availableDatasets}
                    selectedOptions={selectedDatasets}
                    onChange={setSelectedDatasets}
                    placeholder="General (all datasets)"
                  />
                </div>

                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSend={() => handleSend()}
                  isGenerating={isGenerating}
                  onStop={() => {
                    controller?.abort();
                    setIsGenerating(false);
                  }}
                  placeholder="Ask Anything"
                />
              </div>
            </div>

            <SuggestedQuestions onQuestionClick={handleSend} />
          </div>

          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)]">
            <div
              ref={chatScrollRef}
              className="flex-1 space-y-6 py-4 overflow-y-auto scrollbar-hide"
            >
              <div className="sticky top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#1a1b1e] to-transparent z-10 pointer-events-none" />

              {messages.map((m, i) => (
                <div
                  key={i}
                  className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl"
                >
                  {m.role === "assistant" ? (
                    <div className="space-y-3">
                      {m.charts && m.charts.length > 0 && (
                        <ChartGallery charts={m.charts} />
                      )}
                      <div
                        className="text-gray-200 leading-relaxed prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{
                          __html: formatResponseText(m.content),
                        }}
                      />
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
                          <AnimatedMessageBubble
                            message={{ role: m.role, content: m.content }}
                            animate={m.animate ?? false}
                          />
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
                <div className="text-gray-400 text-sm pl-4 w-full max-w-3xl px-2 sm:px-0">
                  No Message Yet
                </div>
              )}

              <div className="sticky bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#1a1b1e] to-transparent z-10 pointer-events-none" />
            </div>

            <div className="bg-[#1a1b1e] px-2 sm:px-0 py-4">
              <div className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl">
                <div className="mb-3">
                  <label className="block text-xs text-gray-400 mb-1">
                    Dataset
                  </label>
                  <MultiSelectDropdown
                    options={availableDatasets}
                    selectedOptions={selectedDatasets}
                    onChange={setSelectedDatasets}
                    placeholder="General (all datasets)"
                  />
                </div>

                <ChatInput
                  value={message}
                  onChange={setMessage}
                  onSend={() => handleSend()}
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
