import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import DataTable from "../components/DatasetsComponents/DataTable";
import type { Row } from "../components/DatasetsComponents/DataTable";
import { getDatasetBlobText } from "../utils/fileStore";
import Papa from "papaparse";

type Props = { userName: string };

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

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
        setLoading(true);

        const cached = await getDatasetBlobText(id);
        if (cached) {
          console.log("Loaded from local cache:", id);
          const parsed = Papa.parse(cached, { header: true });
          const records = parsed.data as Row[];

          if (records.length > 0) {
            const headers = Object.keys(records[0]);
            setHeaders(headers);
            setRows(records);
            setTotalRows(records.length);
            setWarn(null);
            setLoading(false);
            return;
          }
        }

        const encodedId = encodeURIComponent(id);
        const res = await fetch(`${API_BASE}/datasets/${section}/${encodedId}`);
        if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);

        const data = await res.json();
        const records = data.records || [];

        if (records.length === 0) {
          setHeaders([]);
          setRows([]);
          setTotalRows(0);
          setWarn("No data found in this dataset.");
          return;
        }

        const firstRecord = records[0];
        const headers = Object.keys(firstRecord);
        setHeaders(headers);
        setRows(records);
        setTotalRows(records.length);
        setWarn(null);
      } catch (err) {
        console.error(err);
        setWarn("⚠️ Failed to load dataset preview from API.");
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
        <div className="text-red-400">{warn}</div>
      ) : (
        <div className="w-full">
          <DataTable headers={headers} rows={rows} totalRows={totalRows} />
        </div>
      )}
    </AppShell>
  );
};

export default DatasetDetailPage;
