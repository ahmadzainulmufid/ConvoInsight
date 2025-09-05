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

  const inDomainRoot = location.pathname === "/domain";
  const inDomainSection = /^\/domain\/[^/]+(?:\/|$)/.test(location.pathname);

  // ambil display dari Firebase
  const userName = user?.email || user?.displayName || "Account";

  const primaryWidth = collapsed ? 64 : 256;
  const secondaryWidth = collapsed ? 64 : 256;
  const thirdWidth = collapsed ? 64 : 256;

  // Final paddingLeft
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

      {inDomainRoot && <SecondarySidebar open leftOffset={primaryWidth} />}

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
