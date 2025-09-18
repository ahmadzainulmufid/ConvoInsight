// src/pages/DatasetsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import UploadDropzone from "../components/DatasetsComponents/UploadDropzone";
import ConnectorsRow from "../components/DatasetsComponents/ConnectorsRow";
import DatasetList, {
  type DatasetItem,
} from "../components/DatasetsComponents/DatasetList";
import useSectionFromPath from "../utils/useSectionFromPath";
import { toast } from "react-hot-toast";

type Props = { userName: string };

const DatasetsPage: React.FC<Props> = ({ userName }) => {
  const navigate = useNavigate();
  const section = useSectionFromPath();

  const storageKey = section ? `datasets_${section}` : "datasets";
  const [items, setItems] = useState<DatasetItem[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    setItems(raw ? JSON.parse(raw) : []);
  }, [storageKey]);

  return (
    <AppShell userName={userName}>
      <div className="space-y-8 px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-100">
            <span className="text-indigo-600 text-xl">›_</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white">
            Getting started with ConvoInsight
          </h2>
        </div>

        <UploadDropzone
          onUploaded={async (files) => {
            try {
              for (const file of files) {
                const form = new FormData();
                form.append("file", file); // ⬅️ cukup satu file per loop

                const res = await fetch(
                  `https://mlbi-pipeline-services-32684464346.asia-southeast2.run.app/upload_datasets/${section}`,
                  { method: "POST", body: form }
                );

                if (!res.ok) {
                  throw new Error(`Upload failed: ${res.status}`);
                }

                const data = await res.json();
                const gcsInfo = data.files[0];

                const id = Date.now().toString();
                const uploadedAt = new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });

                const newItem: DatasetItem = {
                  id,
                  name: gcsInfo.filename,
                  size: file.size,
                  uploadedAt,
                };

                const raw = localStorage.getItem(storageKey);
                const prev: DatasetItem[] = raw ? JSON.parse(raw) : [];
                const updated = [...prev, newItem];
                localStorage.setItem(storageKey, JSON.stringify(updated));
                setItems(updated);

                toast.success("Dataset uploaded successfully!");
                navigate(`/domain/${section}/datasets/${id}`);
              }
            } catch (err: unknown) {
              console.error(err);
              toast.error("Failed to upload dataset");
            }
          }}
        />

        <ConnectorsRow />

        <DatasetList
          items={items}
          onView={(ds) => navigate(`/domain/${section}/datasets/${ds.id}`)}
          onDelete={(ds) => {
            const next = items.filter((x) => x.id !== ds.id);
            setItems(next);
            localStorage.setItem(storageKey, JSON.stringify(next));
          }}
        />
      </div>
    </AppShell>
  );
};

export default DatasetsPage;
