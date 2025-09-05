import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import { useChatHistory } from "../hooks/useChatHistory";
import toast from "react-hot-toast";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";

type Msg = { role: "user" | "assistant"; content: string };

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

  // API base opsional via env, fallback ke localhost
  const API_BASE =
    (import.meta as ImportMeta)?.env?.VITE_API_BASE || "http://127.0.0.1:5000";

  // reset saat tidak ada openedId
  useEffect(() => {
    if (!openedId) {
      setMessages([]);
      setMessage("");
    }
  }, [openedId]);

  // auto-scroll tiap ada pesan baru
  useEffect(() => {
    requestAnimationFrame(() => {
      chatScrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
    });
  }, [messages.length]);

  const title = useMemo(
    () => (isNewConversation ? "ConvoInsight" : "Conversation"),
    [isNewConversation]
  );
  const subtitle = "Chat with your business data assistant";

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;

    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setMessage("");
    setSending(true);

    // saat pesan user pertama → buat id, simpan ke history, dan navigate ke URL dengan ?id=...
    const userMsgCount = next.filter((m) => m.role === "user").length;
    if (!openedId && userMsgCount === 1) {
      const id = `${Date.now()}`;
      add({
        id,
        title: text.slice(0, 40) || "Untitled",
        section,
        createdAt: Date.now(),
      });
      navigate(`/domain/${section}/dashboard/newchat?id=${id}`, {
        replace: true,
      });
      toast.success("Chat disimpan ke History");
    }

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try {
          const j = await res.json();
          detail = j?.error || detail;
        } catch {
          /* empty */
        }
        throw new Error(detail);
      }
      const data: { reply?: string; error?: string } = await res.json();
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: data.reply || data.error || "(no reply)",
        },
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Gagal panggil GPT: ${errorMsg}`);
      // fallback agar UI tidak “buntu”
      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: "⚠️ (fallback) Terjadi kendala memanggil API.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative min-h-screen p-6 pr-6">
      {isNewConversation ? (
        // LANDING: composer + tips + sidebar
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_18rem] gap-6 max-w-5xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <ChatComposer
              value={message}
              onChange={setMessage}
              onSend={handleSend}
              placeholder="Ask about your metrics, trends, or anomalies…"
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
        // MODE CHAT: tampilkan bubble chat + composer + sidebar
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-6 max-w-5xl mx-auto">
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold text-center lg:text-left mb-3">
              Conversation
            </h2>

            <div className="min-h-[60vh] rounded-md border border-[#2F3038] bg-[#1f2026] p-4 flex flex-col">
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto pr-2 space-y-3"
              >
                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const animate = isLast && m.role === "assistant" && !sending;
                  return (
                    <AnimatedMessageBubble
                      key={i}
                      message={m}
                      animate={animate}
                    />
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
                  placeholder={sending ? "Sending…" : "Write a message for AI…"}
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
