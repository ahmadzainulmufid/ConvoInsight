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

type ViewKind = "tabular" | "text_attachment";

const DatasetDetailPage: React.FC<Props> = ({ userName }) => {
  const { section, id } = useParams();
  const navigate = useNavigate();

  const [kind, setKind] = useState<ViewKind>("tabular");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [rawText, setRawText] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [warn, setWarn] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!id || !section) return;

      setLoading(true);
      setWarn(null);

      const ext = id.split(".").pop()?.toLowerCase() ?? "";

      const isAttachment = ["pdf", "docx", "doc"].includes(ext);

      // 📄 MODE: PDF / DOCX / DOC → text preview
      if (isAttachment) {
        setKind("text_attachment");
        try {
          const encodedId = encodeURIComponent(id);
          const res = await fetch(
            `${API_BASE}/datasets/${section}/${encodedId}?as=text`
          );
          if (!res.ok) throw new Error(`Failed to fetch text: ${res.status}`);

          const data = await res.json();
          const text = (data.text as string) || "";

          setRawText(text);
          if (!text.trim()) {
            setWarn("No text extracted from this document.");
          }
        } catch (err) {
          console.error(err);
          setWarn("⚠️ Failed to load document preview from API.");
        } finally {
          setLoading(false);
        }
        return;
      }

      // 📊 MODE: TABULAR → CSV / Excel
      setKind("tabular");

      try {
        // coba load dari cache local dulu (untuk CSV)
        const cached = await getDatasetBlobText(id);
        if (cached) {
          console.log("Loaded from local cache:", id);
          const parsed = Papa.parse(cached, {
            header: true,
            skipEmptyLines: true,
          });
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

        // kalau tidak ada di cache → panggil API JSON
        const encodedId = encodeURIComponent(id);
        const res = await fetch(`${API_BASE}/datasets/${section}/${encodedId}`);
        if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);

        const data = await res.json();
        const records = (data.records as Row[]) || [];

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
      {/* Breadcrumb */}
      <div className="text-sm text-gray-400 mb-3 flex items-center justify-between gap-2">
        <div>
          <button
            onClick={() => navigate(`/domain/${section}/datasets`)}
            className="hover:underline hover:text-gray-300"
          >
            datasets
          </button>{" "}
          /{" "}
          <span className="text-gray-300 break-all">{id || "new-dataset"}</span>
        </div>

        {/* Badge kecil di kanan: jenis preview */}
        <span className="inline-flex items-center rounded-full border border-[#3a3b42] bg-[#1f2024] px-3 py-1 text-xs text-gray-300">
          {kind === "tabular" ? "Table preview" : "Document text preview"}
        </span>
      </div>

      {loading ? (
        <div className="text-gray-300">Loading preview…</div>
      ) : warn ? (
        <div className="text-red-400">{warn}</div>
      ) : kind === "tabular" ? (
        // 📊 TABULAR VIEW
        <div className="w-full">
          <DataTable headers={headers} rows={rows} totalRows={totalRows} />
        </div>
      ) : (
        // 📄 TEXT VIEW UNTUK PDF/DOCX/DOC
        <div className="w-full bg-[#18191c] border border-[#2a2b32] rounded-xl p-4 max-h-[70vh] overflow-auto">
          <pre className="whitespace-pre-wrap text-sm text-gray-100">
            {rawText || "(No text extracted from this file.)"}
          </pre>
        </div>
      )}
    </AppShell>
  );
};

export default DatasetDetailPage;
