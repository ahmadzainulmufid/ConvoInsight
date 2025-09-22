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

  const API_BASE =
    "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

  // resolve Firestore docId dari nama domain
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const id = await getDomainDocId(domain);
        if (!id) {
          toast.error(`Domain "${domain}" tidak ditemukan di Firestore`);
        }
        setDomainDocId(id);
      } catch (e) {
        console.error("Failed to resolve domain docId", e);
        toast.error("Gagal menemukan domain di Firestore");
      }
    })();
  }, [domain]);

  // subscribe Firestore messages
  useEffect(() => {
    if (!domainDocId || !openedId) return;

    const unsub = listenMessages(domainDocId, openedId, (msgs) => {
      const mapped: Msg[] = msgs.map((m) => {
        const charts = m.chartHtml
          ? [{ title: "Chart", html: m.chartHtml }]
          : undefined;
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
      toast.error("Domain tidak ditemukan di Firestore");
      return;
    }

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);

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

      toast.success("Chat disimpan ke History");
    }

    try {
      // simpan pesan user ke Firestore
      await saveChatMessage(domainDocId, sessionId!, "user", text);

      const res = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt: text,
        sessionId,
      });

      let charts: ChartItem[] | undefined;
      let chartHtml: string | undefined;
      const chartUrl: string | null | undefined = res.chart_url ?? null;

      if (chartUrl) {
        try {
          const html = await fetchChartHtml(API_BASE, chartUrl);
          if (html) {
            chartHtml = html;
            charts = [{ title: "Chart", html }];
          }
        } catch (e) {
          console.warn("Fetch chart HTML failed:", e);
        }
      }

      const assistantMsg: Msg = {
        role: "assistant",
        content: cleanResponseText(res.response ?? "(empty)"),
        chartUrl,
        charts,
        animate: true,
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
        err instanceof Error ? err.message : "Gagal memproses permintaan.";
      toast.error(msg);

      const fallback: Msg = {
        role: "assistant",
        content: "⚠️ (fallback) Terjadi kendala memproses pesan.",
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
                    {m.charts && m.charts.length > 0 && (
                      <div className="mb-4">
                        <ChartGallery charts={m.charts} />
                      </div>
                    )}

                    {m.role === "assistant" ? (
                      <div className="w-full mb-6">
                        <AnimatedMessageBubble
                          message={{ role: m.role, content: m.content }}
                          animate={m.animate ?? false} // 🔑 pakai flag
                          fullWidth
                        />
                      </div>
                    ) : (
                      <div className="mb-6">
                        <AnimatedMessageBubble
                          message={{ role: m.role, content: m.content }}
                          animate={m.animate ?? false} // 🔑 pakai flag
                        />
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
