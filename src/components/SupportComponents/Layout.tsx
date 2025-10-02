// src/components/SupportComponents/Layout.tsx
import { useState, useContext } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import SecondarySidebar from "./SecondarySidebar";
import ThirdSidebar from "./ThirdSidebar";
import { AuthContext } from "../../context/AuthContext";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const user = useContext(AuthContext);

  const userName = user?.email || user?.displayName || "Account";

  const isManageDomain = location.pathname === "/domain/new";
  const inDomainRoot = location.pathname === "/domain";
  const inDomainSection =
    /^\/domain\/[^/]+(?:\/|$)/.test(location.pathname) && !isManageDomain;

  const primaryWidth = collapsed ? 64 : 256;
  const secondaryWidth = 224;
  const thirdWidth = collapsed ? 64 : 256;

  let paddingLeft = primaryWidth;
  if (inDomainRoot) paddingLeft += secondaryWidth;
  if (inDomainSection) paddingLeft = thirdWidth;

  return (
    <div className="min-h-screen w-screen bg-[#202123]">
      {!inDomainSection && (
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          userName={userName}
        />
      )}

      {/* SecondarySidebar muncul di halaman /domain */}
      {inDomainRoot && !isManageDomain && (
        <SecondarySidebar open leftOffset={primaryWidth} />
      )}

      {/* ThirdSidebar hanya di halaman /domain/[name] */}
      {inDomainSection && (
        <ThirdSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
          userName={userName}
        />
      )}

      {/* Tambahkan paddingLeft sesuai sidebar aktif */}
      <main
        className="min-h-screen w-screen overflow-x-hidden transition-[padding] duration-300 bg-[#1a1b1e] text-[#ECECF1]"
        style={{ paddingLeft }}
      >
        <Outlet />
      </main>
    </div>
  );
}
