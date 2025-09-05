import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "domains";
const DEFAULT_DOMAINS = ["Campaign", "Fixed", "Mobile"] as const;

// util
function readDomains(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_DOMAINS];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [...DEFAULT_DOMAINS];
    return arr.filter(Boolean);
  } catch {
    return [...DEFAULT_DOMAINS];
  }
}

function writeDomains(domains: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(domains));
  // trigger custom event agar komponen lain ikut refresh
  window.dispatchEvent(new CustomEvent("domains:updated"));
}

export function useDomains() {
  const [domains, setDomains] = useState<string[]>(() => {
    // seed awal bila belum ada
    if (!localStorage.getItem(STORAGE_KEY)) {
      writeDomains([...DEFAULT_DOMAINS]);
    }
    return readDomains();
  });

  // sinkron saat tab lain / komponen lain update
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setDomains(readDomains());
    };
    const onCustom = () => setDomains(readDomains());
    window.addEventListener("storage", onStorage);
    window.addEventListener("domains:updated", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("domains:updated", onCustom as EventListener);
    };
  }, []);

  const addDomain = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, reason: "Nama tidak boleh kosong" };
    const current = readDomains();
    // cegah duplikat (case-insensitive)
    if (current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, reason: "Domain sudah ada" };
    }
    const next = [...current, trimmed];
    writeDomains(next);
    setDomains(next);
    return { ok: true };
  }, []);

  const removeDomain = useCallback((name: string) => {
    const current = readDomains();
    const next = current.filter((d) => d !== name);
    writeDomains(next);
    setDomains(next);
    return { ok: true };
  }, []);

  return { domains, addDomain, removeDomain };
}
