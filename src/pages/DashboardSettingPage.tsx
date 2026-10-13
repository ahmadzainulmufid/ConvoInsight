import React, { useEffect, useState } from "react";
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
import DashboardSettingTour from "../components/OnboardingComponents/DashboardSettingTour";
import { auth, db } from "../utils/firebaseSetup";
import { doc, getDoc, updateDoc } from "firebase/firestore";

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
      {...attributes}
      className="flex items-center justify-between rounded-xl border border-white/5 px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition"
    >
      <span
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 mr-2"
      >
        ⠿
      </span>

      <span className="flex-1 font-medium text-gray-100">{name}</span>

      <div className="flex gap-2">
        <button
          onClick={onManage}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/5 text-gray-200 ring-1 ring-inset ring-white/10 hover:bg-white/10 transition"
        >
          Manage
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-1.5 text-sm font-medium rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
        >
          Delete
        </button>
      </div>
    </li>
  );
}

export default function DashboardSettingPage() {
  const { section: domainDocId } = useParams();
  // const [active, setActive] = useState(false);
  // const [selectedBuiltin, setSelectedBuiltin] = useState("");
  const { group, addGroup, removeGroup, updateGroupOrder, uid } =
    useDashboardSetting(domainDocId || "");
  const [items, setItems] = useState(group.map((g) => g.id));
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const [groupToDelete, setGroupToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const [showTour, setShowTour] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => setItems(group.map((g) => g.id)), [group]);

  useEffect(() => {
    const checkTour = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      if (data.hasSeenDashboardTour && !data.hasSeenDashboardSettingTour) {
        setTimeout(() => setShowTour(true), 600);
      }
    };
    checkTour();
  }, []);

  const handleFinishTour = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { hasSeenDashboardSettingTour: true });
    setShowTour(false);
    toast.success("✅ Step 7 Complete! Continue manually by clicking Manage.");
  };

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
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6 animate-fade-in">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Manage Dashboard Setting
        </h1>
        <NavLink
          to={`/domain/${domainDocId}/dashboard`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition"
        >
          Back to Dashboard
        </NavLink>
      </header>

      <form
        onSubmit={handleAdd}
        className="bg-[#151923] border border-white/5 p-6 rounded-2xl shadow-[var(--shadow-card)] space-y-4"
      >
        <label className="block text-sm font-medium text-gray-300">New Group Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Program Summary, Trend Daily, Daily Transaction Achievement"
          className="dashboard-group-name w-full rounded-xl border border-white/10 bg-[#0d1017]/70 px-3.5 py-2.5 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
        />
        <button
          type="submit"
          disabled={!uid}
          className="dashboard-create-btn px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition"
        >
          Create Group
        </button>
      </form>

      <section className="bg-[#151923] border border-white/5 p-6 rounded-2xl shadow-[var(--shadow-card)]">
        <h2 className="dashboard-group-list text-sm font-semibold text-gray-200 mb-4">
          Current Group Dashboard
        </h2>
        {group.length === 0 ? (
          <p className="text-gray-500 text-sm py-6 text-center rounded-xl border border-dashed border-white/10">
            There is no group yet
          </p>
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

      {showTour && <DashboardSettingTour onFinish={handleFinishTour} />}

      {groupToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#151923] text-white p-6 rounded-2xl shadow-2xl shadow-black/40 border border-white/10 w-full max-w-sm space-y-4">
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
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition"
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
