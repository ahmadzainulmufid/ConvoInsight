//src/components/SupportComponents/ThirdSidebar.tsx
import { useEffect, useRef, useState } from "react";
import {
  HiOutlineMenu,
  HiOutlineHome,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlinePlus,
} from "react-icons/hi";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import { signOut } from "firebase/auth";
import { auth } from "../../utils/firebaseSetup";
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
  userName: string;
};

export default function Sidebar({
  collapsed,
  onToggle,
  userName,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const asideRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!menuOpen) return;
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        profileBtnRef.current &&
        !profileBtnRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  const textTransition =
    "whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200";
  const labelClass = `${textTransition} ${
    collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[12rem]"
  }`;

  const baseItem =
    "flex items-center h-10 rounded-md text-sm transition-colors";

  const section = location.pathname.match(/^\/domain\/([^/]+)/)?.[1] || "";

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

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success("Signed out");
      navigate("/", { replace: true });
    } catch {
      toast.error("Gagal sign out, coba lagi");
    }
  };

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

  return (
    <aside
      ref={asideRef}
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

      <nav className="flex-1 overflow-y-auto p-2">
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
        </div>
      </nav>

      <div className="relative border-t border-[#2A2B32] bg-[#2A2B32] px-3 py-3">
        <div className="flex items-center justify-start gap-3">
          {/* Avatar Button */}
          <button
            ref={profileBtnRef}
            onClick={() => setMenuOpen((v) => !v)}
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-xl border-2 border-blue-400 focus:outline-none transition hover:opacity-90"
            style={{ backgroundColor: "#3B82F6" }}
            title={userName}
          >
            {userName.charAt(0).toUpperCase()}
          </button>

          {/* Nama user (opsional, hanya tampil kalau sidebar tidak collapsed) */}
          {!collapsed && (
            <span className="text-sm font-medium text-white truncate max-w-[8rem]">
              {userName}
            </span>
          )}
        </div>

        {/* Popup Sign-Out Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-full mr-3 bottom-3 w-56 bg-[#2d2e30] rounded-lg shadow-lg border border-gray-700 p-3 text-gray-300 z-50"
          >
            {/* Profile Info */}
            <div className="flex items-center gap-3 mb-3 min-w-0">
              <div
                className="flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-white font-semibold text-base border border-blue-400"
                style={{ backgroundColor: "#3B82F6" }}
              >
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate text-sm">
                  {userName}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {auth.currentUser?.email || "No email"}
                </p>
              </div>
            </div>

            {/* Tombol Sign Out */}
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition"
            >
              <FiLogOut />
              Sign Out
            </button>
          </div>
        )}
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-16 left-2 right-2 rounded-md border border-[#3a3b42] bg-[#2A2B32] shadow-xl p-1"
        >
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-[#343541] text-sm"
          >
            <FiLogOut />
            <span className={labelClass.replace("max-w-[12rem]", "max-w-none")}>
              Sign out
            </span>
          </button>
        </div>
      )}
    </aside>
  );
}
