// src/pages/NewChatPage.tsx
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
import { fetchChartHtml } from "../utils/fetchChart";
import { cleanAndSplitText } from "../utils/cleanText";
import { useChatHistory } from "../hooks/useChatHistory";
import { saveChatMessage, listenMessages } from "../service/chatStore";
import { getAuth } from "firebase/auth";

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
};

export default function NewChatPage() {
  const { section: domain } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const { add } = useChatHistory(domain);

  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  const openedId = searchParams.get("id");
  const isNewConversation = !openedId;

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

  useEffect(() => {
    if (!openedId || !userId || !domain) return;
    const unsub = listenMessages(userId, domain, openedId, (msgs) => {
      setMessages(
        msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.text,
          charts: m.blobUrl
            ? [
                {
                  title: "Chart",
                  html: `<iframe src="${m.blobUrl}" class="w-full h-[400px] border rounded"></iframe>`,
                },
              ]
            : undefined,
        }))
      );
    });
    return () => unsub();
  }, [openedId, userId, domain]);

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

    setMessage("");
    setSending(true);

    const sessionId = openedId ?? `${Date.now()}`;
    if (!openedId) {
      const next = new URLSearchParams(searchParams);
      next.set("id", sessionId);
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });

      add({
        id: sessionId,
        title: text.slice(0, 30) || "Untitled Chat",
        section: domain,
        createdAt: Date.now(),
      });

      toast.success("History added successfully");
    }

    // 🟢 update UI langsung (tanpa nunggu Firestore)
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    await saveChatMessage(userId!, domain, sessionId, "user", text);

    try {
      const res = await queryDomain({
        apiBase: API_BASE,
        domain,
        prompt: text,
        sessionId,
      });

      let chartBlob: Blob | undefined;
      if (res.chart_url) {
        const html = await fetchChartHtml(API_BASE, res.chart_url);
        if (html) {
          chartBlob = new Blob([html], { type: "text/html" });
        }
      }

      await saveChatMessage(
        userId!,
        domain,
        sessionId,
        "assistant",
        res.response ?? "(empty)",
        chartBlob
      );

      // 🟢 langsung update UI biar gak "no message yet"
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.response ?? "(empty)",
          charts: chartBlob
            ? [
                {
                  title: "Chart",
                  html: `<iframe src="${URL.createObjectURL(
                    chartBlob
                  )}" class="w-full h-[400px] border rounded"></iframe>`,
                },
              ]
            : undefined,
        },
      ]);
    } catch (err: unknown) {
      await saveChatMessage(
        userId!,
        domain,
        sessionId,
        "assistant",
        "⚠️ Terjadi kendala memproses pesan."
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Terjadi kendala memproses pesan.",
        },
      ]);
      toast.error(
        err instanceof Error ? err.message : "Gagal memproses permintaan."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      {isNewConversation ? (
        // Tampilan awal (belum ada chat)
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_20rem] gap-6 max-w-7xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center px-2 sm:px-0">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="w-full flex justify-center ml-30">
              <div className="w-full max-w-[680px] px-2 sm:px-0">
                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSend={handleSend}
                  placeholder={"ask about data on convoinsight…"}
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-gray-500 text-center w-full">
              <span className="block mx-auto max-w-[680px] px-3">
                Tips: “Compare revenue m1 vs m0”, “Top 3 drivers of churn”, “QoQ
                growth by channel”
              </span>
            </p>
          </div>

          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      ) : (
        // Tampilan percakapan
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

                  // > 1 chart
                  if (
                    m.role === "assistant" &&
                    m.charts &&
                    m.charts.length > 1
                  ) {
                    const parts = cleanAndSplitText(m.content, m.charts.length);
                    return (
                      <div
                        key={m.id ?? `msg-${i}`}
                        className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0 space-y-6"
                      >
                        {m.charts.map((c, idx) => (
                          <div
                            key={`${m.id ?? i}-chart-${idx}`}
                            className="space-y-3"
                          >
                            <ChartGallery charts={[c]} />
                            <div className="w-full">
                              <AnimatedMessageBubble
                                message={{
                                  role: "assistant",
                                  content: parts[idx] ?? "",
                                }}
                                animate={
                                  animate && idx === m.charts!.length - 1
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // 1 chart
                  if (
                    m.role === "assistant" &&
                    m.charts &&
                    m.charts.length === 1
                  ) {
                    const part = cleanAndSplitText(m.content, 1)[0];
                    return (
                      <div
                        key={m.id ?? `msg-${i}`}
                        className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-2 sm:px-0"
                      >
                        <div className="mb-3">
                          <ChartGallery charts={m.charts} />
                        </div>
                        <div className="w-full">
                          <AnimatedMessageBubble
                            message={{ role: m.role, content: part }}
                            animate={animate}
                            fullWidth
                          />
                        </div>
                      </div>
                    );
                  }

                  // tanpa chart
                  return (
                    <div key={m.id ?? `msg-${i}`} className="w-full">
                      <AnimatedMessageBubble
                        message={{
                          role: m.role,
                          content: cleanAndSplitText(m.content, 1)[0],
                        }}
                        animate={animate}
                      />
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

              <div className="mt-4 w-full flex justify-center">
                <div className="w-full max-w-[680px] mx-auto px-2 sm:px-0">
                  <ChatComposer
                    value={message}
                    onChange={setMessage}
                    onSend={handleSend}
                    placeholder={sending ? "Sending…" : "Type a question…"}
                  />
                </div>
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
