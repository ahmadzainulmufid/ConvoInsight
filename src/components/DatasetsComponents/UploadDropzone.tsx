//src/components/DatasetComponents/UploadDropzone.tsx
import React, { useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";

export type UploadDropzoneProps = {
  section: string;
  onUploaded?: (files: File[]) => void;
  maxSize?: number;
  className?: string;
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
  className,
}) => {
  const [dragging, setDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptOk = (name: string) => {
    const lower = name.toLowerCase();
    return (
      lower.endsWith(".csv") ||
      lower.endsWith(".parquet") ||
      lower.endsWith(".xls") ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".pdf") ||
      lower.endsWith(".doc") ||
      lower.endsWith(".docx")
    );
  };

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
    return Array.from(fileList).map((f) => ({
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
          error:
            "Only .csv, .parquet, .xls, or ,.xlsx, .pdf,.doc, or ,.docx files are allowed.",
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
          if (!section) throw new Error("Section is required for API upload");

          const form = new FormData();
          form.append("files", it.file);

          const res = await fetch(`${API_BASE}/upload_datasets/${section}`, {
            method: "POST",
            body: form,
          });

          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

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
      setTimeout(() => setErrorSummary(null), 4000);
    }

    setItems((prev) => [...prev, ...rejected, ...accepted]);

    setTimeout(() => {
      setItems((prev) =>
        prev.filter((it) => it.status !== "skipped" && it.status !== "error")
      );
    }, 4000);

    if (accepted.length > 0) await runUpload(accepted);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (e.dataTransfer?.files?.length) void handleFiles(e.dataTransfer.files);
  };

  return (
    <div
      className={`bg-[#151923] rounded-2xl shadow-[var(--shadow-card)] border border-white/5 p-5 md:p-7 ${
        className ?? ""
      }`}
    >
      <h2 className="text-lg font-semibold tracking-tight text-white">Add datasets</h2>
      <p className="text-sm text-gray-400 mt-1 [&_b]:text-gray-200 [&_b]:font-medium">
        Upload one or more <b>CSV</b>, <b>Excel</b> (<b>.xls</b>, <b>.xlsx</b>),
        or <b>.pdf</b>, <b>.docx</b>, <b>.doc</b> files.
      </p>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`group mt-5 rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200
          ${
            dragging
              ? "border-indigo-400 bg-indigo-500/10 scale-[1.01]"
              : "border-white/10 bg-[#0d1017]/60 hover:border-indigo-500/40 hover:bg-indigo-500/[0.03]"
          }`}
      >
        <div className="mx-auto h-14 w-14 grid place-items-center rounded-2xl bg-indigo-500/10 ring-1 ring-inset ring-indigo-500/25 text-indigo-300">
          <FiUploadCloud className="text-2xl" />
        </div>
        <p className="mt-4 text-gray-200 font-medium">
          Drag & drop files here, or{" "}
          <label
            htmlFor="fileInput"
            className="text-indigo-400 font-semibold underline underline-offset-4 decoration-indigo-400/40 cursor-pointer hover:text-indigo-300"
          >
            click to select
          </label>
        </p>
        <p className="text-xs text-gray-500 mt-2">
          You can select multiple files • Max <b>50 MB</b> each
        </p>

        <input
          id="fileInput"
          ref={fileInputRef}
          type="file"
          multiple
          accept=".csv,.xls,.xlsx,.parquet,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.apache.parquet,.pdf,.doc,.docx"
          className="sr-only"
          onChange={(e) => {
            const list = e.target.files;
            if (list && list.length) void handleFiles(list);
          }}
        />
      </div>

      {/* Upload Queue */}
      {items.length > 0 && (
        <div className="mt-4 grid gap-3">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-xl border border-white/10 bg-[#0d1017]/60 p-3.5"
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
                <div className="mt-2.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all"
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

      {/* Error Summary */}
      {errorSummary && (
        <div className="mt-4 flex items-start gap-2 text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 whitespace-pre-wrap">
          <span>⚠️</span>
          <span className="text-sm">{errorSummary}</span>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
