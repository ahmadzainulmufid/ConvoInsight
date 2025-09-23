import React, { useState } from "react";
import { useDashboardSetting } from "../hooks/useDashboardSettings";
import toast from "react-hot-toast";
import { NavLink, useParams, useNavigate } from "react-router-dom";
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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { DragEndEvent } from "@dnd-kit/core";

function SortableItem({
  id,
  name,
  onDelete,
  onManage,
}: {
  id: string;
  name: string;
  onDelete: () => void;
  onManage: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes} // cukup attributes saja di li
      className="flex items-center justify-between rounded border border-[#3a3b42] px-3 py-2 bg-[#2e2f36]"
    >
      {/* Drag handle khusus */}
      <span
        {...listeners} // drag listener khusus di handle
        className="cursor-grab active:cursor-grabbing text-gray-400 mr-2"
      >
        ⠿
      </span>

      <span className="flex-1">{name}</span>

      <div className="flex gap-2">
        <button
          onClick={onManage}
          className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-700"
        >
          Manage
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm rounded bg-red-600 hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function DashboardSettingPage() {
  const { section: domainDocId } = useParams();
  const { group, addGroup, removeGroup, updateGroupOrder, uid } =
    useDashboardSetting(domainDocId || "");
  const [items, setItems] = useState(group.map((g) => g.id));
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  React.useEffect(() => {
    setItems(group.map((g) => g.id));
  }, [group]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newItems = arrayMove(prev, oldIndex, newIndex);

        updateGroupOrder(newItems);

        return newItems;
      });
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await addGroup(name);
    if (res.ok) {
      toast.success("Group added");
      setName("");
    } else {
      toast.error(res.reason || "Failed to add group");
    }
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    const res = await removeGroup(groupToDelete.id);
    if (res.ok) toast.success(`Domain "${groupToDelete.name}" deleted`);
    setGroupToDelete(null);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Dashboard Setting</h1>
        <NavLink
          to={`/domain/${domainDocId}/dashboard`}
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Dashboard
        </NavLink>
      </header>

      {/* Form Add */}
      <form
        onSubmit={handleAdd}
        className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
      >
        <label className="block text-sm text-gray-300">New Group Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Program Summary, Trend Daily, Daily Transaction Achievement"
          className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!uid}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
        >
          Create Group
        </button>
      </form>

      {/* List Group dengan drag-and-drop */}
      <section className="bg-[#2A2B32] p-4 rounded-lg">
        <h2 className="text-sm text-gray-300 mb-3">Current Group Dashboard</h2>
        {group.length === 0 ? (
          <p className="text-gray-400 text-sm">There is no group yet</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-2">
                {items.map((id) => {
                  const g = group.find((x) => x.id === id);
                  if (!g) return null;
                  return (
                    <SortableItem
                      key={g.id}
                      id={g.id}
                      name={g.name}
                      onDelete={() =>
                        setGroupToDelete({ id: g.id, name: g.name })
                      }
                      onManage={() =>
                        navigate(
                          `/domain/${domainDocId}/dashboard/dashboardSetting/manageSettings?group=${g.id}`
                        )
                      }
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </section>

      {/* Modal konfirmasi delete */}
      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1f2024] text-white p-6 rounded-xl shadow-lg border border-[#3a3b42] w-full max-w-sm space-y-4">
            <h2 className="text-lg font-semibold">Delete Domain?</h2>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                "{groupToDelete.name}"
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setGroupToDelete(null)}
                className="px-4 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
