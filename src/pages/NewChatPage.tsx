// src/pages/NewChatPage.tsx
import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import toast from "react-hot-toast";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";
import { queryDomain } from "../utils/queryDomain";
import ChartGallery from "../components/ChatComponents/ChartGallery";
import { useChatHistory } from "../hooks/useChatHistory";
import type { ChartItem } from "../components/ChatComponents/ChartGallery";
import { fetchChartHtml } from "../utils/fetchChart";

type Msg = {
  role: "user" | "assistant";
  content: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
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
export default function NewChatPage() {
  const { section: domain } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { add } = useChatHistory(domain);

  const openedId = searchParams.get("id");
  const isNewConversation = !openedId;

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

  useEffect(() => {
    if (!openedId) {
      setMessages([]);
      setMessage("");
    }
  }, [openedId]);

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
    if (!domain) {
      toast.error("Domain tidak ditemukan di route.");
      return;
    }

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);

    // buat session id di URL pas pesan pertama
    const userMsgCount = nextMsgs.filter((m) => m.role === "user").length;
    if (!openedId && userMsgCount === 1) {
      const id = `${Date.now()}`;
      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });

      add({
        id,
        title: text.length > 50 ? text.slice(0, 50) + "…" : text,
        section: domain,
        createdAt: Date.now(),
      });

      toast.success("Chat disimpan ke History");
    }

    try {
      const sessionId = searchParams.get("id");
      const res = await queryDomain({
        apiBase: API_BASE,
        domain,
        prompt: text,
        sessionId,
      });

      // default payload
      let charts: ChartItem[] | undefined;
      const chartUrl: string | null | undefined = res.chart_url ?? null;

      if (chartUrl) {
        try {
          const html = await fetchChartHtml(API_BASE, chartUrl);
          if (html) {
            charts = [{ title: "Chart", html }];
          }
        } catch (e) {
          console.warn("Fetch chart HTML failed, falling back to iframe:", e);
        }
      }

      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: cleanResponseText(res.response ?? "(empty)"),
          chartUrl,
          charts,
        },
      ]);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Gagal memproses permintaan.";
      toast.error(msg);
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "⚠️ (fallback) Terjadi kendala memproses pesan.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      {isNewConversation ? (
        // ⬇️ perbesar container
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
                placeholder="Tanya tentang data di domain ini…"
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
        // ⬇️ perbesar container + tambah padding
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
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const animate = isLast && m.role === "assistant" && !sending;

                  return (
                    <div
                      key={i}
                      className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0"
                    >
                      {/* 1) Chart dari HTML string */}
                      {m.charts && m.charts.length > 0 && (
                        <div className="mb-4">
                          <ChartGallery charts={m.charts} />
                        </div>
                      )}

                      {/* 2) Fallback iframe */}
                      {!m.charts?.length &&
                        m.chartUrl &&
                        m.role === "assistant" && (
                          <div className="mb-4 rounded-md bg-[#24252c] border border-[#2F3038] p-3">
                            <div className="text-sm mb-2 text-gray-200">
                              Chart
                            </div>
                            <iframe
                              src={
                                m.chartUrl.startsWith("http")
                                  ? m.chartUrl
                                  : `${API_BASE.replace(/\/+$/, "")}${
                                      m.chartUrl
                                    }`
                              }
                              className="w-full rounded"
                              style={{
                                height: "clamp(320px, 50vh, 640px)",
                                border: "none",
                              }}
                            />
                          </div>
                        )}

                      {/* 3) Jawaban teks */}
                      {m.role === "assistant" ? (
                        <div className="w-full mb-6">
                          <AnimatedMessageBubble
                            message={{ role: m.role, content: m.content }}
                            animate={animate}
                            fullWidth
                          />
                        </div>
                      ) : (
                        <div className="mb-6">
                          <AnimatedMessageBubble
                            message={{ role: m.role, content: m.content }}
                            animate={animate}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

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
                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSend={handleSend}
                  placeholder={sending ? "Sending…" : "Ketik pertanyaan…"}
                  expanded
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
