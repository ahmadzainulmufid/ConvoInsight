// src/hooks/useHasDataset.ts
import { useEffect, useState } from "react";

const API_BASE =
  "https://convoinsight-be-flask-32684464346.asia-southeast2.run.app";

export default function useHasDataset(section?: string) {
  const [hasDataset, setHasDataset] = useState<boolean | null>(null);

  useEffect(() => {
    if (!section) return;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/datasets?domain=${section}`);
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const data = await res.json();
        const count = (data.items ?? []).length;
        setHasDataset(count > 0);
      } catch (err) {
        console.error("Error checking dataset:", err);
        setHasDataset(false);
      }
    };
    check();
  }, [section]);

  return hasDataset;
}
