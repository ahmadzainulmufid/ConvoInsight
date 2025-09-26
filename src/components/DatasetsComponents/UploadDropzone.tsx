// components/DatasetsComponents/UploadDropzone.tsx
import React, { useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";
import { saveDatasetBlob } from "../../utils/fileStore";

export type UploadDropzoneProps = {
  section: string;
  onUploaded?: (files: File[]) => void;
  maxSize?: number;
};

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

type UploadItem = {
  id: string;
  file: File;
  progress: number;
  status: "queued" | "uploading" | "done" | "error" | "skipped";
  error?: string;
};

const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  section,
  onUploaded,
  maxSize = 50 * 1024 * 1024,
}) => {
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptOk = (name: string) =>
    name.toLowerCase().endsWith(".csv") ||
    name.toLowerCase().endsWith(".parquet");

  // fake upload per file supaya ada UX feedback
  const fakeUpload = (itemId: string) =>
    new Promise<void>((resolve) => {
      let p = 0;
      const tick = () => {
        p = Math.min(100, p + 8 + Math.random() * 12);
        setItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, progress: p } : it))
        );
        if (p >= 100) return resolve();
        setTimeout(tick, 160);
      };
      tick();
    });

  function toUploadItems(fileList: FileList | File[]): UploadItem[] {
    const arr = Array.from(fileList);
    return arr.map((f) => ({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      progress: 0,
      status: "queued",
    }));
  }

  function validateQueue(q: UploadItem[]) {
    const rejected: UploadItem[] = [];
    const accepted: UploadItem[] = [];
    for (const it of q) {
      if (!acceptOk(it.file.name)) {
        rejected.push({
          ...it,
          status: "skipped",
          error: "Only .csv or .parquet files are allowed.",
        });
        continue;
      }
      if (it.file.size > maxSize) {
        rejected.push({
          ...it,
          status: "skipped",
          error: `File exceeds ${Math.floor(maxSize / (1024 * 1024))} MB.`,
        });
        continue;
      }
      accepted.push(it);
    }

    const summary =
      rejected.length > 0
        ? `Skipped ${rejected.length} file(s):\n- ` +
          rejected.map((r) => `${r.file.name} (${r.error})`).join("\n- ")
        : null;

    return { accepted, rejected, summary };
  }

  async function runUpload(queue: UploadItem[]) {
    setItems((prev) =>
      prev.map((p) =>
        queue.find((q) => q.id === p.id) ? { ...p, status: "uploading" } : p
      )
    );

    await Promise.all(
      queue.map(async (it) => {
        try {
          // 1. Simpan ke IndexedDB
          const arrBuf = await it.file.arrayBuffer();
          const blobObj = new Blob([arrBuf]);
          await saveDatasetBlob(it.file.name, blobObj);

          // 2. Upload ke backend API (GCS)
          if (!section) throw new Error("Section is required for API upload");
          const form = new FormData();
          form.append("files", it.file);

          const res = await fetch(`${API_BASE}/upload_datasets/${section}`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

          // progress UX
          await fakeUpload(it.id);

          setItems((prev) =>
            prev.map((p) =>
              p.id === it.id ? { ...p, status: "done", progress: 100 } : p
            )
          );
        } catch (e) {
          setItems((prev) =>
            prev.map((p) =>
              p.id === it.id
                ? {
                    ...p,
                    status: "error",
                    error:
                      e instanceof Error
                        ? e.message
                        : "Upload failed unexpectedly",
                  }
                : p
            )
          );
        }
      })
    );

    const doneFiles = queue.map((it) => it.file);
    if (doneFiles.length > 0 && onUploaded) onUploaded(doneFiles);

    setTimeout(() => setItems([]), 1500);
  }

  async function handleFiles(fileList: FileList | File[]) {
    setErrorSummary(null);

    const newQueue = toUploadItems(fileList);
    const { accepted, rejected, summary } = validateQueue(newQueue);

    if (summary) {
      setErrorSummary(summary);
      setTimeout(() => {
        setErrorSummary(null);
      }, 4000);
    }

    setItems((prev) => [...prev, ...rejected, ...accepted]);

    setTimeout(() => {
      setItems((prev) =>
        prev.filter((it) => it.status !== "skipped" && it.status !== "error")
      );
    }, 4000);

    if (accepted.length > 0) {
      await runUpload(accepted);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer?.files?.length) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="bg-[#232427] rounded-2xl shadow-sm border border-[#2a2b32] p-5 md:p-6">
      <h2 className="text-xl font-bold text-white">Add datasets</h2>
      <p className="text-gray-300 mt-1">
        Upload one or more <b>CSV</b> / <b>Parquet</b> files, or use a
        connector.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-5 rounded-xl border-2 border-dashed p-10 text-center transition
          ${
            dragging
              ? "border-indigo-400 bg-[#26293a]"
              : "border-[#3a3b42] bg-[#1f2024]"
          }`}
      >
        <FiUploadCloud className="mx-auto text-3xl text-gray-400" />
        <p className="mt-3 text-gray-200">
          Drag & drop files here, or{" "}
          <label
            htmlFor="fileInput"
            className="text-indigo-400 font-medium underline cursor-pointer hover:text-indigo-300"
          >
            click to select
          </label>
        </p>
        <p className="text-sm text-gray-400 mt-2">
          You can select multiple files or sigle files • Max <b>50 MB</b> each
        </p>
        <input
          id="fileInput"
          ref={fileInputRef}
          type="file"
          multiple // ⬅️ penting: allow multi
          accept=".csv,.parquet,text/csv,application/vnd.apache.parquet"
          className="sr-only"
          onChange={(e) => {
            const list = e.target.files;
            if (list && list.length) void handleFiles(list);
          }}
        />
      </div>

      {/* Daftar queue + progress */}
      {items.length > 0 && (
        <div className="mt-4 grid gap-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-lg border border-[#3a3b42] bg-[#1f2024] p-3"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-white">{it.file.name}</div>
                <div className="text-xs text-gray-400">
                  {it.status === "queued" && "Queued"}
                  {it.status === "uploading" && "Uploading…"}
                  {it.status === "done" && "Done"}
                  {it.status === "skipped" && "Skipped"}
                  {it.status === "error" && "Error"}
                </div>
              </div>
              {(it.status === "uploading" || it.status === "done") && (
                <div className="mt-2 h-2 bg-[#2a2b32] rounded overflow-hidden">
                  <div
                    className="h-2 bg-indigo-500 transition-all"
                    style={{ width: `${Math.floor(it.progress)}%` }}
                  />
                </div>
              )}
              {it.error && (
                <div className="mt-2 text-xs text-red-300">⚠️ {it.error}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {errorSummary && (
        <div className="mt-4 flex items-start gap-2 text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 whitespace-pre-wrap">
          <span>⚠️</span>
          <span className="text-sm">{errorSummary}</span>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
