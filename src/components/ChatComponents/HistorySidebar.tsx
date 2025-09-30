import { useChatHistory } from "../../hooks/useChatHistory";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { HiOutlinePlus, HiDotsVertical } from "react-icons/hi";
import {
  getDomainDocId,
  listenMessages,
  type ChatMessage,
} from "../../service/chatStore";
import { exportChatToPdf } from "../../utils/exportPdf";

export default function HistorySidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { section } = useParams();
  const { items, remove } = useChatHistory(section);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openedId = searchParams.get("id");

  // state untuk kebab per-item
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // tutup kebab kalau klik di luar
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const handleNewChat = () => {
    navigate(`/domain/${section}/dashboard/newchat`, { replace: true });
    onClose();
  };

  const handleExportPdf = async (id: string) => {
    try {
      if (!section) return;
      const domainDocId = await getDomainDocId(section);
      if (!domainDocId) {
        console.warn("Domain not found:", section);
        return;
      }

      const msgs: (ChatMessage & { chartHtml?: string })[] = [];

      const unsub = listenMessages(domainDocId, id, (snap) => {
        msgs.splice(0, msgs.length, ...snap);
      });
      unsub();

      if (msgs.length === 0) {
        alert("Tidak ada messages");
        return;
      }

      await exportChatToPdf(msgs, `chat-${id}.pdf`);
    } catch (e) {
      console.error("Export PDF gagal:", e);
    }

    setMenuOpenId(null);
  };

  const handleDelete = (id: string) => {
    remove(id);
    setMenuOpenId(null);

    if (openedId === id) {
      navigate(`/domain/${section}/dashboard/newchat`, { replace: true });
    }
  };

  return (
    <aside
      className={[
        "fixed top-0 right-0 h-screen w-72 bg-[#202123] text-white z-40",
        "border-l border-[#2F3038]",
        "transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
      aria-label="Chat History"
    >
      {/* HEADER */}
      <div className="h-12 px-2 border-b border-[#2F3038] flex items-center justify-between gap-2">
        <span className="text-sm font-semibold px-1">History</span>

        <div className="ml-auto flex items-center gap-1">
          {/* New Chat (+) */}
          <button
            onClick={handleNewChat}
            className="p-2 rounded hover:bg-[#2A2B32]"
            title="New chat"
            aria-label="New chat"
          >
            <HiOutlinePlus size={18} />
          </button>
        </div>
      </div>

      {/* LIST */}
      <div
        ref={containerRef}
        className="p-2 space-y-2 overflow-y-auto h-[calc(100%-3rem)]"
      >
        {items.length === 0 && (
          <p className="text-sm text-gray-400 px-2">There is no history yet</p>
        )}

        {items.map((it) => (
          <div
            key={it.id}
            className="rounded-md border border-[#3a3b42] p-2 bg-[#1f2026] relative"
          >
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  navigate(`/domain/${section}/dashboard/newchat?id=${it.id}`)
                }
                className="flex-1 text-left text-sm text-white hover:underline truncate"
                title={it.title}
              >
                {it.title}
              </button>

              {/* Kebab menu (titik 3) */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpenId((prev) => (prev === it.id ? null : it.id));
                  }}
                  className="px-2 py-1 rounded hover:bg-[#2A2B32]"
                  aria-haspopup="menu"
                  aria-expanded={menuOpenId === it.id}
                  title="Actions"
                >
                  <HiDotsVertical />
                </button>

                {menuOpenId === it.id && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1 w-40 rounded-md border border-[#3a3b42] bg-[#2A2B32] shadow-lg z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      role="menuitem"
                      onClick={() => handleExportPdf(it.id)}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-[#343541]"
                    >
                      Export to PDF
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => handleDelete(it.id)}
                      className="w-full text-left text-sm px-3 py-2 hover:bg-[#343541] text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-1 text-[11px] text-gray-400">
              {new Date(it.createdAt).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
