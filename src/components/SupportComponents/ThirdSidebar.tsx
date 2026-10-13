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
          isActive
            ? "bg-indigo-500/10 text-white ring-1 ring-inset ring-indigo-500/25 [&_svg]:text-indigo-300"
            : "text-gray-400 hover:text-white hover:bg-white/5",
        ].join(" ")
      }
    >
      <div className={collapsed ? "w-6 flex justify-center" : ""}>
        <Icon className="shrink-0 text-[17px]" />
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
    "flex items-center h-10 rounded-lg text-sm font-medium transition-all duration-200";

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
      className={`fixed left-0 top-0 z-40 h-screen bg-[#10131b] border-r border-white/5 text-white flex flex-col transition-[width] duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="shrink-0 border-b border-white/5 p-2">
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className={`flex items-center w-full h-11 px-3 rounded-lg text-gray-400 hover:text-white ${
            collapsed ? "justify-center" : "justify-between"
          } bg-transparent hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 transition-colors`}
        >
          <span
            onClick={() => navigate("/home")}
            className={`font-semibold text-base tracking-tight text-white cursor-pointer hover:text-indigo-300 transition-colors ${textTransition} ${
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[10rem]"
            }`}
            title="Back to Home"
          >
            {headerTitle}
          </span>
          <HiOutlineMenu size={20} />
        </button>
      </div>
      <nav ref={historyContainerRef} className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1">
          {mainNav.map((item) => (
            <SidebarItem
              key={item.to}
              {...item}
              collapsed={collapsed}
              baseItem={baseItem}
              labelClass={labelClass}
            />
          ))}
          <hr className="border-white/5 my-3" />
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
              <hr className="border-white/5 my-3" />

              {!collapsed && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 block">
                    History
                  </span>
                  <button
                    onClick={() =>
                      navigate(`/domain/${section}/dashboard/newchat`)
                    }
                    title="New Chat"
                    className="chat-add-btn p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <HiOutlinePlus size={16} />
                  </button>
                </div>
              )}

              <div className="chat-history-list space-y-0.5">
                {historyItems.length === 0 && !collapsed && (
                  <span className="block px-3 py-1 text-sm text-gray-500">
                    No history yet
                  </span>
                )}

                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className={`relative group flex items-center py-2 rounded-lg text-sm transition-colors ${
                      openedId === item.id
                        ? "bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/25"
                        : "hover:bg-white/5"
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
                        <HiOutlineChat className="shrink-0 text-gray-400" />
                      </div>

                      <div className={`${labelClass} flex flex-col min-w-0`}>
                        <span className="truncate text-sm text-gray-200">
                          {item.title}
                        </span>
                        <span className="truncate text-[11px] text-gray-500">
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
                          className="mr-1 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                          aria-haspopup="menu"
                          aria-expanded={menuOpenId === item.id}
                          title="Actions"
                        >
                          <HiDotsVertical />
                        </button>

                        {menuOpenId === item.id && (
                          <div
                            role="menu"
                            className="absolute right-0 bottom-full mb-1 w-44 p-1 rounded-xl border border-white/10 bg-[#1b2030]/95 backdrop-blur-xl shadow-2xl shadow-black/50 z-20"
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
                              className="w-full text-left text-sm px-3 py-2 rounded-lg text-gray-200 hover:bg-white/5"
                            >
                              Copy Link
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => handleExportPdf(item.id)}
                              className="w-full text-left text-sm px-3 py-2 rounded-lg text-gray-200 hover:bg-white/5"
                            >
                              Export to PDF
                            </button>

                            <button
                              role="menuitem"
                              onClick={() => handleDelete(item.id)}
                              className="w-full text-left text-sm px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10"
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
