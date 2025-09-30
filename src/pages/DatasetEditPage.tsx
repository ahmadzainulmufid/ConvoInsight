import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import { toast } from "react-hot-toast";
import Papa from "papaparse";
import { getDatasetBlobText } from "../utils/fileStore";

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

type ColumnMeta = {
  name: string;
  type: string;
  description: string;
};

const DATA_TYPES = [
  "string",
  "integer",
  "float",
  "boolean",
  "datetime",
  "date",
  "time",
];

const DatasetEditPage: React.FC<{ userName: string }> = ({ userName }) => {
  const { section, id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [columns, setColumns] = useState<ColumnMeta[]>([]);

  useEffect(() => {
    async function loadDataset() {
      if (!section || !id) return;

      try {
        setLoading(true);

        const cached = await getDatasetBlobText(id);
        let headers: string[] = [];

        if (cached) {
          const parsed = Papa.parse(cached, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            delimiter: "",
          });

          if (parsed.meta.fields) {
            headers = parsed.meta.fields;
          }
        } else {
          const res = await fetch(
            `${API_BASE}/datasets/${section}/${id}?as=csv`
          );
          if (!res.ok) throw new Error("Failed to fetch dataset CSV");
          const text = await res.text();
          const parsed = Papa.parse(text, {
            header: true,
            dynamicTyping: false,
            skipEmptyLines: true,
            delimiter: "",
          });
          if (parsed.meta.fields) {
            headers = parsed.meta.fields;
          }
        }

        const initialCols = headers.map((col) => ({
          name: col,
          type: "string",
          description: "",
        }));

        setColumns(initialCols);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load dataset structure");
      } finally {
        setLoading(false);
      }
    }

    void loadDataset();
  }, [id, section]);

  const updateColumn = (
    colName: string,
    field: keyof ColumnMeta,
    value: string
  ) => {
    setColumns((prev) =>
      prev.map((c) =>
        c.name === colName
          ? {
              ...c,
              [field]: value,
            }
          : c
      )
    );
  };

  const handleSave = async () => {
    if (!section || !id) return;

    try {
      const payload = {
        description,
        columns,
      };

      const res = await fetch(
        `${API_BASE}/datasets/${section}/${id}/metadata`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Failed to save metadata");

      toast.success("Metadata saved successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save metadata");
    }
  };

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
        / <span className="text-gray-300">{id}</span> /{" "}
        <span className="text-indigo-400">edit</span>
      </div>

      <h2 className="text-2xl text-white font-semibold mb-6">
        Edit Dataset (Opsional)
      </h2>

      {loading ? (
        <p className="text-gray-400">Loading dataset structure…</p>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Dataset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Dataset Name
            </label>
            <input
              value={id || ""}
              disabled
              className="w-full px-3 py-2 bg-[#1f2024] border border-[#2a2b32] rounded-md text-gray-400 cursor-not-allowed"
            />
          </div>

          {/* Dataset Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter dataset description..."
              className="w-full min-h-[100px] px-3 py-2 bg-[#1f2024] border border-[#2a2b32] rounded-md text-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Column Metadata */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Column Details
            </label>

            <div className="space-y-4">
              {columns.map((col) => (
                <div
                  key={col.name}
                  className="p-4 rounded-lg bg-[#232427] border border-[#2a2b32]"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    {/* Column Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Column Name
                      </label>
                      <input
                        value={col.name}
                        disabled
                        className="w-full px-3 py-2 bg-[#1f2024] border border-[#2a2b32] rounded-md text-gray-400 cursor-not-allowed"
                      />
                    </div>

                    {/* Column Type */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Type
                      </label>
                      <select
                        value={col.type}
                        onChange={(e) =>
                          updateColumn(col.name, "type", e.target.value)
                        }
                        className="w-full px-3 py-2 bg-[#1f2024] border border-[#2a2b32] rounded-md text-white focus:ring-1 focus:ring-indigo-500"
                      >
                        {DATA_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Column Description */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={col.description}
                        onChange={(e) =>
                          updateColumn(col.name, "description", e.target.value)
                        }
                        placeholder="Describe this column..."
                        className="w-full px-3 py-2 bg-[#1f2024] border border-[#2a2b32] rounded-md text-white focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => navigate(`/domain/${section}/datasets`)}
              className="px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm text-gray-300"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-sm text-white"
            >
              Save Metadata
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export default DatasetEditPage;
