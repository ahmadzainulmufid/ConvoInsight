import React, { useRef, useState } from "react";
import { FiUploadCloud } from "react-icons/fi";

export type UploadDropzoneProps = {
  onUploaded: (file: File) => void;
  maxSize?: number;
};

const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onUploaded,
  maxSize = 50 * 1024 * 1024,
}) => {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptOk = (name: string) =>
    name.toLowerCase().endsWith(".csv") ||
    name.toLowerCase().endsWith(".parquet");

  const fakeUpload = () =>
    new Promise<void>((resolve) => {
      setUploading(true);
      setProgress(0);
      let p = 0;
      const t = setInterval(() => {
        p = Math.min(100, p + 8 + Math.random() * 12);
        setProgress(p);
        if (p >= 100) {
          clearInterval(t);
          setTimeout(resolve, 500);
        }
      }, 180);
    });

  const getKindByName = (name: string) =>
    name.toLowerCase().endsWith(".parquet") ? "parquet" : "csv";

  async function handleFile(file: File) {
    setError(null);
    if (!acceptOk(file.name)) {
      setUploading(false);
      return setError("Only .csv or .parquet files are allowed.");
    }
    if (file.size > maxSize) {
      setUploading(false);
      return setError("File exceeds 5 MB.");
    }

    await fakeUpload();

    // Simpan referensi file untuk halaman detail dataset
    const blobUrl = URL.createObjectURL(file);
    sessionStorage.setItem("pending_file_url", blobUrl);
    sessionStorage.setItem("pending_file_name", file.name);
    sessionStorage.setItem("pending_file_kind", getKindByName(file.name));
    sessionStorage.setItem("pending_file_mime", file.type || "");

    setUploading(false);
    setProgress(0);
    onUploaded(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  return (
    <div className="bg-[#232427] rounded-2xl shadow-sm border border-[#2a2b32] p-5 md:p-6">
      <h2 className="text-xl font-bold text-white">Add a dataset</h2>
      <p className="text-gray-300 mt-1">
        Upload your csv or select a connector to add a dataset
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
        {!uploading ? (
          <>
            <p className="mt-3 text-gray-200">
              Drag and drop <b>csv</b> or <b>parquet</b> files here, or{" "}
              <label
                htmlFor="fileInput"
                className="text-indigo-400 font-medium underline cursor-pointer hover:text-indigo-300"
              >
                click to select
              </label>
            </p>
            <p className="text-sm text-gray-400 mt-2">Max file size: 50 MB</p>
            <input
              id="fileInput"
              ref={fileInputRef}
              type="file"
              accept=".csv,.parquet,text/csv,application/vnd.apache.parquet"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
              }}
            />
          </>
        ) : (
          <div className="mt-3">
            <div className="mx-auto h-8 w-8 border-4 border-[#3a3b42] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-200 mt-3">Uploading…</p>
            <div className="mt-2 w-full max-w-md mx-auto h-2 bg-[#2a2b32] rounded-full overflow-hidden">
              <div
                className="h-2 bg-indigo-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {Math.floor(progress)}%
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-red-300 bg-red-900/30 border border-red-700 rounded-lg px-3 py-2">
          <span>⚠️</span>
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
