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
      <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-medium">
        Yes
      </span>
    );
  if (["no", "false"].includes(val))
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-rose-500/10 text-rose-300 border border-rose-500/25 font-medium">
        No
      </span>
    );
  if (val === "male")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-sky-500/10 text-sky-300 border border-sky-500/25 font-medium">
        Male
      </span>
    );
  if (val === "female")
    return (
      <span className="px-2 py-0.5 rounded-full text-xs bg-pink-500/10 text-pink-300 border border-pink-500/25 font-medium">
        Female
      </span>
    );
  return v || "";
};

const formatValue = (v: string) => {
  if (!v) return "";
  const num = Number(v);
  if (!isNaN(num)) {
    return new Intl.NumberFormat("en-US").format(num);
  }
  return v;
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
      className={`bg-[#151923] rounded-2xl border border-white/10 shadow-[var(--shadow-card)] ${
        className || ""
      }`}
    >
      <div className="px-5 py-4 border-b border-white/5">
        <h2 className="text-base font-semibold tracking-tight text-white">Table view</h2>
      </div>

      <div className="p-5">
        {/* Search */}
        <div className="mb-4">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search in table…"
            className="w-full rounded-xl bg-[#0d1017]/70 border border-white/10 text-gray-100 placeholder:text-gray-500 px-3 py-2 focus:outline-none focus:border-indigo-500/60 focus:ring-4 focus:ring-indigo-500/10 transition"
          />
        </div>

        {/* Table */}
        <div className="rounded-xl border border-white/10 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#1b2030] text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                {headers.map((h) => (
                  <th
                    key={h}
                    className="text-left font-semibold px-3 py-2.5 border-b border-white/10 whitespace-nowrap"
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
                  <tr
                    key={i}
                    className="even:bg-white/[0.02] hover:bg-indigo-500/5 transition-colors"
                  >
                    {headers.map((h) => {
                      const val = formatValue(r[h]);
                      return (
                        <td
                          key={h}
                          className="px-3 py-2 border-b border-white/5 max-w-[200px] truncate hover:whitespace-normal transition"
                          title={val}
                        >
                          {pill(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="mt-4 flex flex-wrap gap-3 items-center justify-between text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <select
              value={perPage}
              onChange={(e) => {
                const n = Number(e.target.value);
                setPerPage(n);
                setPage(1);
              }}
              className="bg-[#0d1017]/70 border border-white/10 rounded-lg px-2 py-1 text-gray-200 focus:outline-none focus:border-indigo-500/60"
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
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition"
            >
              Previous
            </button>
            <button
              disabled={page >= pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-gray-200 hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-white/5 transition"
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
