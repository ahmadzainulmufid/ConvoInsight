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
        "fixed top-0 h-screen w-56 bg-[#10131b] border-r border-white/5 text-white z-30",
        "transition-transform duration-300",
        open ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
      style={{ left: leftOffset }}
    >
      <div className="h-14 border-b border-white/5 flex items-center px-4 transition-all duration-300">
        <span
          className={`text-[11px] uppercase tracking-wider font-semibold text-gray-400 whitespace-nowrap overflow-hidden transition-[opacity,max-width] duration-200 ${
            open ? "opacity-100 max-w-[10rem]" : "opacity-0 max-w-0"
          }`}
        >
          Domain
        </span>
      </div>

      <nav className="p-3 space-y-1">
        {/* Tambahkan tombol new domain */}
        {mainNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 h-10 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 ring-1 ring-inset ring-indigo-500/25"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}

        <hr className="border-white/5 my-3" />

        {/* List domain */}
        {domains.map((d) => {
          const to = `/domain/${encodeURIComponent(d.name)}/datasets`;
          return (
            <NavLink
              key={d.id}
              to={to}
              className={({ isActive }) =>
                `px-3 h-10 rounded-lg text-sm flex items-center gap-2.5 transition-colors ${
                  isActive
                    ? "bg-white/5 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`
              }
            >
              <span className="h-6 w-6 shrink-0 grid place-items-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-[11px] font-semibold text-indigo-200">
                {d.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">{d.name}</span>
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
