// components/DomainComponents/SecondarySidebar.tsx
import { NavLink } from "react-router-dom";
import { useDomains } from "../../hooks/useDomains";
import { HiOutlinePlus } from "react-icons/hi";

export default function SecondarySidebar({
  open,
  leftOffset,
}: {
  open: boolean;
  leftOffset: number;
}) {
  const { domains } = useDomains();

  const mainNav = [
    { to: "/domain/new", label: "New Domain", icon: HiOutlinePlus },
  ];

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
        {/* Tambahkan tombol new domain */}
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 h-10 rounded-md text-sm flex items-center gap-2 ${
                isActive ? "bg-[#343541]" : "hover:bg-[#2A2B32]"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        <hr className="border-[#2A2B32] my-2" />

        {/* List domain */}
        {domains.map((d) => {
          const to = `/domain/${encodeURIComponent(d.name)}/datasets`;
          return (
            <NavLink
              key={d.id}
              to={to}
              className={({ isActive }) =>
                `px-3 h-10 rounded-md text-sm flex items-center ${
                  isActive ? "bg-[#343541]" : "hover:bg-[#2A2B32]"
                }`
              }
            >
              {d.name}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
