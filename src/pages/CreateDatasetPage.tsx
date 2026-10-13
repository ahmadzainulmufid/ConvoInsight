import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import { FiX } from "react-icons/fi";

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

  function handleCreate() {
    const item = {
      id: `${Date.now()}`,
      name: name || defaultName || "untitled-dataset",
      size,
      uploadedAt: new Date().toLocaleString(),
    };

    const raw = localStorage.getItem("datasets");
    const list = raw ? JSON.parse(raw) : [];
    localStorage.setItem("datasets", JSON.stringify([item, ...list]));

    const pUrl = sessionStorage.getItem("pending_file_url");
    const pName = sessionStorage.getItem("pending_file_name");
    const pKind = sessionStorage.getItem("pending_file_kind");
    if (pUrl) {
      sessionStorage.setItem(`ds_file_url_${item.id}`, pUrl);
      sessionStorage.setItem(`ds_file_name_${item.id}`, pName ?? "");
      sessionStorage.setItem(`ds_file_kind_${item.id}`, pKind ?? "csv");

      sessionStorage.removeItem("pending_file_url");
      sessionStorage.removeItem("pending_file_name");
      sessionStorage.removeItem("pending_file_kind");
    }

    navigate(`/datasets/${item.id}`);
  }

  if (!fileName) return null;

  return (
    <AppShell userName={userName}>
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 grid place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg shadow-indigo-500/25">
            <span className="text-white text-base font-semibold">›_</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white">
            Create new dataset
          </h2>
        </div>

        <div className="bg-[#151923] rounded-2xl shadow-[var(--shadow-card)] border border-white/5 p-5 md:p-6 space-y-5">
          <div className="border-2 border-dashed border-[#272e3f] bg-[#151923] rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#1b2030] text-gray-200 text-sm">
                {fileName}
              </span>

              <button
                type="button"
                onClick={() => navigate("/datasets")}
                title="Remove & choose another file"
                aria-label="Remove & choose another file"
                className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Name{" "}
              <span className="text-gray-500">(URL-friendly identifier)</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., customer-feedback-data"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 transition"
            />
            <p className="text-xs text-gray-500 mt-1">
              Slug: <span className="text-gray-300">{slugify(name)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Describe the purpose and contents of your dataset…"
              className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 transition"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition"
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
