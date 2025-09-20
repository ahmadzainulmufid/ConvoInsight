import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import DataTable from "../components/DatasetsComponents/DataTable";
import type { Row } from "../components/DatasetsComponents/DataTable";

type Props = { userName: string };

const API_BASE =
  "https://mlbi-pipeline-services-32684464346.asia-southeast2.run.app";

const DatasetDetailPage: React.FC<Props> = ({ userName }) => {
  const { section, id } = useParams();
  const navigate = useNavigate();

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || !section) return;

      try {
        // encode filename agar backend FastAPI bisa terima titik (.csv)
        const encodedId = encodeURIComponent(id);

        const res = await fetch(
          `${API_BASE}/domains/${section}/datasets/${encodedId}/preview`
        );
        if (!res.ok) throw new Error(`Failed to fetch preview: ${res.status}`);

        const data = await res.json();
        setHeaders(data.columns || []);
        setRows(data.rows || []);
        setTotalRows(data.total_rows || 0);
        setWarn(null);
      } catch (err) {
        console.error(err);
        setWarn("Failed to load dataset preview.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, section]);

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
        / <span className="text-gray-300">{id || "new-dataset"}</span>
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
