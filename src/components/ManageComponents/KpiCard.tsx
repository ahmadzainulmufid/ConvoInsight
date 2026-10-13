type KpiCardProps = {
  title?: string;
  mainValue: string | number;
  unit?: string;
  color?: "blue" | "red";
  subItems?: { label: string; value: string }[];
};

export default function KpiCard({
  title,
  mainValue,
  unit,
  color = "blue",
  subItems = [],
}: KpiCardProps) {
  const baseColor =
    color === "blue"
      ? "bg-gradient-to-br from-sky-500/25 via-indigo-500/10 to-transparent ring-sky-400/30 text-white"
      : "bg-gradient-to-br from-rose-500/25 via-rose-500/10 to-transparent ring-rose-400/30 text-white";

  const allItems = [
    { label: title || "", value: mainValue?.toString() || "" },
    ...subItems,
  ];

  return (
    <div
      className={`rounded-2xl px-4 py-5 ring-1 ring-inset bg-[#151923] shadow-[var(--shadow-card)] ${baseColor} flex justify-around items-center min-w-[240px] text-center`}
    >
      {allItems.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center px-2 relative">
          <span className="text-3xl font-semibold tracking-tight leading-tight">
            {item.value}
            {idx === 0 && unit && (
              <span className="text-base ml-1 text-gray-300">{unit}</span>
            )}
          </span>
          <p className="text-xs text-gray-400 mt-1.5 whitespace-nowrap">
            {item.label}
          </p>

          {/* Garis titik-titik antar item */}
          {idx !== allItems.length - 1 && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 border-r border-white/15"></div>
          )}
        </div>
      ))}
    </div>
  );
}
