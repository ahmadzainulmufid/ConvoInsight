import { FiArrowUp, FiArrowDown } from "react-icons/fi";

type KpiCardProps = {
  title?: string;
  mainValue: string | number;
  unit?: string;
  color?: "blue" | "red";
  deltaItems?: {
    label: string;
    value: string;
    trend?: "up" | "down" | "neutral";
  }[];
  subItems?: {
    label: string;
    value: string;
  }[];
};

export default function KpiCard({
  title,
  mainValue,
  unit,
  color = "blue",
  deltaItems,
  subItems,
}: KpiCardProps) {
  const baseColor =
    color === "blue" ? "bg-[#4AA6C5] text-black" : "bg-[#D94C4C] text-white";

  return (
    <div
      className={`rounded-xl p-4 shadow-md ${baseColor} flex flex-col justify-between min-w-[200px]`}
    >
      {title && (
        <h3 className="text-sm font-semibold mb-2 text-center opacity-90">
          {title}
        </h3>
      )}

      {/* 🔹 Main Value */}
      <div className="flex justify-center items-baseline gap-1">
        <span className="text-4xl font-bold">{mainValue}</span>
        {unit && (
          <span className="text-lg font-semibold opacity-80">{unit}</span>
        )}
      </div>

      {/* 🔹 Sub Items (for blue style) */}
      {subItems && subItems.length > 0 && (
        <div className="flex justify-around mt-2 border-t border-white/30 pt-2">
          {subItems.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-lg font-semibold">{item.value}</p>
              <p className="text-xs opacity-80">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Delta Items (for red style) */}
      {deltaItems && deltaItems.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 border-t border-white/30 pt-2">
          {deltaItems.map((item) => (
            <div
              key={item.label}
              className="flex justify-between text-sm items-center"
            >
              <span>{item.label}</span>
              <span
                className={`flex items-center gap-1 font-semibold ${
                  item.trend === "up"
                    ? "text-green-200"
                    : item.trend === "down"
                    ? "text-red-300"
                    : ""
                }`}
              >
                {item.trend === "up" && <FiArrowUp />}
                {item.trend === "down" && <FiArrowDown />}
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
