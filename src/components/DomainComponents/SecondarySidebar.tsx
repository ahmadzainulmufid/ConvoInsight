import { NavLink } from "react-router-dom";

export default function SecondarySidebar({
  open,
  leftOffset,
}: {
  open: boolean;
  leftOffset: number;
}) {
  return (
    <aside
      className={[
        "fixed top-0 h-screen w-56 bg-[#202123] text-white z-30",
        "transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      style={{ left: leftOffset }}
    >
      <div className="h-12 border-b border-[#3a3b42] flex items-center px-3">
        <span className="text-sm font-semibold">Domain</span>
      </div>

      <nav className="p-2 space-y-2">
        {[
          { to: "/domain/Campaign/datasets", label: "Campaign" },
          { to: "/domain/Fixed/datasets", label: "Fixed" },
          { to: "/domain/Mobile/datasets", label: "Mobile" },
        ].map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `px-3 h-10 rounded-md text-sm flex items-center ${
                isActive ? "bg-[#343541]" : "hover:bg-[#2A2B32]"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
