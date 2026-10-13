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
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-6 animate-fade-in">
      {/* ✨ Hint Overlay */}
      {showHint && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#151923] border border-indigo-500/40 text-white p-8 rounded-3xl shadow-[0_0_60px_rgba(79,70,229,0.25)] max-w-2xl text-center animate-fade-in">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">
              ✨ Step 1: Create Your First Domain
            </h2>
            <p className="text-gray-300 mb-6 text-lg leading-relaxed">
              Enter a domain name like <b>Sales</b> or <b>Marketing</b>, then
              click <b>Create Domain</b> to get started.
            </p>
            <button
              onClick={handleGotIt}
              className="bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold text-base shadow-lg shadow-indigo-600/20 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Manage Domains
        </h1>
        <NavLink
          to="/home"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-medium text-gray-200 transition"
        >
          Back to Home
        </NavLink>
      </header>

      {/* ➕ Form tambah domain */}
      <form
        onSubmit={handleAdd}
        className="bg-[#151923] border border-white/5 p-6 rounded-2xl shadow-[var(--shadow-card)] space-y-4"
      >
        <label className="block text-sm font-medium text-gray-300">
          New Domain Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="mis. Sales, Marketing, Finance"
          className="w-full rounded-xl border border-white/10 bg-[#0d1017]/70 px-3.5 py-2.5 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
        />
        <button
          type="submit"
          disabled={!uid}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium disabled:opacity-50 shadow-lg shadow-indigo-600/20 transition"
        >
          Create Domain
        </button>
      </form>

      {/* 📋 Daftar domain */}
      {domains.length > 0 && (
        <section className="bg-[#151923] border border-white/5 p-6 rounded-2xl shadow-[var(--shadow-card)] mb-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-4">Current Domain</h2>
          <div className="flex flex-col space-y-2">
            {domains.map((d) => (
              <div
                key={d.id}
                className="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 transition"
              >
                <span className="flex items-center gap-3 font-medium text-gray-100">
                  <span className="h-8 w-8 grid place-items-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 text-sm font-semibold text-indigo-200">
                    {d.name.charAt(0).toUpperCase()}
                  </span>
                  {d.name}
                </span>
                <button
                  onClick={() => handleDeleteDomain(d.id, d.name)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
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
