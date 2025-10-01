import { useEffect, useRef, useState } from "react";
import {
  HiOutlineMenu,
  HiOutlineUser,
  HiOutlineHome,
  HiOutlineCog,
  HiOutlineCollection,
  HiOutlineArrowLeft,
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
    "flex items-center gap-3 px-3 h-10 rounded-md text-sm transition-colors";

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
      label: "datasets",
      icon: HiOutlineCollection,
    },
    {
      to: `/domain/${section}/configuration`,
      label: "Configuration Domain",
      icon: HiOutlineCog,
    },
  ];

  const extraNav1 = [
    {
      to: `/domain`,
      label: "Back Domain",
      icon: HiOutlineArrowLeft,
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
            className={`font-semibold text-lg ${textTransition} ${
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[10rem]"
            }`}
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

          <hr className="border-[#2A2B32] my-2" />

          {extraNav1.map((item) => (
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

      <div className="shrink-0 border-t border-[#2A2B32] bg-[#2A2B32]">
        <button
          ref={profileBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className={[
            "flex items-center w-full h-12 text-sm text-white gap-3 hover:bg-[#2F3038]",
            collapsed ? "justify-center px-0" : "px-3",
          ].join(" ")}
          title={userName}
        >
          <HiOutlineUser size={20} />
          <span className={labelClass}>{userName}</span>
        </button>
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
