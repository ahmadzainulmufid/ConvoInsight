import { useState, useEffect, useCallback, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db, useAuthUser } from "../utils/firebaseSetup";
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
  const { section: domainDocId } = useParams<{ section: string }>();

  const [instruction, setInstruction] = useState("");
  const [instructionDoc, setInstructionDoc] = useState<InstructionItem | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 🔹 Fetch hanya satu instruction
  const fetchInstruction = useCallback(async () => {
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
      if (!snapshot.empty) {
        const d = snapshot.docs[0];
        const data = d.data();
        const item: InstructionItem = {
          id: d.id,
          text: data.text,
          is_active: data.is_active ?? false,
          created_at: data.created_at?.toDate?.().toLocaleString(),
        };
        setInstruction(item.text);
        setInstructionDoc(item);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to load instruction");
    } finally {
      setLoading(false);
    }
  }, [userId, domainDocId]);

  useEffect(() => {
    if (!authLoading && userId) fetchInstruction();
  }, [authLoading, userId, fetchInstruction]);

  // 🔹 Auto expand textarea sesuai isi
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [instruction]);

  // 🔹 Simpan / Update instruction
  const handleSaveOrUpdate = async () => {
    if (!instruction.trim()) {
      toast.error("Instruction cannot be empty!");
      return;
    }
    if (!userId) {
      toast.error("User not logged in!");
      return;
    }

    setLoading(true);
    try {
      if (instructionDoc) {
        // Update
        const ref = doc(
          db,
          "users",
          userId,
          "domains",
          domainDocId!,
          "instructionsDom",
          instructionDoc.id
        );
        await updateDoc(ref, {
          text: instruction.trim(),
          updated_at: serverTimestamp(),
        });
        toast.success("Instruction updated successfully");
        setIsEditing(false);
        fetchInstruction();
      } else {
        // Save baru
        const ref = collection(
          db,
          "users",
          userId,
          "domains",
          domainDocId!,
          "instructionsDom"
        );
        const newDoc = await addDoc(ref, {
          text: instruction.trim(),
          is_active: false,
          created_at: serverTimestamp(),
        });
        setInstructionDoc({
          id: newDoc.id,
          text: instruction.trim(),
          is_active: false,
        });
        toast.success("Instruction saved successfully");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save instruction");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Toggle Active
  const toggleActiveInstruction = async () => {
    if (!userId || !instructionDoc) return toast.error("No instruction found!");
    try {
      const ref = doc(
        db,
        "users",
        userId,
        "domains",
        domainDocId!,
        "instructionsDom",
        instructionDoc.id
      );
      await updateDoc(ref, {
        is_active: !instructionDoc.is_active,
        updated_at: serverTimestamp(),
      });
      toast.success(
        !instructionDoc.is_active
          ? "Instruction activated"
          : "Instruction deactivated"
      );
      setInstructionDoc((prev) =>
        prev ? { ...prev, is_active: !prev.is_active } : prev
      );
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
          Domain Instruction
        </label>

        {/* Input Section */}
        <section className="space-y-4">
          <textarea
            ref={textareaRef}
            placeholder="Tambahkan instruksi agar AI lebih paham konteks kamu..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className={`w-full p-3 rounded bg-gray-800 border border-gray-700 text-white resize-none overflow-hidden ${
              instructionDoc && !isEditing
                ? "pointer-events-none select-none opacity-70"
                : ""
            }`}
            rows={1}
            readOnly={!!instructionDoc && !isEditing}
          />

          <div className="flex gap-3">
            {/* Save / Update / Edit Button */}
            {!instructionDoc ? (
              <button
                onClick={handleSaveOrUpdate}
                disabled={loading}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
              >
                Save Instruction
              </button>
            ) : isEditing ? (
              <button
                onClick={handleSaveOrUpdate}
                disabled={loading}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
              >
                Save Instruction
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
              >
                Update Instruction
              </button>
            )}

            {/* Activate / Cancel Button */}
            {instructionDoc &&
              (isEditing ? (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setInstruction(instructionDoc.text);
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={toggleActiveInstruction}
                  disabled={loading}
                  className={`px-4 py-2 rounded ${
                    instructionDoc.is_active
                      ? "bg-gray-600 hover:bg-gray-500"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {instructionDoc.is_active ? "Deactivate" : "Activate"}
                </button>
              ))}
          </div>
        </section>
      </main>
    </div>
  );
}
