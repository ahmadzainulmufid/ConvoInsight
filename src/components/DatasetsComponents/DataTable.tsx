import React, { useMemo, useState } from "react";

export type Row = Record<string, string>;

export type DataTableProps = {
  headers: string[];
  rows: Row[];
  totalRows?: number;
  className?: string;
};

const pill = (v: string) => {
  const val = (v ?? "").toLowerCase();
  if (["yes", "true"].includes(val))
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-700/40">
        Yes
      </span>
    );
  if (["no", "false"].includes(val))
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-rose-900/40 text-rose-300 border border-rose-700/40">
        No
      </span>
    );
  if (val === "male")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-sky-900/40 text-sky-300 border border-sky-700/40">
        Male
      </span>
    );
  if (val === "female")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-pink-900/40 text-pink-300 border border-pink-700/40">
        Female
      </span>
    );
  return v || "";
};

const DataTable: React.FC<DataTableProps> = ({
  headers,
  rows,
  totalRows,
  className,
}) => {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const k = q.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => (v ?? "").toLowerCase().includes(k))
    );
  }, [q, rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const start = (page - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);

  return (
    <div
      className={`bg-[#232427] rounded-2xl border border-[#2a2b32] ${
        className || ""
      }`}
    >
      <div className="p-4 border-b border-[#2a2b32]">
        <h2 className="text-lg font-semibold text-white">Table view</h2>
      </div>

      <div className="p-4">
        {/* Search */}
        <div className="mb-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search in table…"
            className="w-full rounded-md bg-[#1f2024] border border-[#2a2b32] text-gray-100 placeholder:text-gray-500 px-3 py-2 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Table */}
        <div className="rounded-md border border-[#2a2b32] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#1f2024] text-gray-300">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left font-medium px-3 py-2 border-b border-[#2a2b32]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {slice.length === 0 ? (
                <tr>
                  <td
                    colSpan={headers.length}
                    className="px-3 py-8 text-center text-gray-400"
                  >
                    {headers.length
                      ? "No rows match your search."
                      : "Preview unavailable."}
                  </td>
                </tr>
              ) : (
                slice.map((r, i) => (
                  <tr key={i} className="even:bg-black/10">
                    {headers.map((h) => (
                      <td
                        key={h}
                        className="px-3 py-2 border-b border-[#2a2b32]"
                      >
                        {pill(r[h])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPerPage(n);
                setPage(1);
              }}
              className="bg-[#1f2024] border border-[#2a2b32] rounded-md px-2 py-1"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>per page</span>
            <span className="ml-4">
              Page <b>{page}</b> of <b>{pages}</b> • {totalRows ?? rows.length}{" "}
              records
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-md border border-[#2a2b32] bg-[#1f2024] disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="px-3 py-1 rounded-md border border-[#2a2b32] bg-[#1f2024] disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTable;
