import { useState, useEffect, useCallback } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../utils/firebaseSetup";
import { useAuthUser } from "../utils/firebaseSetup";
import { useParams } from "react-router-dom";

type InstructionItem = {
  id: string;
  text: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function ConfigurationUserPage() {
  const { uid: userId, loading: authLoading } = useAuthUser();

  const [instruction, setInstruction] = useState("");
  const [instructions, setInstructions] = useState<InstructionItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { section: domainDocId } = useParams<{ section: string }>();

  const fetchInstructions = useCallback(async () => {
    if (!userId || !domainDocId) return;
    setLoading(true);
    try {
      const ref = collection(
        db,
        "users",
        userId,
        "domains",
        domainDocId,
        "instructionsDom"
      );
      const snapshot = await getDocs(ref);
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        text: d.data().text,
        is_active: d.data().is_active ?? false,
        created_at: d.data().created_at?.toDate?.().toLocaleString(),
      }));
      setInstructions(items);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load instructions");
    } finally {
      setLoading(false);
    }
  }, [userId, domainDocId]);

  useEffect(() => {
    if (!authLoading && userId) fetchInstructions();
  }, [authLoading, userId, fetchInstructions]);

  const handleSaveInstruction = async () => {
    if (!instruction.trim()) {
      toast.error("Instruction cannot be empty!");
      return;
    }
    if (!userId) {
      toast.error("User not logged in!");
      return;
    }

    try {
      if (editingId) {
        const docRef = doc(
          db,
          "users",
          userId,
          "domains",
          domainDocId!,
          "instructionsDom",
          editingId
        );
        await updateDoc(docRef, {
          text: instruction.trim(),
          updated_at: serverTimestamp(),
        });
        toast.success("Instruction updated successfully");
      } else {
        const ref = collection(
          db,
          "users",
          userId,
          "domains",
          domainDocId!,
          "instructionsDom"
        );
        await addDoc(ref, {
          text: instruction.trim(),
          is_active: false,
          created_at: serverTimestamp(),
        });
        toast.success("Instruction saved successfully");
      }

      setInstruction("");
      setEditingId(null);
      fetchInstructions();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save instruction");
    }
  };

  const handleDeleteInstruction = async (id: string) => {
    if (!userId) return toast.error("User not logged in!");
    try {
      const ref = doc(
        db,
        "users",
        userId,
        "domains",
        domainDocId!,
        "instructionsDom",
        id
      );
      await deleteDoc(ref);
      toast.success("Instruction deleted successfully");
      fetchInstructions();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete instruction");
    }
  };

  const toggleActiveInstruction = async (id: string, currentState: boolean) => {
    if (!userId) return toast.error("User not logged in!");

    try {
      const docRef = doc(
        db,
        "users",
        userId,
        "domains",
        domainDocId!,
        "instructionsDom",
        id
      );
      await updateDoc(docRef, {
        is_active: !currentState,
        updated_at: serverTimestamp(),
      });

      toast.success(
        !currentState ? "Instruction activated" : "Instruction deactivated"
      );

      fetchInstructions();
    } catch (e) {
      console.error(e);
      toast.error("Failed to toggle instruction state");
    }
  };

  return (
    <div className="relative min-h-screen flex bg-[#1a1b1e] text-white">
      <Toaster position="top-right" />
      <main className="flex-1 overflow-y-auto pb-20 px-6 md:px-10 py-8">
        <h2 className="text-lg font-semibold mb-8">Configuration Domain</h2>

        <label className="block text-sm font-medium mb-2">
          Domain Instructions
        </label>

        {/* Input Section */}
        <section className="space-y-4">
          <textarea
            placeholder="Tambahkan instruksi agar AI lebih paham konteks kamu..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className="w-full p-3 rounded bg-gray-800 border border-gray-700 text-white resize-none"
            rows={3}
            disabled={loading}
          />

          <button
            onClick={handleSaveInstruction}
            disabled={loading}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
          >
            {editingId ? "Update Instruction" : "Save Instruction"}
          </button>
        </section>

        {/* History List */}
        <section className="space-y-2 mt-8">
          <h3 className="text-base font-semibold mb-4">Instruction History</h3>
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : instructions.length === 0 ? (
            <p className="text-gray-500 text-sm">
              There are no instructions stored yet
            </p>
          ) : (
            instructions.map((ins) => (
              <div
                key={ins.id}
                className={`flex items-center justify-between bg-gray-800 p-3 rounded border ${
                  ins.is_active ? "border-green-500" : "border-gray-700"
                }`}
              >
                <div className="flex flex-col">
                  <p className="text-sm text-gray-200">{ins.text}</p>
                  {ins.is_active && (
                    <span className="text-xs text-green-400 mt-1">
                      ✅ Active
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      toggleActiveInstruction(ins.id, ins.is_active ?? false)
                    }
                    className={`px-3 py-1 text-sm rounded ${
                      ins.is_active
                        ? "bg-gray-600 hover:bg-gray-500"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {ins.is_active ? "Deactivate" : "Activate"}
                  </button>

                  <button
                    onClick={() => {
                      setInstruction(ins.text);
                      setEditingId(ins.id);
                    }}
                    className="px-3 py-1 text-sm bg-yellow-600 rounded hover:bg-yellow-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteInstruction(ins.id)}
                    className="px-3 py-1 text-sm bg-red-600 rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
