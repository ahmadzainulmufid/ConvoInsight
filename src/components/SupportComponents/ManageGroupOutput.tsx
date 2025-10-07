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
import type { DashboardItem } from "../../pages/ManageSettings";

export default function DashboardGroupOutput({
  items,
  onReorder,
  onDelete,
}: {
  items: DashboardItem[];
  onReorder: (items: DashboardItem[]) => void;
  onDelete: (id: string) => void;
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
    <section className="bg-[#2A2B32] p-4 rounded-lg space-y-3">
      <h2 className="text-sm text-gray-300 mb-3">Current Group Dashboard</h2>

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
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}
