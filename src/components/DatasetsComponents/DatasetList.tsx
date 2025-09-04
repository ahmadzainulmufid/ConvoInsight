import React from "react";

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
  if (items.length === 0) return null;
  return (
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
              <p className="text-sm text-gray-400">
                {humanSize(d.size)} • Uploaded {d.uploadedAt}
              </p>
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
                  onClick={() => onDelete(d)}
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
  );
};

export default DatasetList;
