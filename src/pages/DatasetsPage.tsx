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
import { saveDatasetBlob } from "../utils/fileStore";

type Props = { userName: string };

const DatasetsPage: React.FC<Props> = ({ userName }) => {
  const navigate = useNavigate();
  const section = useSectionFromPath();

  const storageKey = section ? `datasets_${section}` : "datasets";
  const [items, setItems] = useState<DatasetItem[]>([]);

  const getKindByName = (name: string) =>
    name.toLowerCase().endsWith(".parquet") ? "parquet" : "csv";

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
            if (!files.length) return;

            // muat dataset lama
            const raw = localStorage.getItem(storageKey);
            const prev: DatasetItem[] = raw ? JSON.parse(raw) : [];
            const now = new Date();
            const uploadedAt = now.toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            const newItems: DatasetItem[] = [];
            for (const file of files) {
              const id =
                Date.now().toString() +
                "_" +
                Math.random().toString(36).slice(2, 8);
              const item: DatasetItem = {
                id,
                name: file.name,
                size: file.size,
                uploadedAt,
              };
              newItems.push(item);

              // simpan blob ke IndexedDB
              await saveDatasetBlob(id, file);

              // metadata ringan untuk detail
              sessionStorage.setItem(
                `ds_file_kind_${id}`,
                getKindByName(file.name)
              );
              sessionStorage.setItem(
                `ds_file_mime_${id}`,
                file.type || "text/csv"
              );

              // (opsional) URL blob sementara kalau halaman detail butuh preview cepat
              const blobUrl = URL.createObjectURL(file);
              sessionStorage.setItem(`pending_file_url_${id}`, blobUrl);
              sessionStorage.setItem(`pending_file_name_${id}`, file.name);
              sessionStorage.setItem(
                `pending_file_kind_${id}`,
                getKindByName(file.name)
              );
              sessionStorage.setItem(
                `pending_file_mime_${id}`,
                file.type || ""
              );
            }

            const updated = [...prev, ...newItems];
            localStorage.setItem(storageKey, JSON.stringify(updated));
            setItems(updated);

            if (files.length === 1) {
              toast.success(`"${files[0].name}" uploaded successfully!`);
              navigate(`/domain/${section}/datasets/${newItems[0].id}`);
            } else {
              toast.success(`${files.length} datasets uploaded successfully!`);
              // tetap di halaman list supaya user bisa pilih mana yang mau dibuka
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
