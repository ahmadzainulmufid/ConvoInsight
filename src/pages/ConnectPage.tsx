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
        <div className="bg-[#1f2024] border border-[#3a3b42] rounded-xl p-8 w-full max-w-lg space-y-5 shadow-xl">
          <h2 className="text-xl font-semibold text-center mb-4">
            Connect to PostgreSQL Database
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-400">Host</label>
              <input
                type="text"
                name="host"
                value={form.host}
                onChange={handleChange}
                className="w-full p-2 rounded-md bg-[#2a2b32] border border-gray-700 text-white"
                placeholder="e.g. aws-1-ap-southeast-1.pooler.supabase.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Port</label>
              <input
                type="text"
                name="port"
                value={form.port}
                onChange={handleChange}
                className="w-full p-2 rounded-md bg-[#2a2b32] border border-gray-700 text-white"
                placeholder="e.g. 5432"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Database</label>
              <input
                type="text"
                name="dbname"
                value={form.dbname}
                onChange={handleChange}
                className="w-full p-2 rounded-md bg-[#2a2b32] border border-gray-700 text-white"
                placeholder="e.g. postgres"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400">User</label>
              <input
                type="text"
                name="user"
                value={form.user}
                onChange={handleChange}
                className="w-full p-2 rounded-md bg-[#2a2b32] border border-gray-700 text-white"
                placeholder="e.g. postgres.user"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full p-2 rounded-md bg-[#2a2b32] border border-gray-700 text-white"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={handleTest}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium"
            >
              {loading ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-sm font-medium"
            >
              {loading ? "Saving..." : "Save Connection"}
            </button>
          </div>
        </div>

        {connections.length > 0 && (
          <div className="mt-10 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Saved Connections</h3>
            <ul className="space-y-2">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="bg-[#2a2b32] p-3 rounded-md border border-[#3a3b42]"
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
