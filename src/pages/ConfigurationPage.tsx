// src/Pages/ConfigurationUserPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, useAuthUser } from "../utils/firebaseSetup";
import { useParams } from "react-router-dom";
import ConfigurationTour from "../components/OnboardingComponents/ConfigurationTour";

type InstructionItem = {
  id: string;
  text: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export default function ConfigurationUserPage() {
  const { user, loading: authLoading } = useAuthUser();
  const userId = user?.uid || null;
  const { section: domainDocId } = useParams<{ section: string }>();

  const [instruction, setInstruction] = useState("");
  const [instructionDoc, setInstructionDoc] = useState<InstructionItem | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTour, setShowTour] = useState(false);

  // 🔹 Fetch instruction (satu dokumen saja)
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

  // 🔹 Auto expand textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  }, [instruction]);

  useEffect(() => {
    if (authLoading || !user) return;

    (async () => {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      // ✅ Tampilkan Step-5 jika user sudah selesai Step-4, dan belum pernah lihat Step-5
      if (data.hasSeenDatasetTour && !data.hasSeenConfigTour) {
        setTimeout(() => setShowTour(true), 500); // kecilkan/jemput UX transisi
      }
    })();
  }, [authLoading, user]);

  // // ✅ Cek apakah user baru (tidak punya domain/chat/dataset/dashboard)
  // useEffect(() => {
  //   const checkTourStatus = async () => {
  //     if (!user) return;

  //     const userRef = doc(db, "users", user.uid);
  //     const snap = await getDoc(userRef);
  //     if (!snap.exists()) return;
  //     const data = snap.data();

  //     // Ambil semua koleksi penting
  //     const domainSnap = await getDocs(
  //       collection(db, "users", user.uid, "domains")
  //     );
  //     const chatSnap = await getDocs(
  //       collection(db, "users", user.uid, "chats")
  //     );
  //     const dashboardSnap = await getDocs(
  //       collection(db, "users", user.uid, "dashboards")
  //     );
  //     const datasetSnap = await getDocs(
  //       collection(db, "users", user.uid, "datasets")
  //     );

  //     // User benar-benar baru kalau semua koleksi kosong
  //     const isNewUser =
  //       domainSnap.empty &&
  //       chatSnap.empty &&
  //       dashboardSnap.empty &&
  //       datasetSnap.empty;

  //     // Hanya tampilkan tour kalau user baru dan belum pernah lihat
  //     if (isNewUser && !data.hasSeenConfigTour) {
  //       setShowTour(true);
  //     }
  //   };

  //   void checkTourStatus();
  // }, [user]);

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
    <div className="relative min-h-screen flex text-white">
      {/* 🟣 Step 5: Domain Configuration Tour */}
      {showTour && (
        <ConfigurationTour
          onFinish={async () => {
            if (user) {
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, { hasSeenConfigTour: true });
            }
            setShowTour(false);
          }}
        />
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#151923",
            color: "#eef1f6",
            border: "1px solid #272e3f",
            borderRadius: "12px",
            fontSize: "14px",
          },
        }}
      />
      <main className="flex-1 overflow-y-auto pb-20 px-6 md:px-10 py-10 animate-fade-in">
        <div className="max-w-5xl">
        <h2 className="text-2xl font-semibold tracking-tight mb-1">
          Configuration Domain
        </h2>
        <p className="text-sm text-gray-400 mb-8">
          Give the AI extra context about this domain.
        </p>

        <div className="bg-[#151923] border border-white/5 rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
          Domain Instruction
          {instructionDoc?.is_active && (
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 ring-1 ring-inset ring-emerald-500/30">
              Active
            </span>
          )}
        </label>

        {/* Input Section */}
        <section className="space-y-4">
          <textarea
            ref={textareaRef}
            placeholder="Add instructions to make AI better understand your context..."
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            className={`instruction-textarea w-full px-4 py-3 rounded-xl text-gray-100 placeholder:text-gray-500 leading-relaxed resize-none overflow-hidden outline-none focus:ring-4 focus:ring-indigo-500/15 transition-all duration-300 ${
              instructionDoc?.is_active
                ? "bg-[#0d1017]/70 border border-emerald-500/50 shadow-[0_0_24px_-6px_rgba(16,185,129,0.35)]"
                : "bg-[#0d1017]/70 border border-white/10 focus:border-indigo-500/60"
            } ${
              instructionDoc && !isEditing
                ? "pointer-events-none select-none opacity-70"
                : ""
            }`}
            rows={1}
            readOnly={!!instructionDoc && !isEditing}
          />

          <div className="flex gap-3">
            {!instructionDoc ? (
              <button
                onClick={handleSaveOrUpdate}
                disabled={loading}
                className="instruction-save-btn px-4 py-2.5 rounded-xl text-sm font-medium text-white transition bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-60"
              >
                Save Instruction
              </button>
            ) : isEditing ? (
              <button
                onClick={handleSaveOrUpdate}
                disabled={loading}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-60"
              >
                Save Instruction
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10"
              >
                Update Instruction
              </button>
            )}

            {instructionDoc &&
              (isEditing ? (
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setInstruction(instructionDoc.text);
                  }}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white transition bg-white/5 hover:bg-white/10"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={toggleActiveInstruction}
                  disabled={loading}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                    instructionDoc.is_active
                      ? "text-rose-300 bg-rose-500/10 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20"
                      : "text-emerald-300 bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/30 hover:bg-emerald-500/20"
                  }`}
                >
                  {instructionDoc.is_active ? "Deactivate" : "Activate"}
                </button>
              ))}
          </div>
        </section>
        </div>
        </div>
      </main>
    </div>
  );
}
