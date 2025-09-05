// components/SupportComponents/Layout.tsx
import { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../HomeComponents/Sidebar";
import SecondarySidebar from "../DomainComponents/SecondarySidebar";
import ThirdSidebar from "./ThirdSidebar";
import { AuthContext } from "../../context/AuthContext";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const user = useContext(AuthContext);

  const userName = user?.email || user?.displayName || "Account";

  const isManageDomain = location.pathname === "/domain/new"; // <= ⬅️ tambahkan
  const inDomainRoot = location.pathname === "/domain"; // root
  const inDomainSection =
    /^\/domain\/[^/]+(?:\/|$)/.test(location.pathname) && !isManageDomain; // <= kecualikan /domain/new

  const primaryWidth = collapsed ? 64 : 256;
  const secondaryWidth = collapsed ? 64 : 256;
  const thirdWidth = collapsed ? 64 : 256;

  // Final paddingLeft
  let paddingLeft = primaryWidth; // default: cuma sidebar1
  if (inDomainRoot) paddingLeft += secondaryWidth; // sidebar1 + sidebar2
  if (inDomainSection) paddingLeft = thirdWidth; // hanya sidebar3

  return (
    <div className="min-h-screen w-screen bg-[#202123]">
      {/* Sidebar1 tampil di semua halaman KECUALI halaman section (bukan /domain & bukan /domain/new) */}
      {!inDomainSection && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          userName={userName}
        />
      )}

      {/* Sidebar2 hanya di /domain (bukan /domain/new) */}
      {inDomainRoot && !isManageDomain && (
        <SecondarySidebar open leftOffset={primaryWidth} />
      )}

      {/* Sidebar3 hanya di halaman section */}
      {inDomainSection && (
        <ThirdSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          userName={userName}
        />
      )}

      <main
        className="min-h-screen w-screen overflow-x-hidden transition-[padding] duration-300 bg-[#1a1b1e] text-[#ECECF1]"
        style={{ paddingLeft }}
      >
        <Outlet />
      </main>
    </div>
  );
}
