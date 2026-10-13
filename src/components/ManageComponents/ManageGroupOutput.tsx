import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DashboardItemCard from "./ManageItemCard";
import type { HydratedDashboardItem } from "../../pages/ManageSettings";

export default function DashboardGroupOutput({
  items,
  onReorder,
  onDelete,
  onViewItem,
}: {
  items: HydratedDashboardItem[];
  onReorder: (items: HydratedDashboardItem[]) => void;
  onDelete: (id: string) => void;
  onViewItem: (item: HydratedDashboardItem) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: import("@dnd-kit/core").DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  return (
    <section className="bg-[#151923] border border-white/5 p-6 rounded-2xl space-y-3 shadow-[var(--shadow-card)]">
      <h2 className="text-sm font-semibold text-gray-200 mb-4">Current Group Dashboard</h2>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item) => (
              <DashboardItemCard
                key={item.id}
                item={item}
                onDelete={() => onDelete(item.id)}
                onView={() => onViewItem(item)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
