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

const DatasetList: React.FC<{
  items: DatasetItem[];
  onView?: (item: DatasetItem) => void;
  onDelete?: (item: DatasetItem) => void;
}> = ({ items, onView, onDelete }) => {
  const [selected, setSelected] = useState<DatasetItem | null>(null);

  if (items.length === 0) return null;

  const confirmDelete = () => {
    if (selected && onDelete) {
      onDelete(selected);
    }
    setSelected(null);
  };

  return (
    <>
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-3">Your datasets</h3>
        <ul className="grid gap-3">
          {items.map((d) => (
            <li
              key={d.id}
              className="bg-[#232427] border border-[#2a2b32] rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-white">{d.name}</p>
                {(d.size > 0 || (d.uploadedAt && d.uploadedAt !== "-")) && (
                  <p className="text-sm text-gray-400">
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
              <div className="flex gap-3">
                {onView && (
                  <button
                    onClick={() => onView(d)}
                    className="text-indigo-400 text-sm hover:underline"
                  >
                    View
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => setSelected(d)}
                    className="text-red-400 text-sm hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#1f2024] text-white p-6 rounded-xl shadow-lg border border-[#3a3b42] w-full max-w-sm space-y-4">
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
                className="px-4 py-1.5 text-sm rounded-md bg-white/10 hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DatasetList;
