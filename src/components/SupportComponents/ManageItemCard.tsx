import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DashboardItem } from "../../pages/ManageSettings";

export default function DashboardItemCard({
  item,
  onDelete,
}: {
  item: DashboardItem;
  onDelete: () => void;
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
      className="flex flex-col gap-2 bg-[#1F2024] border border-[#3a3b42] rounded-lg p-3"
    >
      <div className="flex items-center justify-between">
        <span
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500"
        >
          ⠿
        </span>
        <span className="font-semibold capitalize">{item.type}</span>
        <button
          onClick={onDelete}
          className="px-2 py-1 text-sm rounded bg-red-600 hover:bg-red-700"
        >
          Delete
        </button>
      </div>

      {item.prompt && (
        <p className="text-sm text-gray-300 line-clamp-2">
          <strong>Prompt:</strong> {item.prompt}
        </p>
      )}
      {item.datasets && item.datasets.length > 0 && (
        <p className="text-sm text-gray-400">
          <strong>Datasets:</strong> {item.datasets.join(", ")}
        </p>
      )}
      {item.columns && item.columns.length > 0 && (
        <p className="text-sm text-gray-400">
          <strong>Columns:</strong> {item.columns.join(", ")}
        </p>
      )}
      <p className="text-xs text-gray-500">
        Include Insight: {item.includeInsight ? "Yes ✅" : "No ❌"}
      </p>
    </li>
  );
}
