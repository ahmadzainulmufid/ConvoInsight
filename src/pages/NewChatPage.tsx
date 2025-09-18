import { useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import { useChatHistory } from "../hooks/useChatHistory";
import { toast } from "react-hot-toast";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

type ChatAPIResponse = {
  session_id: string;
  response: string;
  chart_url?: string | null;
  execution_time?: number;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export default function NewChatPage() {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { add } = useChatHistory(section);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const openedId = searchParams.get("id");
  const isNewConversation = !openedId;

  const API_BASE =
    "https://mlbi-pipeline-services-32684464346.asia-southeast2.run.app";

  useEffect(() => {
    if (!openedId) {
      setMessages([]);
      setMessage("");
    }
  }, [openedId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
    });
  }, [messages.length]);

  const title = isNewConversation ? "ConvoInsight" : "Conversation";
  const subtitle = "Chat with your business data assistant";

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");
    setSending(true);

    // simpan ke history saat pesan pertama
    const userMsgCount = nextMsgs.filter((m) => m.role === "user").length;
    if (!openedId && userMsgCount === 1) {
      const id = `${Date.now()}`;
      add({
        id,
        title: text.slice(0, 40) || "Untitled",
        section,
        createdAt: Date.now(),
      });

      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      navigate(`/domain/${section}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });
      toast.success("Chat disimpan ke History");
    }

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: section,
          prompt: text,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data: ChatAPIResponse = await res.json();

      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: data.response,
        },
      ]);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "⚠️ Terjadi kendala memproses pertanyaan.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen p-6 pr-6">
      {isNewConversation ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6 max-w-5xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="mb-3 text-xs text-gray-400">
              All uploaded datasets in domain <b>{section}</b> will be used for
              analysis.
            </div>

            <ChatComposer
              value={message}
              onChange={setMessage}
              onSend={handleSend}
              placeholder="Tanyakan insight bisnis atau analisis data…"
            />

            <p className="mt-2 mr-50 text-xs text-gray-500 text-center">
              Tips: “Compare revenue QoQ”, “Find churn drivers in Mobile”,
              “Forecast sales next month”
            </p>
          </div>
          <div className="hidden lg:block self-start">
            <HistorySidebar open={true} onClose={() => {}} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 max-w-5xl mx-auto">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-center lg:text-left mb-3">
              Conversation
            </h2>

            <div className="mb-3 text-xs text-gray-400">
              All uploaded datasets in domain <b>{section}</b> will be used for
              analysis.
            </div>

            <div className="min-h-[60vh] rounded-md border border-[#2F3038] bg-[#1f2026] p-4 flex flex-col">
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto pr-2 space-y-5"
              >
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const animate = isLast && m.role === "assistant" && !sending;
                  return (
                    <div key={i} className="space-y-2">
                      <AnimatedMessageBubble
                        message={{ role: m.role, content: m.content }}
                        animate={animate}
                      />
                    </div>
                  );
                })}
                {sending && (
                  <div className="text-sm text-gray-400 animate-pulse">
                    Assistant is typing...
                  </div>
                )}
                {messages.length === 0 && (
                  <div className="text-gray-400 text-sm">No Message Yet</div>
                )}
              </div>

              <div className="mt-4">
                <ChatComposer
                  value={message}
                  onChange={setMessage}
                  onSend={handleSend}
                  placeholder={sending ? "Sending…" : "Tulis pertanyaan…"}
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
