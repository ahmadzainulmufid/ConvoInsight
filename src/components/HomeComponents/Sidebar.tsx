import { useEffect, useRef, useState } from "react";
import {
  HiOutlineMenu,
  HiOutlinePlus,
  HiOutlineUser,
  HiOutlineHome,
  HiOutlineCollection,
} from "react-icons/hi";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const asideRef = useRef<HTMLDivElement>(null);
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close popover jika klik di luar / tekan ESC
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

  // baseItem tanpa px/gap — kita kondisikan per state collapsed/expanded
  const baseItem =
    "flex items-center h-10 rounded-md text-sm transition-colors";

  const navItems = [
    { to: "/home", label: "Home", icon: HiOutlineHome },
    { to: "/domain", label: "Domain", icon: HiOutlineCollection },
  ];

  const handleSignOut = () => {
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <aside
      ref={asideRef}
      className={`fixed left-0 top-0 z-40 h-screen bg-[#202123] text-white flex flex-col transition-[width] duration-300 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Header / Toggle */}
      <div className="shrink-0 border-b border-[#202123]">
        <button
          onClick={onToggle}
          aria-label="Toggle sidebar"
          className={`flex items-center w-full h-12
    ${collapsed ? "justify-center" : "justify-between"}
    bg-transparent hover:bg-white/5
    focus:outline-none focus:ring-0 px-3`}
        >
          <span
            className={`font-semibold text-lg ${textTransition} ${
              collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-[10rem]"
            }`}
          >
            ConvoInsight
          </span>
          <HiOutlineMenu size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                [
                  baseItem,
                  collapsed
                    ? "justify-center px-0 gap-0"
                    : "justify-start px-3 gap-3",
                  isActive ? "bg-[#343541]" : "hover:bg-[#2A2B32]",
                ].join(" ")
              }
            >
              {/* Wrapper w-6 utk konsistensi lebar ikon dan centering saat collapsed */}
              <div className={collapsed ? "w-6 flex justify-center" : ""}>
                <Icon className="shrink-0" />
              </div>
              <span className={labelClass}>{label}</span>
            </NavLink>
          ))}

          {/* New Domain */}
          <Link
            to="new"
            title="New Domain"
            className={[
              baseItem,
              collapsed
                ? "justify-center px-0 gap-0"
                : "justify-start px-3 gap-3",
              "hover:bg-[#2A2B32]",
            ].join(" ")}
          >
            <div className={collapsed ? "w-6 flex justify-center" : ""}>
              <HiOutlinePlus className="shrink-0" />
            </div>
            <span className={labelClass}>New Domain</span>
          </Link>
        </div>
      </nav>

      {/* Profile + Popover */}
      <div className="shrink-0 border-t border-[#2A2B32] bg-[#2A2B32]">
        <button
          ref={profileBtnRef}
          onClick={() => setMenuOpen((v) => !v)}
          className={[
            "flex items-center w-full h-12 text-sm text-white hover:bg-[#2F3038] px-3",
            collapsed ? "justify-center gap-0" : "justify-start gap-3",
          ].join(" ")}
          title={userName}
        >
          <div className={collapsed ? "w-6 flex justify-center" : ""}>
            <HiOutlineUser size={20} />
          </div>
          <span className={labelClass}>{userName}</span>
        </button>
      </div>

      {/* Popover menu */}
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
