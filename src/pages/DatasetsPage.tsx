import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/DatasetsComponents/AppShell";
import UploadDropzone from "../components/DatasetsComponents/UploadDropzone";
import ConnectorsRow from "../components/DatasetsComponents/ConnectorsRow";
import DatasetList, {
  type DatasetItem,
} from "../components/DatasetsComponents/DatasetList";
import useSectionFromPath from "../utils/useSectionFromPath";
import { toast } from "react-hot-toast";
import {
  saveDatasetBlob,
  getDatasetBlob,
  deleteDatasetBlob,
} from "../utils/fileStore";

type Props = { userName: string };

type DatasetApiItem = {
  domain: string;
  filename: string;
  gs_uri?: string;
  size_bytes?: number;
  signed_url?: string;
  updated?: string;
};

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

const DatasetsPage: React.FC<Props> = ({ userName }) => {
  const navigate = useNavigate();
  const section = useSectionFromPath();
  const [items, setItems] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDatasets = useCallback(async () => {
    if (!section) return;

    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/datasets?domain=${section}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);

      const data = await res.json();

      const rawItems = (data.items ?? []) as DatasetApiItem[];

      const datasets: DatasetItem[] = rawItems.map((d) => ({
        id: d.filename,
        name: d.filename,
        gcs_path: d.gs_uri ?? "",
        size:
          typeof d.size_bytes === "number" && !isNaN(d.size_bytes)
            ? d.size_bytes
            : 0,
        uploadedAt: d.updated
          ? new Date(d.updated).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "-",
      }));

      setItems(datasets);

      console.log("Starting background sync for local dataset blobs...");

      for (const ds of datasets) {
        const hasBlob = await getDatasetBlob(ds.id);
        if (!hasBlob) {
          console.log(
            `Blob for "${ds.name}" not found locally, downloading...`
          );
          try {
            const fileRes = await fetch(
              `${API_BASE}/datasets/${section}/${encodeURIComponent(
                ds.id
              )}?as=csv`
            );
            if (!fileRes.ok) throw new Error("Download failed");
            const blob = await fileRes.blob();
            await saveDatasetBlob(ds.id, blob);
            console.log(`Cached "${ds.name}" locally.`);
          } catch (err) {
            console.error(`Failed to download and cache "${ds.name}"`, err);
          }
        }
      }
    } catch (err) {
      console.error("Error loading datasets:", err);
      toast.error("Failed to load datasets");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [section]);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleDelete = async (ds: DatasetItem) => {
    if (!section) return;

    try {
      const encoded = encodeURIComponent(ds.id);
      const res = await fetch(`${API_BASE}/datasets/${section}/${encoded}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      const json = await res.json();
      if (json.deleted) {
        toast.success(`Dataset "${ds.name}" deleted success`);

        try {
          await deleteDatasetBlob(ds.id);
        } catch (blobError) {
          console.error("Failed to delete blob:", blobError);
          toast.error(`Could not remove "${ds.name}" from local storage.`);
        }

        setItems((prev) => prev.filter((x) => x.id !== ds.id));
      } else {
        toast.error(`Failed to delete "${ds.name}"`);
      }
    } catch (err) {
      console.error(err);
      toast.error(`Error deleting "${ds.name}"`);
    }
  };

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
          section={section}
          onUploaded={async (files) => {
            toast.success("Dataset uploaded successfully!");
            try {
              const savePromises = files.map((file) =>
                saveDatasetBlob(file.name, file)
              );
              await Promise.all(savePromises);
            } catch (err) {
              console.error("Failed to save blobs locally:", err);
              toast.error("Could not save dataset to local storage.");
            }

            await fetchDatasets();

            if (files.length === 1) {
              navigate(`/domain/${section}/datasets/${files[0].name}`);
            }
          }}
        />

        <ConnectorsRow />

        {loading ? (
          <p className="text-sm text-gray-400">Loading datasets…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-400">No datasets uploaded yet.</p>
        ) : (
          <DatasetList
            items={items}
            onEdit={(ds) =>
              navigate(`/domain/${section}/datasets/${ds.id}/edit`)
            }
            onView={(ds) => navigate(`/domain/${section}/datasets/${ds.id}`)}
            onDelete={handleDelete}
          />
        )}
      </div>
    </AppShell>
  );
};

export default DatasetsPage;
