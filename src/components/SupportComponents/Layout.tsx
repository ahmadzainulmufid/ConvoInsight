import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SecondarySidebar from "./SecondarySidebar";
import ThirdSidebar from "./ThirdSidebar";
import Navbar from "../HomeComponents/Navbar";
import RightSidebar from "../HomeComponents/RightSidebar";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Deteksi halaman
  const isManageDomain = location.pathname === "/domain/new";
  const inDomainRoot = location.pathname === "/domain";
  const inDomainSection =
    /^\/domain\/[^/]+(?:\/|$)/.test(location.pathname) && !isManageDomain;

  const showPrimaryLayout =
    !inDomainRoot && !inDomainSection && !isManageDomain;

  const isDashboardSetting = location.pathname.includes(
    "/dashboard/dashboardSetting"
  );
  const isManageSetting = location.pathname.includes(
    "/dashboardSetting/manageSettings"
  );
  const isDatasetDetail =
    location.pathname.includes("/datasets/") &&
    !location.pathname.endsWith("/edit");
  const isDatasetEdit =
    location.pathname.includes("/datasets/") &&
    location.pathname.endsWith("/edit");

  const primaryWidth = collapsed ? 64 : 256;
  const secondaryWidth = 224;
  const thirdWidth = collapsed ? 64 : 256;

  let paddingLeft = 0; // default 0 untuk halaman /home

  if (inDomainRoot) paddingLeft = primaryWidth + secondaryWidth;
  else if (inDomainSection) paddingLeft = thirdWidth;
  else if (showPrimaryLayout) paddingLeft = 0;

  // 🔹 Reset collapsed saat keluar dari domain
  useEffect(() => {
    if (!inDomainRoot && !inDomainSection) {
      setCollapsed(false);
    }
  }, [inDomainRoot, inDomainSection, location.pathname]);

  return (
    <div className={`min-h-screen w-screen flex flex-col`}>
      <div className="bg-white dark:bg-[#202123] text-black dark:text-[#ECECF1] flex-1 flex flex-col">
        {showPrimaryLayout && (
          <>
            <Navbar />
            {/* Kirim state dan fungsi sebagai props */}
            <RightSidebar />
          </>
        )}

        {inDomainRoot && !isManageDomain && (
          <SecondarySidebar open leftOffset={primaryWidth} />
        )}

        {inDomainSection && (
          <>
            <ThirdSidebar
              collapsed={collapsed}
              onToggle={() => setCollapsed((prev) => !prev)}
            />
            {!isDashboardSetting &&
              !isManageSetting &&
              !isDatasetDetail &&
              !isDatasetEdit && <RightSidebar />}
          </>
        )}

        <main
          className="flex-1 overflow-x-hidden transition-[padding] duration-300 bg-[#1a1b1e]"
          style={{
            paddingLeft,
            paddingTop: showPrimaryLayout ? 64 : 0,
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
