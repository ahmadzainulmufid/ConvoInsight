import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuthUser } from "../utils/firebaseSetup";
import AppShell from "../components/DatasetsComponents/AppShell";

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

type ConnectionItem = {
  id: string;
  name: string;
  host: string;
  port: string;
  dbname: string;
  user: string;
  updated_at?: string;
};

export default function ConnectPage() {
  const { user } = useAuthUser();
  const userId = user?.uid;
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);

  // 🔹 Form state
  const [form, setForm] = useState({
    host: "",
    port: "",
    dbname: "",
    user: "",
    password: "",
  });

  // --- Fetch existing connections ---
  useEffect(() => {
    if (!userId) return;
    const fetchConnections = async () => {
      try {
        const res = await fetch(`${API_BASE}/pg/get?userId=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch connections");
        const data = await res.json();
        setConnections(data.items ?? []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConnections();
  }, [userId]);

  // --- Handle input change ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // --- Test Connection ---
  const handleTest = async () => {
    if (
      !form.host ||
      !form.port ||
      !form.dbname ||
      !form.user ||
      !form.password
    ) {
      toast.error("Please fill in all fields before testing.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pg/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Connection successful!");
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to test connection.");
    } finally {
      setLoading(false);
    }
  };

  // --- Save Connection ---
  const handleSave = async () => {
    if (!userId) {
      toast.error("User not authenticated.");
      return;
    }
    if (
      !form.host ||
      !form.port ||
      !form.dbname ||
      !form.user ||
      !form.password
    ) {
      toast.error("Please complete all fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/pg/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, userId }),
      });
      const data = await res.json();
      if (data.saved) {
        toast.success("Connection saved successfully!");
      } else {
        toast.error(`Save failed: ${data.error}`);
      }
    } catch {
      toast.error("Failed to save connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell userName={user?.email || "User"}>
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-white px-4">
        <div className="bg-[#151923] border border-white/10 rounded-3xl p-8 w-full max-w-lg space-y-5 shadow-2xl shadow-black/40 animate-fade-in">
          <h2 className="text-xl font-semibold tracking-tight text-center mb-6">
            Connect to PostgreSQL Database
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Host</label>
              <input
                type="text"
                name="host"
                value={form.host}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
                placeholder="e.g. aws-1-ap-southeast-1.pooler.supabase.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Port</label>
              <input
                type="text"
                name="port"
                value={form.port}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
                placeholder="e.g. 5432"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Database</label>
              <input
                type="text"
                name="dbname"
                value={form.dbname}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
                placeholder="e.g. postgres"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">User</label>
              <input
                type="text"
                name="user"
                value={form.user}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
                placeholder="e.g. postgres.user"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/15 transition"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex justify-between gap-3 pt-2">
            <button
              onClick={handleTest}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-white/5 ring-1 ring-inset ring-white/10 hover:bg-white/10 rounded-xl text-sm font-medium transition"
            >
              {loading ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-medium shadow-lg shadow-indigo-600/20 transition"
            >
              {loading ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </div>

        {connections.length > 0 && (
          <div className="mt-10 w-full max-w-lg">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Saved Connections
            </h3>
            <ul className="space-y-2">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="bg-[#151923] p-4 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition"
                >
                  <p className="font-medium text-white">{c.name}</p>
                  <p className="text-sm text-gray-400">
                    {c.user}@{c.host}:{c.port} / {c.dbname}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Updated: {c.updated_at?.slice(0, 19) || "-"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AppShell>
  );
}
