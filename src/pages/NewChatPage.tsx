//src/Pages/NewChatPage.tsx
import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { ChatComposer } from "../components/ChatComponents/ChatComposer";
import { ChatInput } from "../components/ChatComponents/ChatInput";
import AnimatedMessageBubble from "../components/ChatComponents/AnimatedMessageBubble";
import { queryDomain, type DomainQueryResp } from "../utils/queryDomain";
import ChartGallery, {
  type ChartItem,
} from "../components/ChatComponents/ChartGallery";
import { useChatHistory } from "../hooks/useChatHistory";
import { fetchChartHtml } from "../utils/fetchChart";
import {
  saveChatMessage,
  listenMessages,
  getDomainDocId,
  updateAssistantMessage,
  updateChatMessage,
  updateChatSessionTitle,
} from "../service/chatStore";
import { FiCopy, FiEdit2, FiCheck, FiX, FiActivity } from "react-icons/fi";
import toast from "react-hot-toast";
import MultiSelectDropdown from "../components/ChatComponents/MultiSelectDropdown";
import SuggestedQuestions from "../components/ChatComponents/SuggestedQuestions";
import { cleanHtmlResponse } from "../utils/cleanHtmlResponse";
import { addNotification } from "../service/notificationStore";
import ChatTour from "../components/OnboardingComponents/ChatTour";
import { db } from "../utils/firebaseSetup";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useAuthUser } from "../utils/firebaseSetup";

/** Type Definitions **/
type ThinkingStep = {
  key: string;
  message: string;
};

type Msg = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  cleanText?: string;
  chartUrl?: string | null;
  charts?: ChartItem[];
  animate?: boolean;
  thinkingSteps?: ThinkingStep[];
};

type DatasetApiItem = {
  filename: string;
  gcs_path: string;
  size: number;
  updated?: string;
};

type ChartUrlFields = Pick<
  DomainQueryResp,
  "chart_url" | "diagram_signed_url" | "diagram_public_url"
>;

