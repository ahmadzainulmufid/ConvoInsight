import { useMemo, useRef, useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import HistorySidebar from "../components/ChatComponents/HistorySidebar";
import { useChatHistory } from "../hooks/useChatHistory";
import toast from "react-hot-toast";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";
import { askDataset, type AskResult, type DataRow } from "../utils/askDataset";
import ChartGallery from "../components/ChatComponents/ChartGallery";

type Msg = {
  role: "user" | "assistant";
  content: string;
  analysis?: string;
  charts?: AskResult["charts"];
  preview?: { columns: string[]; rows: DataRow[] };
};
type ChatAPIResponse = { reply?: string; error?: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

type DatasetItem = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

function loadDatasetsForSection(section?: string | null): DatasetItem[] {
  const key = section ? `datasets_${section}` : "datasets";
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function NewChatPage() {
  const { section } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { add } = useChatHistory(section);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const openedId = searchParams.get("id");
  const isNewConversation = !openedId;

  const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:5000";

  const datasets = useMemo(() => loadDatasetsForSection(section), [section]);

  // ⛔️ HILANGKAN auto-select dataset agar default selalu GENERAL
  const [datasetId, setDatasetId] = useState<string | null>(
    searchParams.get("datasetId") || null
  );

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

  function formatAskText(r: AskResult): string {
    // tampilkan answer + SQL; analysis dan charts dirender terpisah
    const previewCols = r.columns.slice(0, 6);
    const previewRows = r.rows.slice(0, 5);

    const header = previewCols.join(" | ");
    const sep = previewCols.map(() => "---").join(" | ");
    const body = previewRows
      .map((row) => previewCols.map((c) => String(row[c] ?? "")).join(" | "))
      .join("\n");

    const table = previewCols.length
      ? `\n\nPreview (max 5 rows):\n${header}\n${sep}\n${body}`
      : "";

    return `${r.answer}\n\nSQL:\n\`\`\`sql\n${r.sql}\n\`\`\`${table}`;
  }

  function onSelectDataset(id: string | "") {
    const nextId = id || null;
    setDatasetId(nextId);
    const next = new URLSearchParams(searchParams);
    if (nextId) next.set("datasetId", nextId);
    else next.delete("datasetId");
    setSearchParams(next, { replace: true });
  }

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
      if (datasetId) next.set("datasetId", datasetId);
      navigate(`/domain/${section}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });
      toast.success("Chat disimpan ke History");
    }

    try {
      // === Jika ada dataset dipilih: panggil /api/ask-dataset ===
      if (datasetId) {
        const res = await askDataset(datasetId, text);
        setMessages((cur) => [
          ...cur,
          {
            role: "assistant",
            content: formatAskText(res),
            analysis: res.analysis,
            charts: res.charts,
            preview: { columns: res.columns, rows: res.rows.slice(0, 5) },
          },
        ]);
        return;
      }

      // === GENERAL CHAT (tanpa dataset) ===
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMsgs }),
      });

      let data: ChatAPIResponse | undefined;
      try {
        data = (await res.json()) as ChatAPIResponse;
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        const detail = data?.error ?? `HTTP ${res.status}`;
        throw new Error(detail);
      }

      const replyText =
        typeof data?.reply === "string"
          ? data.reply
          : data?.error ?? "(no reply)";

      setMessages((cur) => [
        ...cur,
        {
          role: "assistant",
          content: replyText,
          // jangan kirim analysis/charts di general chat
        },
      ]);
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err);
      toast.error(errorMsg);
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

  const DatasetSelector = (
    <div className="flex items-center gap-2 mb-3">
      <label className="text-xs text-gray-400">Dataset:</label>
      <select
        value={datasetId ?? ""}
        onChange={(e) => onSelectDataset(e.target.value)}
        className="bg-[#2A2B32] text-gray-200 text-sm rounded-md px-2 py-1 border border-[#2F3038]"
      >
        <option value="">(None – general chat)</option>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      <span className="text-xs text-gray-500">
        • {datasetId ? "pertanyaan dianalisis ke dataset" : "mode general chat"}
      </span>
    </div>
  );

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

            <div className="w-full max-w-2xl">{DatasetSelector}</div>

            <ChatComposer
              value={message}
              onChange={setMessage}
              onSend={handleSend}
              placeholder={
                datasetId
                  ? "Tanya tentang dataset terpilih…"
                  : "Tanya hal umum tentang bisnis, tren, atau insight…"
              }
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

            {DatasetSelector}

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

                      {/* Analisis deskriptif dari backend */}
                      {m.analysis && m.role === "assistant" && (
                        <div className="rounded-md bg-[#24252c] border border-[#2F3038] p-3 text-sm text-gray-200 whitespace-pre-wrap">
                          {m.analysis}
                        </div>
                      )}

                      {/* Chart gallery (Plotly atau fallback img) */}
                      {m.charts && m.charts.length > 0 && (
                        <ChartGallery charts={m.charts} />
                      )}

                      {/* Preview table kecil */}
                      {m.preview && m.preview.columns.length > 0 && (
                        <div className="overflow-x-auto text-xs">
                          <table className="min-w-[480px] border border-[#2F3038]">
                            <thead>
                              <tr className="bg-[#2A2B32]">
                                {m.preview.columns.map((c) => (
                                  <th
                                    key={c}
                                    className="px-2 py-1 text-left border-b border-[#2F3038]"
                                  >
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {m.preview.rows.map((r, idx) => (
                                <tr key={idx} className="odd:bg-[#1f2026]">
                                  {m.preview!.columns.map((c) => (
                                    <td
                                      key={c}
                                      className="px-2 py-1 border-b border-[#2F3038]"
                                    >
                                      {String(r[c] ?? "")}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="text-[10px] text-gray-500 mt-1">
                            Preview (max 5 rows)
                          </div>
                        </div>
                      )}
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
                  placeholder={
                    sending
                      ? "Sending…"
                      : datasetId
                      ? "Tanya tentang dataset terpilih…"
                      : "Tulis pertanyaan umum ke AI…"
                  }
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
