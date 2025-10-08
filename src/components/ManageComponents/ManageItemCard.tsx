import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { HydratedDashboardItem } from "../../pages/ManageSettings";

// FUNGSI YANG DIPERBAIKI
const stripHtml = (html: string | undefined) => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.textContent || "";

  // TAMBAHKAN BARIS INI: Hapus semua karakter bintang dari teks
  return text.replace(/\*/g, "");
};

export default function DashboardItemCard({
  item,
  onDelete,
  onView,
}: {
  item: HydratedDashboardItem;
  onDelete: () => void;
  onView: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={onView}
      className="flex flex-col gap-2 bg-[#1F2024] border border-[#3a3b42] rounded-lg p-3 cursor-pointer hover:border-indigo-500 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-gray-500"
        >
          ⠿
        </span>
        <span className="font-semibold capitalize">{item.type}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      <div className="text-sm text-gray-300">
        {item.result ? (
          <>
            <strong className="text-gray-500">Output:</strong>{" "}
            {stripHtml(item.result.text)}
          </>
        ) : item.prompt ? (
          <>
            <strong>Prompt:</strong> {item.prompt}
          </>
        ) : (
          <em className="text-gray-500">KPI from dataset (no prompt)</em>
        )}
      </div>

      {item.datasets && item.datasets.length > 0 && (
        <p className="text-xs text-gray-400">
          <strong>Datasets:</strong> {item.datasets.join(", ")}
        </p>
      )}
      <p className="text-xs text-gray-500">
        Include Insight: {item.includeInsight ? "Yes ✅" : "No ❌"}
      </p>
    </li>
  );
}
