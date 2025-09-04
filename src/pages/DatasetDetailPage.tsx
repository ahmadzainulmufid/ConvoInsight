import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import DataTable from "../components/DatasetsComponents/DataTable";
import type { Row } from "../components/DatasetsComponents/DataTable";
import { getDatasetBlob } from "../utils/fileStore";

type Props = { userName: string };

type DatasetMeta = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

function splitCSVLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const DatasetDetailPage: React.FC<Props> = ({ userName }) => {
  const { section, id } = useParams();
  const navigate = useNavigate();

  const storageKey = section ? `datasets_${section}` : "datasets";
  const list = useMemo<DatasetMeta[]>(() => {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  }, [storageKey]);

  const dataset = list.find((d) => d.id === id);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const kind = sessionStorage.getItem(`ds_file_kind_${id}`) || "csv";
      if (kind !== "csv") {
        setWarn("Preview for parquet is not enabled yet.");
        setLoading(false);
        return;
      }

      try {
        const blob = await getDatasetBlob(id);
        if (!blob) {
          setWarn("File content not found.");
          setLoading(false);
          return;
        }

        const text = await blob.text();

        // ✅ bikin lines dulu
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
        if (lines.length === 0) {
          setWarn("Empty file.");
          setLoading(false);
          return;
        }

        // header
        const rawHdrs = splitCSVLine(lines[0]);
        const hdrs = rawHdrs.map((h) => h.trim());

        // rows
        const data: Row[] = lines.slice(1).map((l) => {
          const cells = splitCSVLine(l);
          const obj: Row = {};
          hdrs.forEach((h, i) => {
            obj[h] = (cells[i] ?? "").trim();
          });
          return obj;
        });

        setHeaders(hdrs);
        setRows(data);
        setTotalRows(data.length);
        setWarn(null);
      } catch {
        setWarn("Failed to read file.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  return (
    <AppShell
      userName={userName}
      containerClassName="max-w-none"
      contentPadding="px-4 md:px-6 py-4"
    >
      <div className="text-sm text-gray-400 mb-3">
        <button
          onClick={() => navigate(`/domain/${section}/datasets`)}
          className="hover:underline hover:text-gray-300"
        >
          datasets
        </button>{" "}
        /{" "}
        <span className="text-gray-300">{dataset?.name || "new-dataset"}</span>
      </div>

      {loading ? (
        <div className="text-gray-300">Loading table…</div>
      ) : warn ? (
        <div className="text-gray-300">{warn}</div>
      ) : (
        <div className="w-full">
          <DataTable headers={headers} rows={rows} totalRows={totalRows} />
        </div>
      )}
    </AppShell>
  );
};

export default DatasetDetailPage;
