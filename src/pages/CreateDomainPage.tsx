import { useState, useEffect } from "react";
import { db, useAuthUser } from "../utils/firebaseSetup";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useDomains } from "../hooks/useDomains";
import { addNotification } from "../service/notificationStore";

export default function CreateDomainPage() {
  const { user } = useAuthUser();
  const { domains, addDomain, uid } = useDomains({ seedDefaultOnEmpty: false });
  const [name, setName] = useState("");
  const [showHint, setShowHint] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkHint = async () => {
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();

      const domainSnap = await getDocs(
        collection(db, "users", user.uid, "domains")
      );
      const chatSnap = await getDocs(
        collection(db, "users", user.uid, "chats")
      );
      const dashboardSnap = await getDocs(
        collection(db, "users", user.uid, "dashboards")
      );
      const datasetSnap = await getDocs(
        collection(db, "users", user.uid, "datasets")
      );

      const isNewUser =
        domainSnap.empty &&
        chatSnap.empty &&
        dashboardSnap.empty &&
        datasetSnap.empty;

      if (!data.hasSeenDomainHint && isNewUser) {
        setShowHint(true);
      }
    };
    void checkHint();
  }, [user]);

  const handleGotIt = async () => {
    if (user) {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { hasSeenDomainHint: true });
    }
    setShowHint(false);
  };

  // 🗑️ Hapus domain
  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete domain "${domainName}"?`))
      return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "domains", domainId));
      toast.success(`Domain "${domainName}" deleted.`);
      await addNotification(
        "domain",
        "Domain Deleted",
        `Domain "${domainName}" has been removed.`
      );
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete domain:", err);
      toast.error("Failed to delete domain");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid) {
      toast.error("Please login first before adding domain");
      return;
    }

    const res = await addDomain(name);
    if (res.ok) {
      toast.success("Domain added");
      setTimeout(() => navigate("/configuser"), 1000);
      await addNotification(
        "domain",
        "New Domain Created",
        `Domain "${name}" has been added.`
      );

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (!data.hasCreatedDomain) {
          await updateDoc(userRef, { hasCreatedDomain: true });
          navigate("/configuser");
        } else {
          toast.success("Domain created successfully!");
        }
      }

      setName("");
    } else {
      toast.error(res.reason || "Failed to add domain");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* ✨ Hint Overlay */}
      {showHint && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-[#111216] border border-indigo-500 text-white p-8 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.3)] max-w-2xl text-center">
            <h2 className="text-2xl font-bold mb-4">
              ✨ Step 1: Create Your First Domain
            </h2>
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Enter a domain name like <b>Sales</b> or <b>Marketing</b>, then
              click <b>Create Domain</b> to get started.
            </p>
            <button
              onClick={handleGotIt}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold text-lg"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Manage Domains</h1>
        <NavLink
          to="/home"
          className="px-3 py-1.5 rounded bg-[#2A2B32] hover:bg-[#343541] text-sm"
        >
          Back to Home
        </NavLink>
      </header>

      {/* ➕ Form tambah domain */}
      <form
        onSubmit={handleAdd}
        className="bg-[#2A2B32] p-4 rounded-lg space-y-3"
      >
        <label className="block text-sm text-gray-300">New Domain Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Sales, Marketing, Finance"
          className="w-full rounded border border-[#3a3b42] bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="submit"
          disabled={!uid}
          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
        >
          Create Domain
        </button>
      </form>

      {/* 📋 Daftar domain */}
      {domains.length > 0 && (
        <section className="bg-[#2A2B32] p-4 rounded-lg mb-6">
          <h2 className="text-sm text-gray-300 mb-3">Current Domain</h2>
          <div className="flex flex-col space-y-3">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between border border-[#3a3b42] px-3 py-2 rounded"
              >
                <span>{d.name}</span>
                <button
                  onClick={() => handleDeleteDomain(d.id, d.name)}
                  className="text-red-400 hover:text-red-500 font-medium transition"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
