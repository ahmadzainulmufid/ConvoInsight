import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import useSectionFromPath from "../utils/useSectionFromPath";
import { saveDatasetBlob } from "../utils/fileStore";

type Props = { userName: string };

export default function ConnectPage({ userName }: Props) {
  const navigate = useNavigate();
  const section = useSectionFromPath();

  // 🧩 Form fields — kosong semua
  const [host, setHost] = useState("");
  const [port, setPort] = useState("");
  const [database, setDatabase] = useState("");
  const [user, setUser] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSave() {
    if (!host || !port || !database || !user) {
      toast.error("Please fill in all connection fields");
      return;
    }

    setLoading(true);
    try {
      // 🔹 Buat CSV dummy
      const csv = `id,name,value\n1,Alice,100\n2,Bob,200\n3,Charlie,300`;
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      // 🔹 Simpan ke localStorage dan sessionStorage
      const id = Date.now().toString();
      const storageKey = section ? `datasets_${section}` : "datasets";
      const uploadedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const name = `${database || "default"}.sample_table.csv`;

      const raw = localStorage.getItem(storageKey);
      const prev = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        storageKey,
        JSON.stringify([...prev, { id, name, size: blob.size, uploadedAt }])
      );

      await saveDatasetBlob(id, blob);
      sessionStorage.setItem(`ds_file_url_${id}`, url);
      sessionStorage.setItem(`ds_file_kind_${id}`, "csv");
      sessionStorage.setItem(`ds_file_mime_${id}`, "text/csv");

      toast.success("Connection saved and dataset imported");
      navigate(`/domain/${section}/datasets/${id}`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell userName={userName}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-white">
          Connect to PostgreSQL Database
        </h2>

        {/* 🧭 Connection Form */}
        <div className="bg-[#232427] border border-[#2a2b32] rounded-xl p-4 space-y-4">
          <FormRow label="Host">
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="Enter host (e.g. aws-1-ap-southeast-1.pooler.supabase.com)"
              className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </FormRow>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Port">
              <input
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="Enter port (e.g. 5432)"
                className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </FormRow>

            <FormRow label="Database">
              <input
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="Enter database name (e.g. postgres)"
                className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </FormRow>
          </div>

          <FormRow label="User">
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Enter user (e.g. postgres.user)"
              className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </FormRow>

          <div className="flex justify-end">
            <Btn onClick={onSave} disabled={loading}>
              Save Connection
            </Btn>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* 💡 Reusable Components */
interface FormRowProps {
  label: string;
  children: React.ReactNode;
}
function FormRow({ label, children }: FormRowProps) {
  return (
    <label className="block text-sm text-gray-300">
      {label}
      {children}
    </label>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}
function Btn({ children, onClick, disabled }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
    >
      {children}
    </button>
  );
}