type UserConfig = {
  provider: string;
  token: string | null; // 'token' adalah encrypted key Anda
  models: string[];
  selectedModel: string;
  verbosity: string;
  reasoning: string;
  seed: number;
};

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

  const [openedId, setOpenedId] = useState<string | null>(
    searchParams.get("id")
  );
  const isNewConversation = !openedId;

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");

  const [controller, setController] = useState<AbortController | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [availableDatasets, setAvailableDatasets] = useState<string[]>([]);
  const [selectedDatasets, setSelectedDatasets] = useState<string[]>([]);

  // --- STATE BARU UNTUK SIMULASI ---
  const [currentThinkingSteps, setCurrentThinkingSteps] = useState<
    ThinkingStep[]
  >([]);
  const thinkingTimeoutRef = useRef<NodeJS.Timeout[]>([]);

  const [inFlight, setInFlight] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const { user } = useAuthUser();
  const [showTour, setShowTour] = useState(false);

  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);

  const stopAll = () => {
    controller?.abort();
    setIsGenerating(false);
    setSending(false);
    setInFlight(false);
    setEditBusy(false);
    setController(null);
    sessionStorage.removeItem("activeChatGenerating");
    thinkingTimeoutRef.current.forEach(clearTimeout);
    setCurrentThinkingSteps([]);
  };

  useEffect(() => {
    const storedConfig = localStorage.getItem("user_config");
    if (storedConfig) {
      setUserConfig(JSON.parse(storedConfig));
    } else {
      // Jika config tidak ada, beri tahu user
      toast.error(
        "AI configuration not found. Please save your API Key on the Configuration page.",
        {
          duration: 6000,
          id: "config-error",
        }
      ); // Opsional: paksa user kembali ke halaman konfigurasi // navigate("/configuser");
    }
  }, []);

  const pickChartFetchUrl = (
    apiBase: string,
    res?: ChartUrlFields
  ): string | null => {
    if (res?.diagram_signed_url) return res.diagram_signed_url;
    if (res?.diagram_public_url) return res.diagram_public_url;

    const p = res?.chart_url;
    if (p)
      return p.startsWith("http") ? p : `${apiBase.replace(/\/+$/, "")}${p}`;
    return null;
  };

  const stripFences = (s: string) =>
    s
      .replace(/```(?:[^\n`]*)?\n?([\s\S]*?)\n?```/g, "$1")
      .replace(/~~~(?:[^\n~]*)?\n?([\s\S]*?)\n?~~~/g, "$1");

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

  useEffect(() => {
    return () => {
      thinkingTimeoutRef.current.forEach(clearTimeout);
    };
  }, []);

  useLayoutEffect(() => {
    setOpenedId(searchParams.get("id"));

    const wasGenerating =
      sessionStorage.getItem("activeChatGenerating") === "true" ||
      searchParams.get("gen") === "true";

    if (wasGenerating) {
      // langsung aktifkan sebelum render pertama
      setIsGenerating(true);
      sessionStorage.removeItem("activeChatGenerating");
    }
  }, [searchParams]);

  useEffect(() => {
    if (isGenerating === false && searchParams.get("gen") === "true") {
      const next = new URLSearchParams(searchParams);
      next.delete("gen");
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });
    }
  }, [domain, isGenerating, navigate, searchParams]);

  useEffect(() => {
    const checkChatTour = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      // ✅ Munculkan ChatTour jika user sudah selesai Step-5 dan belum pernah lihat Step-6
      if (data.hasSeenConfigTour && !data.hasSeenChatTour) {
        setTimeout(() => setShowTour(true), 600); // kasih sedikit delay biar transisi smooth
      }
    };

    void checkChatTour();
  }, [user]);

  /** Listen to Saved Messages **/
  useEffect(() => {
    if (!domainDocId || !openedId) return;

    const continuing =
      sessionStorage.getItem("activeChatGenerating") === "true" ||
      searchParams.get("gen") === "true";

    // Reset messages ketika user berpindah ke chat baru
    setMessages([]);
    setMessage("");
    setSending(!!continuing);
    setIsGenerating(!!continuing);
    setCurrentThinkingSteps([]);
    thinkingTimeoutRef.current.forEach(clearTimeout);

    type FirestoreMsg = {
      id?: string;
      role: "user" | "assistant";
      text: string;
      chartHtml?: string;
      chartUrl?: string | null;
      thinkingSteps?: ThinkingStep[];
    };

    const unsub = listenMessages(
      domainDocId,
      openedId,
      (msgs: FirestoreMsg[]) => {
        const mapped: Msg[] = msgs.map((m) => {
          const charts: ChartItem[] | undefined = m.chartHtml
            ? [{ html: m.chartHtml }]
            : m.chartUrl
            ? [{ url: m.chartUrl }]
            : undefined;

          return {
            id: m.id,
            role: m.role,
            content:
              m.role === "assistant"
                ? cleanHtmlResponse(m.text)
                : stripFences(m.text),
            charts,
            animate: false,
            thinkingSteps: m.thinkingSteps || undefined,
          };
        });
        setMessages(mapped);
        setTimeout(() => scrollToBottom("auto"), 0);
      }
    );
    return () => unsub();
  }, [domainDocId, openedId, searchParams]);

  /** Fetch Datasets **/
  useEffect(() => {
    if (!domain) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/datasets?domain=${domain}`);
        if (res.ok) {
          const data = await res.json();
          setAvailableDatasets(
            (data.items ?? data.datasets ?? []).map(
              (d: DatasetApiItem) => d.filename
            )
          );
        } else {
          console.error("Failed to fetch datasets:", res.status);
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

  if (!domainDocId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span>Preparing domain connection...</span>
        </div>
      </div>
    );
  }

  /** Handle Send **/
  const handleSend = async (prompt?: string) => {
    if (controller) {
      controller.abort();
      setController(null);
    }

    const text = (prompt || message).trim();
    if (!text || inFlight) return;

    const abortCtrl = new AbortController();
    setController(abortCtrl);

    setInFlight(true);
    setIsGenerating(true);
    setSending(true);
    sessionStorage.setItem("activeChatGenerating", "true");

    if (!domainDocId) {
      toast.error("Please wait, preparing domain connection...");
      return;
    }
    // 🔄 Reset semua animasi berpikir lama
    thinkingTimeoutRef.current.forEach(clearTimeout);
    thinkingTimeoutRef.current = [];
    setCurrentThinkingSteps([]);

    const nextMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMsgs);
    setMessage("");

    let sessionId = searchParams.get("id");
    if (!openedId && nextMsgs.filter((m) => m.role === "user").length === 1) {
      const id = `${Date.now()}`;
      sessionId = id;
      const next = new URLSearchParams(searchParams);
      next.set("id", id);
      sessionStorage.setItem("activeChatGenerating", "true");
      navigate(`/domain/${domain}/dashboard/newchat?${next.toString()}`, {
        replace: true,
      });
      add({
        id,
        title: text.length > 50 ? text.slice(0, 50) + "…" : text,
        section: domain!,
        createdAt: Date.now(),
      });
      await addNotification(
        "chat",
        "New Chat Started",
        `You started a new chat in ${domain}`
      );
      window.history.replaceState(
        null,
        "",
        `/domain/${domain}/dashboard/newchat?${next.toString()}&gen=true`
      );
    }

    try {
      await saveChatMessage(domainDocId, sessionId!, "user", text);

      // ⚡ tampilkan panel "Thinking..." segera (placeholder), nanti kita ganti dengan urutan final
      setCurrentThinkingSteps([
        { key: "pending", message: "Drafting plan..." },
      ]);

      // 🔍 Mulai fetch dari backend (async berjalan paralel dengan animasi di atas)
      const res = await queryDomain({
        apiBase: API_BASE,
        domain: domain!,
        prompt: text,
        sessionId,
        signal: abortCtrl.signal,
        dataset: selectedDatasets.length > 0 ? selectedDatasets : undefined,

        provider: userConfig?.provider,
        model: userConfig?.selectedModel,
        apiKey: userConfig?.token,
        userId: user?.uid,
      });

      // Hilangkan filler seperti "Of course, ..."
      const sanitizeExplainer = (s?: string) =>
        (s || "")
          .trim()
          .replace(/^\s*(?:of course[.,]?\s*)+/i, "")
          .trim();

      // Susun urutan langkah final: Explainer → Router → Orchestrator → (Manipulator/Analyzer/Visualizer) → Compiler
      const buildThinkingSteps = (res: DomainQueryResp): ThinkingStep[] => {
        const steps: ThinkingStep[] = [];
        const explainer = sanitizeExplainer(res.plan_explainer);

        if (explainer) {
          steps.push({ key: "explainer", message: explainer });
        }
        steps.push(
          {
            key: "router",
            message: "Routing and understanding user intent...",
          },
          { key: "orchestrator", message: "Building orchestrator plan..." }
        );
        if (res.need_manipulator) {
          steps.push({
            key: "manipulator",
            message: "Manipulating datasets and cleaning data...",
          });
        }
        if (res.need_analyzer) {
          steps.push({
            key: "analyzer",
            message: "Analyzing dataset patterns and relationships...",
          });
        }
        if (res.need_visualizer) {
          steps.push({
            key: "visualizer",
            message: "Generating visualization for insights...",
          });
        }
        steps.push({ key: "compiler", message: "Preparing response..." });

        return steps;
      };

      // 🧠 bangun langkah final dari hasil backend
      const steps = buildThinkingSteps(res);

      // tampilkan urutan final
      const stepInterval = 600;
      thinkingTimeoutRef.current.forEach(clearTimeout);
      thinkingTimeoutRef.current = [];
      setCurrentThinkingSteps([]);
      steps.forEach((step, idx) => {
        const t = setTimeout(() => {
          setCurrentThinkingSteps((prev) => [...prev, step]);
          scrollToBottom("smooth");
        }, idx * stepInterval);
        thinkingTimeoutRef.current.push(t);
      });

      // Ambil chart kalau ada
      let charts: ChartItem[] | undefined;
      let chartHtml: string | undefined;

      const chartFetchUrl = pickChartFetchUrl(API_BASE, res);
      const chartUrl = chartFetchUrl ?? null;

      if (chartFetchUrl) {
        try {
          const html = await fetchChartHtml(API_BASE, chartFetchUrl);
          if (html) {
            chartHtml = html;
            charts = [{ html }];
          } else {
            charts = [{ url: chartFetchUrl }];
          }
        } catch {
          charts = [{ url: chartFetchUrl }];
        }
      }

      // Bersihkan teks jawaban
      const rawResponse = res.response ?? "(empty)";
      const cleaned = cleanHtmlResponse(rawResponse);

      // 🕒 Tunggu sampai semua langkah selesai tampil
      const totalStepTime = (steps.length + 1) * 600 + 800;

      setTimeout(async () => {
        // Hentikan timeout
        thinkingTimeoutRef.current.forEach(clearTimeout);
        thinkingTimeoutRef.current = [];

        // Kosongkan panel "Analyze..."
        setCurrentThinkingSteps([]);

        // Tampilkan hasil akhir
        const assistantMsg: Msg = {
          role: "assistant",
          chartUrl,
          charts,
          animate: true,
          content: cleaned,
          thinkingSteps: steps,
        };
        setMessages((cur) => [...cur, assistantMsg]);
        scrollToBottom("smooth");

        await saveChatMessage(
          domainDocId,
          sessionId!,
          "assistant",
          assistantMsg.content,
          chartHtml,
          steps,
          chartUrl,
          res.diagram_kind ?? null,
          res.diagram_gs_uri ?? null
        );
        await addNotification(
          "insight",
          "Insight Generated",
          "Your AI insight and chart have been generated successfully!"
        );

        setSending(false);
        setIsGenerating(false);
        setInFlight(false);
        setController(null);
        sessionStorage.removeItem("activeChatGenerating");
      }, totalStepTime);
    } catch (err) {
      console.error(err);
      thinkingTimeoutRef.current.forEach(clearTimeout);
      setCurrentThinkingSteps([]);

      const fallbackMsg: Msg = {
        role: "assistant",
        content: "⚠️ (fallback) There was a problem processing the message.",
        animate: true,
      };
      setMessages((cur) => [...cur, fallbackMsg]);
      scrollToBottom("smooth");
      await saveChatMessage(
        domainDocId!,
        searchParams.get("id")!,
        "assistant",
        fallbackMsg.content
      );

      setSending(false);
      setIsGenerating(false);
      setInFlight(false);
      setController(null);
      sessionStorage.removeItem("activeChatGenerating");
    }
  };

  const handleFinishChatTour = async () => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { hasSeenChatTour: true });
    }
    setShowTour(false);
  };

  /** UI **/
  return (
    <div className="relative min-h-screen p-4 sm:p-6">
      {showTour && <ChatTour onFinish={handleFinishChatTour} />}
      {isNewConversation ? (
        <div className="grid grid-cols-1 gap-6 max-w-7xl mx-auto min-h-[60vh] place-content-center">
          <div className="w-full flex flex-col items-center">
            <div className="mb-6 text-center px-2 sm:px-0">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                {title}
              </h1>
              <p className="mt-2 text-sm text-gray-400">{subtitle}</p>
            </div>

            <div className="w-full flex justify-center">
              <div className="w-full max-w-2xl md:max-w-3xl px-2 sm:px-0">
                <div className="chat-dataset-dropdown mb-3">
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
                  className="chat-input-box"
                  value={message}
                  onChange={setMessage}
                  onSend={() => handleSend()}
                  busy={sending || isGenerating}
                  onStop={() => {
                    controller?.abort();
                    setIsGenerating(false);
                    setSending(false);
                    thinkingTimeoutRef.current.forEach(clearTimeout);
                    setCurrentThinkingSteps([]);
                  }}
                  placeholder="Ask Anything"
                />
              </div>
            </div>

            <SuggestedQuestions
              className="chat-suggested-section"
              onQuestionClick={(q) => {
                if (!domainDocId) {
                  toast.loading("Preparing connection...");
                  setTimeout(() => handleSend(q), 800);
                } else {
                  handleSend(q);
                }
              }}
              domain={domain}
              dataset={
                selectedDatasets.length > 0
                  ? selectedDatasets
                  : availableDatasets
              }
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1">
          <div className="flex flex-col h-[calc(100vh-3rem)] sm:h-[calc(100vh-4rem)]">
            <div
              ref={chatScrollRef}
              className="flex-1 space-y-6 py-4 overflow-y-auto"
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl"
                >
                  {m.role === "assistant" ? (
                    <div className="space-y-3 mb-20">
                      {m.thinkingSteps && (
                        <details className="mb-10">
                          <summary className="text-sm font-semibold text-blue-400 cursor-pointer flex items-center gap-2 hover:underline">
                            <FiActivity className="text-blue-400" />
                            Show the flow of thought
                          </summary>
                          <div className="mt-2 space-y-1 text-sm ml-5">
                            {m.thinkingSteps.map((step) => (
                              <div
                                key={step.key}
                                className="flex items-start gap-2"
                              >
                                <FiCheck
                                  className="text-green-400 mt-0.5 flex-shrink-0"
                                  size={14}
                                />
                                <span className="text-gray-300">
                                  {step.message}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {m.charts && m.charts.length > 0 && (
                        <ChartGallery charts={m.charts} />
                      )}

                      <div
                        className={[
                          "text-gray-200 leading-relaxed",
                          "space-y-2",
                          "[&_p]:my-2",
                          "[&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6",
                          "[&_li]:my-1",
                          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4",
                          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3",
                          "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-2",
                          "[&_blockquote]:border-l-4 [&_blockquote]:border-gray-600 [&_blockquote]:pl-3 [&_blockquote]:italic",
                          "[&_code]:rounded [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-gray-800",
                          "[&_pre]:bg-gray-800 [&_pre]:rounded [&_pre]:p-3 [&_pre]:overflow-auto",
                          "[&_table]:w-full [&_table]:border-collapse",
                          "[&_th]:border [&_th]:border-gray-700 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
                          "[&_td]:border [&_td]:border-gray-700 [&_td]:px-2 [&_td]:py-1",
                          "[&_a]:underline [&_a]:underline-offset-2",
                        ].join(" ")}
                        dangerouslySetInnerHTML={{ __html: m.content }}
                      />
                    </div>
                  ) : (
                    <div className="mb-8 relative group">
                      {editingIndex === i ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = el.scrollHeight + "px";
                              }
                            }}
                            value={editText}
                            onChange={(e) => {
                              setEditText(e.target.value);
                              const el = e.target;
                              el.style.height = "auto";
                              el.style.height = el.scrollHeight + "px";
                            }}
                            disabled={editBusy}
                            className="w-full rounded-lg border border-gray-600 bg-[#1f2026] text-gray-200 p-2 text-sm resize-none overflow-hidden transition-all duration-200 ease-in-out"
                          />
                          <div className="flex gap-2 justify-end text-sm">
                            {editBusy ? (
                              <button
                                onClick={stopAll}
                                className="px-2 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white flex items-center gap-1"
                                title="Stop generating"
                              >
                                ⏹ Stop
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={async () => {
                                    const edited = editText.trim();
                                    if (!edited)
                                      return toast.error(
                                        "Message can't be empty"
                                      );
                                    if (!domainDocId)
                                      return toast.error("Domain not ready");
                                    const sessionId = searchParams.get("id");
                                    if (!sessionId)
                                      return toast.error(
                                        "Session ID not found"
                                      );

                                    setEditingIndex(null);
                                    setEditText("");

                                    // bersihin state lama
                                    thinkingTimeoutRef.current.forEach(
                                      clearTimeout
                                    );
                                    thinkingTimeoutRef.current = [];
                                    setCurrentThinkingSteps([]);
                                    if (controller) {
                                      controller.abort();
                                      setController(null);
                                    }
                                    const newController = new AbortController();
                                    setController(newController);

                                    setSending(true);
                                    setIsGenerating(true);
                                    setInFlight(true);
                                    setEditBusy(true);

                                    // ⬅️ id dokumen pertanyaan lama & id jawaban setelahnya (kalau ada)
                                    const userMsgId = messages[i]?.id;
                                    if (!userMsgId) {
                                      toast.error("User message ID not found.");
                                      setEditingIndex(null);
                                      setEditText("");
                                      setSending(false);
                                      setIsGenerating(false);
                                      return;
                                    }
                                    const nextAssistantId =
                                      messages[i + 1]?.role === "assistant"
                                        ? messages[i + 1]?.id
                                        : null;

                                    // 1) Update pertanyaan di Firestore & UI (tidak bikin bubble baru)
                                    await updateChatMessage(
                                      domainDocId,
                                      userMsgId,
                                      { text: edited }
                                    );
                                    setMessages((prev) => {
                                      const updated = [...prev];
                                      updated[i] = {
                                        ...updated[i],
                                        content: edited,
                                      };
                                      if (updated[i + 1]?.role === "assistant")
                                        updated.splice(i + 1, 1);
                                      return updated;
                                    });

                                    if (i === 0) {
                                      const newTitle =
                                        edited.length > 50
                                          ? edited.slice(0, 50) + "…"
                                          : edited;
                                      await updateChatSessionTitle(
                                        domainDocId,
                                        sessionId!,
                                        newTitle
                                      );
                                    }

                                    // tampilkan placeholder agar panel muncul duluan
                                    setCurrentThinkingSteps([
                                      {
                                        key: "pending",
                                        message: "Drafting plan...",
                                      },
                                    ]);

                                    try {
                                      const res = await queryDomain({
                                        apiBase: API_BASE,
                                        domain: domain!,
                                        prompt: edited,
                                        sessionId,
                                        signal: newController.signal,
                                        dataset:
                                          selectedDatasets.length > 0
                                            ? selectedDatasets
                                            : undefined,

                                        provider: userConfig?.provider,
                                        model: userConfig?.selectedModel,
                                        apiKey: userConfig?.token,
                                        userId: user?.uid,
                                      });

                                      const sanitizeExplainer = (s?: string) =>
                                        (s || "")
                                          .trim()
                                          .replace(
                                            /^\s*(?:of course[.,]?\s*)+/i,
                                            ""
                                          )
                                          .trim();

                                      // Susun urutan langkah final: Explainer → Router → Orchestrator → (Manipulator/Analyzer/Visualizer) → Compiler
                                      const buildThinkingSteps = (
                                        res: DomainQueryResp
                                      ): ThinkingStep[] => {
                                        const steps: ThinkingStep[] = [];
                                        const explainer = sanitizeExplainer(
                                          res.plan_explainer
                                        );

                                        if (explainer) {
                                          steps.push({
                                            key: "explainer",
                                            message: explainer,
                                          });
                                        }
                                        steps.push(
                                          {
                                            key: "router",
                                            message:
                                              "Routing and understanding user intent...",
                                          },
                                          {
                                            key: "orchestrator",
                                            message:
                                              "Building orchestrator plan...",
                                          }
                                        );
                                        if (res.need_manipulator) {
                                          steps.push({
                                            key: "manipulator",
                                            message:
                                              "Manipulating datasets and cleaning data...",
                                          });
                                        }
                                        if (res.need_analyzer) {
                                          steps.push({
                                            key: "analyzer",
                                            message:
                                              "Analyzing dataset patterns and relationships...",
                                          });
                                        }
                                        if (res.need_visualizer) {
                                          steps.push({
                                            key: "visualizer",
                                            message:
                                              "Generating visualization for insights...",
                                          });
                                        }
                                        steps.push({
                                          key: "compiler",
                                          message: "Preparing response...",
                                        });

                                        return steps;
                                      };

                                      // 🧠 bangun langkah final dari hasil backend
                                      const steps = buildThinkingSteps(res);

                                      // tampilkan urutan final
                                      const stepInterval = 600;
                                      thinkingTimeoutRef.current.forEach(
                                        clearTimeout
                                      );
                                      thinkingTimeoutRef.current = [];
                                      setCurrentThinkingSteps([]);
                                      steps.forEach((step, idx) => {
                                        const t = setTimeout(() => {
                                          setCurrentThinkingSteps((prev) => [
                                            ...prev,
                                            step,
                                          ]);
                                          scrollToBottom("smooth");
                                        }, idx * stepInterval);
                                        thinkingTimeoutRef.current.push(t);
                                      });

                                      // chart (optional)
                                      let charts: ChartItem[] | undefined;
                                      let chartHtml: string | undefined;

                                      const chartFetchUrl = pickChartFetchUrl(
                                        API_BASE,
                                        res
                                      );
                                      const chartUrl = chartFetchUrl ?? null;
                                      if (chartFetchUrl) {
                                        try {
                                          const html = await fetchChartHtml(
                                            API_BASE,
                                            chartFetchUrl
                                          );
                                          if (html) {
                                            chartHtml = html;
                                            charts = [{ html }];
                                          } else {
                                            charts = [{ url: chartFetchUrl }];
                                          }
                                        } catch {
                                          charts = [{ url: chartFetchUrl }];
                                        }
                                      }

                                      const cleaned = cleanHtmlResponse(
                                        res.response ?? "(empty)"
                                      );
                                      const totalStepTime =
                                        (steps.length + 1) * stepInterval + 800;

                                      setTimeout(async () => {
                                        // bersih2 thinking
                                        thinkingTimeoutRef.current.forEach(
                                          clearTimeout
                                        );
                                        thinkingTimeoutRef.current = [];
                                        setCurrentThinkingSteps([]);

                                        // 2) Pasang jawaban BARU tepat di bawah pertanyaan (replace if exists)
                                        const newAssistant: Msg = {
                                          role: "assistant",
                                          content: cleaned,
                                          chartUrl,
                                          charts,
                                          animate: true,
                                          thinkingSteps: steps,
                                        };
                                        setMessages((prev) => {
                                          const updated = [...prev];
                                          // selipkan jawaban baru di bawah pertanyaan yang diedit
                                          updated.splice(
                                            i + 1,
                                            0,
                                            newAssistant
                                          );
                                          return updated;
                                        });

                                        // 3) Update/Upsert di Firestore:
                                        if (nextAssistantId) {
                                          // replace dokumen jawaban lama
                                          await updateAssistantMessage(
                                            domainDocId,
                                            nextAssistantId,
                                            cleaned,
                                            chartHtml,
                                            steps,
                                            chartUrl,
                                            res.diagram_kind ?? null,
                                            res.diagram_gs_uri ?? null
                                          );
                                        } else {
                                          // belum ada jawaban → buat satu kali
                                          await saveChatMessage(
                                            domainDocId,
                                            sessionId,
                                            "assistant",
                                            cleaned,
                                            chartHtml,
                                            steps,
                                            chartUrl,
                                            res.diagram_kind ?? null,
                                            res.diagram_gs_uri ?? null
                                          );
                                        }

                                        setSending(false);
                                        setIsGenerating(false);
                                        setInFlight(false);
                                        setEditBusy(false);
                                      }, totalStepTime);
                                    } catch {
                                      thinkingTimeoutRef.current.forEach(
                                        clearTimeout
                                      );
                                      setCurrentThinkingSteps([]);
                                      setSending(false);
                                      setIsGenerating(false);
                                      setInFlight(false);
                                      setEditBusy(false);
                                    }
                                  }}
                                  className="px-2 py-1 rounded bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                                >
                                  <FiCheck size={14} /> Save
                                </button>

                                <button
                                  onClick={() => setEditingIndex(null)}
                                  disabled={editBusy}
                                  className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-1 disabled:opacity-50"
                                >
                                  <FiX size={14} /> Cancel
                                </button>
                              </>
                            )}
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

              {currentThinkingSteps.length > 0 && (
                <div className="mx-auto w-full max-w-3xl md:max-w-4xl xl:max-w-5xl px-1">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Thinking process...
                  </h3>

                  <ul className="space-y-1 text-sm ml-5">
                    {currentThinkingSteps.map((step, index) => {
                      const isDone = index < currentThinkingSteps.length - 1;
                      return (
                        <li key={step.key} className="flex items-center gap-2">
                          {isDone ? (
                            <FiCheck
                              className="text-green-400 flex-shrink-0"
                              size={14}
                            />
                          ) : (
                            <div
                              className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"
                              role="status"
                            />
                          )}
                          <span
                            className={`${
                              isDone ? "text-gray-400" : "text-gray-200"
                            } transition-colors`}
                          >
                            {step.message}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {messages.length === 0 && (
                <div className="text-gray-400 text-sm pl-4 w-full max-w-3xl px-2 sm:px-0">
                  No Message Yet
                </div>
              )}
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
                  busy={inFlight}
                  onStop={() => {
                    controller?.abort();
                    setIsGenerating(false);
                    setSending(false);
                    setInFlight(false);
                    setController(null);
                    sessionStorage.removeItem("activeChatGenerating");
                    thinkingTimeoutRef.current.forEach(clearTimeout);
                    setCurrentThinkingSteps([]);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
