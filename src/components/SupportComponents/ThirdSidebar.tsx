// src/components/SupportComponents/ThirdSidebar.tsx
import { useState, useRef, useEffect } from "react";
import {
  HiOutlineMenu,
  HiOutlineHome,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlinePlus,
  HiOutlineChat,
  HiDotsVertical,
} from "react-icons/hi";
import {
  NavLink,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { useChatHistory } from "../../hooks/useChatHistory";
import {
  getDomainDocId,
  listenMessages,
  type ChatMessage,
} from "../../service/chatStore";
import { exportChatToPdf } from "../../utils/exportPdf";
import toast from "react-hot-toast";

function SidebarItem({
  to,
  label,
  icon: Icon,
  collapsed,
  baseItem,
  labelClass,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  collapsed: boolean;
  baseItem: string;
  labelClass: string;
}) {
  return (
    <NavLink
      to={to}
      end
      title={label}
      className={({ isActive }) =>
        [
          baseItem,
          collapsed ? "justify-center px-0 gap-0" : "justify-start px-3 gap-3",
          isActive ? "bg-[#343541]" : "hover:bg-[#2A2B32]",
        ].join(" ")
      }
    >
      <div className={collapsed ? "w-6 flex justify-center" : ""}>
        <Icon className="shrink-0" />
      </div>
      <span className={labelClass}>{label}</span>
    </NavLink>
  );
}

export type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const openedId = searchParams.get("id");

  const section = location.pathname.match(/^\/domain\/([^/]+)/)?.[1] || "";
  const { items: historyItems, remove } = useChatHistory(section);

  const isNewChatPage = location.pathname.endsWith("/dashboard/newchat");

  const textTransition =
    "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200";
  const labelClass = `${textTransition} ${
    collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[12rem]"
  }`;

  const baseItem =
    "flex items-center h-10 rounded-md text-sm transition-colors";

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const historyContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!historyContainerRef.current) return;
      if (!historyContainerRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener("click", onDocClick, true);
    return () => document.removeEventListener("click", onDocClick, true);
  }, []);

  const mainNav = [
    {
      to: `/domain/${section}/dashboard`,
      label: "Dashboard",
      icon: HiOutlineHome,
    },
    {
      to: `/domain/${section}/dashboard/newchat`,
      label: "New Chat",
      icon: HiOutlinePlus,
    },
  ];

  const extraNav = [
    {
      to: `/domain/${section}/datasets`,
      label: "Datasets",
      icon: HiOutlineCollection,
    },
    {
      to: `/domain/${section}/configuration`,
      label: "Configuration Domain",
      icon: HiOutlineCog,
    },
  ];

  const toTitle = (s: string) =>
    decodeURIComponent(s)
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  const domainMatch = location.pathname.match(/^\/domain(?:\/([^/]+))?/);
  const headerTitle = domainMatch
    ? domainMatch[1]
      ? toTitle(domainMatch[1])
      : "Domain"
    : "ConvoInsight";

  const handleExportPdf = async (id: string) => {
    try {
      if (!section) return;
      const domainDocId = await getDomainDocId(section);
      if (!domainDocId) {
        alert("Domain not found.");
        return;
      }

      const msgs = await new Promise<(ChatMessage & { chartHtml?: string })[]>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Timeout fetching messages"));
          }, 8000);
          const unsub = listenMessages(domainDocId, id, (snap) => {
            clearTimeout(timeout);
            unsub();
            resolve(snap);
          });
        }
      );

      if (!msgs || msgs.length === 0) {
        alert("No messages in this session.");
        return;
      }

      await exportChatToPdf(msgs, `chat-${id}.pdf`, {
        domain: section ?? "-",
        sessionId: id,
        generatedAt: new Date(),
      });
    } catch (e) {
      console.error("Export PDF failed:", e);
      alert("Export PDF failed. Try again.");
    } finally {
      setMenuOpenId(null);
    }
  };

  const handleDelete = (id: string) => {
    remove(id, section);
    setMenuOpenId(null); // Jika chat yang aktif dihapus, kembali ke newchat
    if (openedId === id) {
      navigate(`/domain/${section}/dashboard/newchat`, { replace: true });
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 h-screen bg-[#202123] text-white flex flex-col transition-[width] duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="shrink-0 border-b border-[#202123]">
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className={`flex items-center w-full h-12 px-3 ${
            collapsed ? "justify-center" : "justify-between"
          } bg-[#2A2B32] hover:bg-[#2F3038] focus:outline-none focus:ring-2 focus:ring-white/20`}
        >
          <span
            onClick={() => navigate("/home")}
            className={`font-semibold text-lg cursor-pointer hover:underline hover:text-gray-300 transition-colors ${textTransition} ${
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[10rem]"
            }`}
            title="Back to Home"
          >
            {headerTitle}
          </span>
          <HiOutlineMenu size={20} />
        </button>
      </div>
      <nav ref={historyContainerRef} className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {mainNav.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              baseItem={baseItem}
              labelClass={labelClass}
            />
          ))}
          <hr className="border-[#2A2B32] my-2" />
          {extraNav.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              baseItem={baseItem}
              labelClass={labelClass}
            />
          ))}
          {isNewChatPage && (
            <>
              <hr className="border-[#2A2B32] my-2" />

              {!collapsed && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs font-semibold text-gray-400 block">
                    History
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/domain/${section}/dashboard/newchat`)
                    }
                    title="New Chat"
                    className="chat-add-btn p-1 rounded text-gray-400 hover:text-white hover:bg-[#2A2B32]"
                  >
                    <HiOutlinePlus size={16} />
                  </button>
                </div>
              )}

              <div className="chat-history-list">
                {historyItems.length === 0 && !collapsed && (
                  <span className="px-3 py-1 text-sm text-gray-500 italic">
                    No history yet
                  </span>
                )}

                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group flex items-center py-2 rounded-md text-sm transition-colors ${
                      openedId === item.id
                        ? "bg-[#343541]"
                        : "hover:bg-[#2A2B32]"
                    }`}
                  >
                    <NavLink
                      to={`/domain/${section}/dashboard/newchat?id=${item.id}`}
                      title={item.title}
                      className={`flex-1 flex items-center min-w-0 ${
                        collapsed
                          ? "justify-center px-0 gap-0"
                          : "justify-start px-3 gap-3"
                      }`}
                    >
                      <div
                        className={collapsed ? "w-6 flex justify-center" : ""}
                      >
                        <HiOutlineChat className="shrink-0" />
                      </div>

                      <div className={`${labelClass} flex flex-col min-w-0`}>
                        <span className="truncate text-sm text-white">
                          {item.title}
                        </span>
                        <span className="truncate text-[11px] text-gray-400">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </NavLink>

                    {!collapsed && (
                      <div className="relative z-10 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenId((prev) =>
                              prev === item.id ? null : item.id
                            );
                          }}
                          className="px-2 py-1 rounded hover:bg-[#343541] opacity-0 group-hover:opacity-100 focus:opacity-100"
                          aria-haspopup="menu"
                          aria-expanded={menuOpenId === item.id}
                          title="Actions"
                        >
                          <HiDotsVertical />
                        </button>

                        {menuOpenId === item.id && (
                          <div
                            role="menu"
                            className="absolute right-0 bottom-full mb-1 w-40 rounded-md border border-[#3a3b42] bg-[#2A2B32] shadow-lg z-20"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              role="menuitem"
                              onClick={async () => {
                                const baseUrl = window.location.origin;
                                const fullUrl = `${baseUrl}/domain/${section}/dashboard/newchat?id=${item.id}`;
                                await navigator.clipboard.writeText(fullUrl);
                                toast.success("✅ Link copied to clipboard!");
                                setMenuOpenId(null);
                              }}
                              className="w-full text-left text-sm px-3 py-2 hover:bg-[#343541] rounded-t-md"
                            >
                              Copy Link
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => handleExportPdf(item.id)}
                              className="w-full text-left text-sm px-3 py-2 hover:bg-[#343541]"
                            >
                              Export to PDF
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => handleDelete(item.id)}
                              className="w-full text-left text-sm px-3 py-2 hover:bg-[#343541] text-red-400 rounded-b-md"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </nav>
    </aside>
  );
}
