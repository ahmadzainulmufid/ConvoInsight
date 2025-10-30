import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { addNotification } from "../service/notificationStore";
import DatasetTour from "../components/OnboardingComponents/DatasetTour";
import { db } from "../utils/firebaseSetup";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useAuthUser } from "../utils/firebaseSetup";

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

const DatasetsPage: React.FC<Props> = () => {
  const navigate = useNavigate();
  const section = useSectionFromPath();
  const [items, setItems] = useState<DatasetItem[]>([]);
  const [loading, setLoading] = useState(false);

  // --- Fetch Datasets from API ---
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

  // --- Delete Single Dataset ---
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
        toast.success(`Dataset "${ds.name}" deleted successfully`);
        try {
          await deleteDatasetBlob(ds.id);
        } catch (blobError) {
          console.error("Failed to delete blob:", blobError);
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

  // --- 🧹 Delete All Datasets (tambahkan ini!) ---
  const handleDeleteAll = async () => {
    if (!section) return;
    if (items.length === 0) {
      toast.error("No datasets to delete");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/datasets/${section}/all`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);

      // Hapus juga dari local cache
      for (const ds of items) {
        try {
          await deleteDatasetBlob(ds.id);
        } catch (e) {
          console.warn("Failed to delete local blob:", e);
        }
      }

      setItems([]);
      toast.success("All datasets deleted successfully!");
      await addNotification(
        "dataset",
        "Delete All Datasets",
        "All datasets in this domain have been deleted."
      );
    } catch (err) {
      console.error("Delete all failed:", err);
      toast.error("Failed to delete all datasets");
    }
  };

  const { user } = useAuthUser();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const checkTourStatus = async () => {
      if (!user) return;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (!snap.exists()) return;
      const data = snap.data();

      // cek apakah user masih baru (belum ada domain/chat/dataset/dashboard)
      const domainSnap = await getDocs(
        collection(db, "users", user.uid, "domains")
      );
      const chatSnap = await getDocs(
        collection(db, "users", user.uid, "chats")
      );
      const dashboardSnap = await getDocs(
        collection(db, "users", user.uid, "dashboards")
      );
      const datasetSnap = await getDocs(
        collection(db, "users", user.uid, "datasets")
      );

      const isNewUser =
        domainSnap.empty &&
        chatSnap.empty &&
        dashboardSnap.empty &&
        datasetSnap.empty;

      if (!data.hasSeenDatasetTour && isNewUser && items.length === 0) {
        setShowTour(true);
      }
    };

    void checkTourStatus();
  }, [user, items]);

  // --- Render UI ---
  return (
    <div className="min-h-screen w-full bg-[#1a1b1e] text-white px-6 md:px-10 py-10">
      {showTour && (
        <DatasetTour
          onFinish={async () => {
            if (user) {
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, { hasSeenDatasetTour: true });
            }
            setShowTour(false);
          }}
        />
      )}
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-100">
            <span className="text-indigo-600 text-xl">›_</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold">
            Getting started with ConvoInsight
          </h2>
        </div>

        <UploadDropzone
          className="dataset-upload-area"
          section={section}
          onUploaded={async (files) => {
            try {
              for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("domain", section);

                const res = await fetch(`${API_BASE}/datasets/upload`, {
                  method: "POST",
                  body: formData,
                });

                if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
              }

              toast.success("Dataset uploaded successfully!");
              await addNotification(
                "dataset",
                "Dataset Upload",
                "Your dataset upload completed successfully!"
              );

              // cache ke lokal
              const savePromises = files.map((file) =>
                saveDatasetBlob(file.name, file)
              );
              await Promise.all(savePromises);

              await fetchDatasets();

              if (files.length === 1) {
                navigate(`/domain/${section}/datasets/${files[0].name}`);
              }
            } catch (err) {
              console.error("Failed to upload:", err);
              toast.error("Failed to upload dataset to server.");
            }
          }}
        />

        <ConnectorsRow className="dataset-connectors-row" />

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
            onDeleteAll={handleDeleteAll}
          />
        )}
      </div>
    </div>
  );
};

export default DatasetsPage;
