import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import useSectionFromPath from "../utils/useSectionFromPath";
import { saveDatasetBlob } from "../utils/fileStore";

type Props = { userName: string };
type TableRef = { schema: string; name: string };

type TestResp = { ok: boolean; message?: string };
type ListTablesResp = { tables: TableRef[] };
type ImportResp = {
  ok: boolean;
  columns: string[];
  rowCount: number;
  csv: string;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Unknown error";
  }
}

async function postJSON<T>(
  url: string,
  body: Record<string, unknown>
): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const j = (await r.json()) as T & { detail?: string; message?: string };
  if (!r.ok) {
    const msg =
      (j.detail ?? j.message) || `Request failed with status ${r.status}`;
    throw new Error(msg);
  }
  return j as T;
}

interface FormRowProps {
  label: string;
  children: React.ReactNode;
}
function FormRow({ label, children }: FormRowProps) {
  return (
    <label className="block text-sm text-gray-300">
      {label}
      {children}
    </label>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}
function Btn({ children, onClick, disabled }: BtnProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white"
    >
      {children}
    </button>
  );
}

export default function ConnectPage({ userName }: Props) {
  const navigate = useNavigate();
  const section = useSectionFromPath();

  const [apiBase, setApiBase] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [tables, setTables] = useState<TableRef[]>([]);
  const [selected, setSelected] = useState<TableRef | null>(null);

  async function onTest() {
    if (!apiBase) {
      toast("Fill in the API Base URL first");
      return;
    }
    setLoading(true);
    try {
      const j = await postJSON<TestResp>(
        `${apiBase.replace(/\/$/, "")}/test`,
        token ? { auth: { token } } : {}
      );
      if (j.ok) toast.success(j.message || "Connection OK");
      else toast.error("Connection failed");
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function onListTables() {
    if (!apiBase) {
      toast("Fill in the API Base URL first");
      return;
    }
    setLoading(true);
    try {
      const j = await postJSON<ListTablesResp>(
        `${apiBase.replace(/\/$/, "")}/tables`,
        token ? { auth: { token } } : {}
      );
      setTables(j.tables || []);
      setSelected(null);
      toast.success(`Found ${j.tables?.length ?? 0} tables`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Failed to list tables");
    } finally {
      setLoading(false);
    }
  }

  async function onImport() {
    if (!apiBase) {
      toast("Fill in the API Base URL first");
      return;
    }
    if (!selected) {
      toast("Select the table first");
      return;
    }
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        schema: selected.schema,
        table: selected.name,
        limit: 1000,
      };
      if (token) body.auth = { token };

      const j = await postJSON<ImportResp>(
        `${apiBase.replace(/\/$/, "")}/import`,
        body
      );

      const blob = new Blob([j.csv || ""], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      // Simpan seperti flow-mu (history + file url)
      const id = Date.now().toString();
      const storageKey = section ? `datasets_${section}` : "datasets";
      const uploadedAt = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const name = `${selected.schema}.${selected.name}.csv`;

      const raw = localStorage.getItem(storageKey);
      const prev: Array<{
        id: string;
        name: string;
        size: number;
        uploadedAt: string;
      }> = raw ? JSON.parse(raw) : [];

      localStorage.setItem(
        storageKey,
        JSON.stringify([...prev, { id, name, size: blob.size, uploadedAt }])
      );

      await saveDatasetBlob(id, blob);
      sessionStorage.setItem(`ds_file_url_${id}`, url);
      sessionStorage.setItem(`ds_file_kind_${id}`, "csv");
      sessionStorage.setItem(`ds_file_mime_${id}`, "text/csv");

      toast.success(
        `Imported ${j.rowCount} rows from ${selected.schema}.${selected.name}`
      );
      navigate(`/domain/${section}/datasets/${id}`);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e) || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell userName={userName}>
      <div className="max-w-3xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-white">
          Connect via External Connector API
        </h2>

        <div className="bg-[#232427] border border-[#2a2b32] rounded-xl p-4 space-y-4">
          <FormRow label="API Base URL">
            <input
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
              placeholder="https://connector.example.com/api/connect/postgres"
              className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </FormRow>

          <FormRow label="Auth Token (optional)">
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="e.g. Bearer token or API key"
              className="mt-1 w-full rounded-md bg-[#1f2024] border border-[#3a3b42] px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </FormRow>

          <div className="flex gap-3">
            <Btn onClick={onTest} disabled={loading || !apiBase}>
              Test connection
            </Btn>
            <Btn onClick={onListTables} disabled={loading || !apiBase}>
              List tables
            </Btn>
          </div>
        </div>

        {tables.length > 0 && (
          <div className="bg-[#232427] border border-[#2a2b32] rounded-xl p-4">
            <p className="text-white font-medium mb-3">
              Pick a table to import
            </p>
            <div className="grid gap-2">
              {tables.map((t) => {
                const key = `${t.schema}.${t.name}`;
                const active =
                  selected?.schema === t.schema && selected?.name === t.name;
                return (
                  <button
                    key={key}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      active ? "bg-[#343541]" : "hover:bg-[#2A2B32]"
                    } text-gray-200`}
                  >
                    {t.schema}.{t.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-4">
              <Btn onClick={onImport} disabled={loading || !selected}>
                Import selected
              </Btn>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
