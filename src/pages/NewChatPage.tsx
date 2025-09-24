import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import toast from "react-hot-toast";
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

type Msg = {
  role: "user" | "assistant";
  content: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
  animate?: boolean;
};

function cleanResponseText(text: string): string {
  return text
    .replace(/[*]\s*For a detailed breakdown.*(\r?\n)?/gi, "")
    .replace(/The chart.*\.html[`']?\.?(\r?\n)?/gi, "")
    .replace(/\/?[\w/\\-]+\.html[`']?/gi, "")
    .replace(/\bundefined\b/gi, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function normalizeResponse(text: string): string {
  let out = text;

  // Hilangkan bold **...**
  out = out.replace(/\*\*(.*?)\*\*/g, "$1");

  // Ubah "Next actions:" jadi heading
  out = out.replace(/Next actions:/gi, "Next actions\n");

  // Ubah "Over-performance Drivers:" jadi heading
  out = out.replace(
    /Over-performance Drivers:/gi,
    "Over-performance Drivers\n"
  );

  // Ubah "Under-performance Drivers:" jadi heading
  out = out.replace(
    /Under-performance Drivers:/gi,
    "Under-performance Drivers\n"
  );

  // Ubah "Caveats:" jadi heading
  out = out.replace(/Caveats:/gi, "Caveats\n");

  // Ubah "Confidence:" jadi heading
  out = out.replace(/Confidence:/gi, "Confidence\n");

  // Ganti bullet `*` di awal baris jadi numbering otomatis
  let counter = 1;
  out = out.replace(/^\s*[*-]\s+/gm, () => `${counter++}. `);

  // Rapikan newline berlebih
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}

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

  const API_BASE =
    import.meta.env.VITE_API_URL ||
    "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        if (!id) {
          toast.error(`Domain "${domain}" not found`);
        }
        setDomainDocId(id);
      } catch (e) {
        console.error("Failed to resolve domain docId", e);
        toast.error("Failed to find domain");
      }
    })();
  }, [domain]);

  // subscribe Firestore messages
  useEffect(() => {
    if (!domainDocId || !openedId) return;

    const unsub = listenMessages(domainDocId, openedId, (msgs) => {
      const mapped: Msg[] = msgs.map((m) => {
        const charts = m.chartHtml ? [{ html: m.chartHtml }] : undefined;
        return { role: m.role, content: m.text, charts, animate: false };
      });
      setMessages(mapped);
    });

    return () => unsub();
  }, [domainDocId, openedId]);

  // auto-scroll
  useEffect(() => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" });
    });
  }, [messages.length]);

  const title = "ConvoInsight";
  const subtitle = domain
    ? `Chat on domain “${domain}” (uses all uploaded datasets in this domain)`
    : "Select a domain in the URL to start";

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;
    if (!domainDocId) {
      toast.error("Domain not found");
      return;
    }

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);
    setIsGenerating(true);

    const abortCtrl = new AbortController();
    setController(abortCtrl);

    // buat session id di URL pas pesan pertama
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

      toast.success("Chat saved to History");
    }

    try {
      // simpan pesan user ke Firestore
      await saveChatMessage(domainDocId, sessionId!, "user", text);

      const res = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt: text,
        sessionId,
        signal: abortCtrl.signal,
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
      const cleaned = cleanResponseText(res.response ?? "(empty)");

      const assistantMsg: Msg = {
        role: "assistant",
        chartUrl,
        charts,
        animate: true,
        content: normalizeResponse(cleaned),
      };

      setMessages((cur) => [...cur, assistantMsg]);

      // simpan pesan assistant ke Firestore
      await saveChatMessage(
        domainDocId,
        sessionId!,
        "assistant",
        assistantMsg.content,
        chartHtml
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to process the request";
      toast.error(msg);

      const fallback: Msg = {
        role: "assistant",
        content: "⚠️ (fallback) There was a problem processing the message.",
        animate: true,
      };
      setMessages((cur) => [...cur, fallback]);

      await saveChatMessage(
        domainDocId,
        sessionId!,
        "assistant",
        fallback.content
      );
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
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="w-full mx-auto max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0 ml-40">
              <ChatComposer
                value={message}
                onChange={setMessage}
                onSend={handleSend}
                placeholder="Ask about data in this domain…"
              />
            </div>

            <p className="mt-2 text-xs text-gray-500 text-center px-3">
              Tips: “Compare revenue m1 vs m0”, “Top 3 drivers of churn”, “QoQ
              growth by channel”
            </p>
          </div>

          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 max-w-7xl mx-auto">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-center lg:text-left mb-3 px-2 sm:px-0">
              Conversation — {domain}
            </h2>

            <div className="min-h-[60vh] rounded-md border border-[#2F3038] bg-[#1f2026] p-3 sm:p-4 lg:p-6 flex flex-col">
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto pr-2 sm:pr-4 space-y-6"
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0"
                  >
                    {m.role === "assistant" ? (
                      <>
                        {/* Chart langsung inline tanpa judul */}
                        {m.charts && m.charts.length > 0 && (
                          <div className="mb-4">
                            <ChartGallery charts={m.charts} />
                          </div>
                        )}

                        {/* Jawaban teks assistant (tanpa card) */}
                        <div className="mb-6 text-gray-200 leading-relaxed whitespace-pre-line">
                          {m.content}
                        </div>

                        {/* Garis pemisah antar jawaban */}
                        {i < messages.length - 1 && (
                          <hr className="border-t border-gray-700 my-6 opacity-50" />
                        )}
                      </>
                    ) : (
                      <div className="mb-10 relative group">
                        {editingIndex === i ? (
                          // Mode editing
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
                                  toast.success("Message updated!");
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
                            {/* Bubble user normal */}
                            <AnimatedMessageBubble
                              message={{ role: m.role, content: m.content }}
                              animate={m.animate ?? false}
                            />

                            {/* Action icons pojok kanan bawah */}
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

                {sending && (
                  <div className="text-sm text-gray-400 animate-pulse mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0">
                    Assistant is typing...
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-gray-400 text-sm mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0">
                    No Message Yet
                  </div>
                )}
              </div>

              <div className="mt-4 mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0">
                {isGenerating ? (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        controller?.abort();
                        setIsGenerating(false);
                        toast("⏹️ Generation stopped");
                      }}
                      className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                    >
                      Stop Generating
                    </button>
                  </div>
                ) : (
                  <ChatComposer
                    value={message}
                    onChange={setMessage}
                    onSend={handleSend}
                    placeholder={sending ? "Sending…" : "Type a question…"}
                    expanded
                  />
                )}
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
