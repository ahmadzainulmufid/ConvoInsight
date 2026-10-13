import React, { useState } from "react";

export type DatasetItem = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

const humanSize = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / 1024 / 1024).toFixed(2)} MB`
    : `${(b / 1024).toFixed(0)} KB`;

type Props = {
  items: DatasetItem[];
  onEdit?: (item: DatasetItem) => void;
  onView?: (item: DatasetItem) => void;
  onDelete?: (item: DatasetItem) => void;
  onDeleteAll?: () => void;
};

const DatasetList: React.FC<Props> = ({
  items,
  onEdit,
  onView,
  onDelete,
  onDeleteAll,
}) => {
  const [selected, setSelected] = useState<DatasetItem | null>(null);
  const [confirmAll, setConfirmAll] = useState(false); // 🔹 state modal Delete All

  if (items.length === 0) return null;

  const confirmDelete = () => {
    if (selected && onDelete) onDelete(selected);
    setSelected(null);
  };

  const confirmDeleteAll = () => {
    if (onDeleteAll) onDeleteAll();
    setConfirmAll(false);
  };

  return (
    <>
      <div className="mt-6">
        {/* Header sejajar */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold tracking-tight text-white">
            Your datasets{" "}
            <span className="ml-1 rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
              {items.length}
            </span>
          </h3>

          {onDeleteAll && (
            <button
              onClick={() => setConfirmAll(true)}
              className="px-3 py-1.5 bg-rose-500/10 text-rose-300 ring-1 ring-inset ring-rose-500/30 hover:bg-rose-500/20 text-sm font-medium rounded-lg transition"
            >
              Delete All
            </button>
          )}
        </div>

        {/* Daftar dataset */}
        <ul className="grid gap-3">
          {items.map((d) => (
            <li
              key={d.id}
              className="group bg-[#151923] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25 text-[10px] font-bold uppercase">
                {(d.name.split(".").pop() || "file").slice(0, 4)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{d.name}</p>
                {(d.size > 0 || (d.uploadedAt && d.uploadedAt !== "-")) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {d.size > 0 && <>{humanSize(d.size)}</>}
                    {d.size > 0 &&
                      d.uploadedAt &&
                      d.uploadedAt !== "-" &&
                      " • "}
                    {d.uploadedAt && d.uploadedAt !== "-" && (
                      <>Uploaded {d.uploadedAt}</>
                    )}
                  </p>
                )}
              </div>
              </div>

              <div className="flex gap-1.5 shrink-0">
                {onEdit && (
                  <button
                    onClick={() => onEdit(d)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
                  >
                    Edit
                  </button>
                )}
                {onView && (
                  <button
                    onClick={() => onView(d)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition"
                  >
                    View
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setSelected(d)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 🔸 Modal konfirmasi delete satu dataset */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#151923] text-white p-6 rounded-2xl shadow-2xl shadow-black/40 border border-white/10 w-full max-w-sm space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold">Delete Dataset?</h2>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete the dataset{" "}
              <span className="font-semibold text-white">
                "{selected.name}"
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔸 Modal konfirmasi delete ALL datasets */}
      {confirmAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#151923] text-white p-6 rounded-2xl shadow-2xl shadow-black/40 border border-white/10 w-full max-w-sm space-y-4 animate-fade-in">
            <h2 className="text-lg font-semibold">Delete All Datasets?</h2>
            <p className="text-sm text-gray-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                all datasets in this domain
              </span>
              ?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmAll(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAll}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetList;
