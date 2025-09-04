import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import { FiX /*, FiTrash2 */ } from "react-icons/fi"; // ⬅️ icon

type State = { fileName?: string; size?: number };

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

type Props = { userName: string };

const CreateDatasetPage: React.FC<Props> = ({ userName }) => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: State };
  const fileName = state?.fileName;
  const size = state?.size ?? 0;

  useEffect(() => {
    if (!fileName) navigate("/datasets");
  }, [fileName, navigate]);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  const defaultName = useMemo(
    () => (fileName ? fileName.replace(/\.(csv|parquet)$/i, "") : ""),
    [fileName]
  );
  useEffect(() => {
    if (defaultName) setName(defaultName);
  }, [defaultName]);

  // pages/CreateDatasetPage.tsx
  function handleCreate() {
    const item = {
      id: `${Date.now()}`,
      name: name || defaultName || "untitled-dataset",
      size,
      uploadedAt: new Date().toLocaleString(),
    };

    // simpan meta dataset
    const raw = localStorage.getItem("datasets");
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem("datasets", JSON.stringify([item, ...list]));

    // ⬅️ Pindahkan pending file url -> key berdasarkan datasetId
    const pUrl = sessionStorage.getItem("pending_file_url");
    const pName = sessionStorage.getItem("pending_file_name");
    const pKind = sessionStorage.getItem("pending_file_kind");
    if (pUrl) {
      sessionStorage.setItem(`ds_file_url_${item.id}`, pUrl);
      sessionStorage.setItem(`ds_file_name_${item.id}`, pName ?? "");
      sessionStorage.setItem(`ds_file_kind_${item.id}`, pKind ?? "csv");
      // bersihkan pending
      sessionStorage.removeItem("pending_file_url");
      sessionStorage.removeItem("pending_file_name");
      sessionStorage.removeItem("pending_file_kind");
    }

    // langsung menuju halaman table+chat
    navigate(`/datasets/${item.id}`);
  }

  if (!fileName) return null;

  return (
    <AppShell userName={userName}>
      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-100">
            <span className="text-indigo-600 text-xl">›_</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white">
            Create new dataset
          </h2>
        </div>

        {/* Card */}
        <div className="bg-[#232427] rounded-2xl shadow-sm border border-[#2a2b32] p-5 md:p-6 space-y-5">
          {/* File pill */}
          <div className="border-2 border-dashed border-[#3a3b42] bg-[#1f2024] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#2a2b32] text-gray-200 text-sm">
                {fileName}
              </span>

              {/* Icon button (X). Ganti FiX -> FiTrash2 kalau mau ikon trash */}
              <button
                type="button"
                onClick={() => navigate("/datasets")}
                title="Remove & choose another file"
                aria-label="Remove & choose another file"
                className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <FiX className="w-5 h-5" />
                {/* <FiTrash2 className="w-5 h-5" /> */}
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Name{" "}
              <span className="text-gray-500">(URL-friendly identifier)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., customer-feedback-data"
              className="w-full px-3 py-2 rounded-md bg-[#1f2024] border border-[#2a2b32] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Slug: <span className="text-gray-300">{slugify(name)}</span>
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-gray-300 text-sm mb-1">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Describe the purpose and contents of your dataset…"
              className="w-full px-3 py-2 rounded-md bg-[#1f2024] border border-[#2a2b32] text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
            >
              Create Dataset
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default CreateDatasetPage;
