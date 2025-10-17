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
    color === "blue" ? "bg-[#4AA6C5] text-black" : "bg-[#D94C4C] text-white";

  const allItems = [
    { label: title || "", value: mainValue?.toString() || "" },
    ...subItems,
  ];

  return (
    <div
      className={`rounded-xl p-3 shadow-md ${baseColor} flex justify-around items-center min-w-[240px] text-center`}
    >
      {allItems.map((item, idx) => (
        <div key={idx} className="flex flex-col items-center px-2 relative">
          <span className="text-3xl font-bold leading-tight">
            {item.value}
            {idx === 0 && unit && (
              <span className="text-base ml-1">{unit}</span>
            )}
          </span>
          <p className="text-xs opacity-80 mt-1 whitespace-nowrap">
            {item.label}
          </p>

          {/* Garis titik-titik antar item */}
          {idx !== allItems.length - 1 && (
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 h-8 border-r-2 border-dotted border-black/40"></div>
          )}
        </div>
      ))}
    </div>
  );
}
