type KpiCardProps = {
  title?: string;
  mainValue: string | number;
  unit?: string;
  color?: "blue" | "red";
  // Properti deltaItems tidak lagi kita gunakan untuk style biru ini
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
  subItems,
}: KpiCardProps) {
  const baseColor =
    color === "blue" ? "bg-[#4AA6C5] text-black" : "bg-[#D94C4C] text-white";

  return (
    <div
      // Ukuran min-w disesuaikan agar bisa menampung beberapa item
      className={`rounded-xl p-4 shadow-md ${baseColor} flex flex-col justify-center min-w-[250px]`}
    >
      {/* 🌟 TATA LETAK BARU MENGGUNAKAN FLEXBOX 🌟 */}
      <div className="flex justify-around items-center text-center">
        {/* Item Utama */}
        <div className="flex flex-col items-center p-2">
          <span className="text-4xl font-bold">{mainValue}</span>
          {unit && (
            <span className="text-lg font-semibold opacity-80 -mt-1">
              {unit}
            </span>
          )}
          {title && <p className="text-xs opacity-80 mt-1">{title}</p>}
        </div>

        {/* Garis pemisah vertikal jika ada sub-item */}
        {subItems && subItems.length > 0 && (
          <div className="border-l border-black/20 h-12"></div>
        )}

        {/* Sub Items (ditampilkan berdampingan) */}
        {subItems &&
          subItems.map((item) => (
            <div key={item.label} className="flex flex-col items-center p-2">
              <span className="text-3xl font-semibold">{item.value}</span>
              <p className="text-xs opacity-80 mt-1">{item.label}</p>
            </div>
          ))}
      </div>
    </div>
  );
}
