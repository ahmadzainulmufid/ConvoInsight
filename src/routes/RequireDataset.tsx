import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

interface Props {
  children: React.ReactNode;
}

/**
 * Wrapper untuk memastikan user punya minimal 1 dataset di domain aktif.
 */
const RequireDataset: React.FC<Props> = ({ children }) => {
  const navigate = useNavigate();
  const { section } = useParams<{ section: string }>();
  const [hasDataset, setHasDataset] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDatasets = async () => {
      try {
        const res = await fetch(`${API_BASE}/datasets?domain=${section}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);

        const data = await res.json();
        const count = (data.items ?? []).length;
        setHasDataset(count > 0);

        if (count === 0) {
          toast.error("Please upload or connect a dataset first.");
          navigate(`/domain/${section}/datasets`, { replace: true });
        }
      } catch (err) {
        console.error("Dataset check failed:", err);
        toast.error("Error checking datasets. Redirecting...");
        navigate(`/domain/${section}/datasets`, { replace: true });
      }
    };

    if (section) checkDatasets();
  }, [section, navigate]);

  if (hasDataset === null) {
    return (
      <div className="min-h-screen grid place-items-center text-gray-400">
        Checking datasets...
      </div>
    );
  }

  // ✅ Jika ada dataset → render halaman anak
  if (hasDataset) return <>{children}</>;

  // ❌ Jika belum ada dataset → redirect otomatis
  return null;
};

export default RequireDataset;
