// src/utils/fetchChart.ts
export async function fetchChartHtml(
  apiBase: string,
  chartUrl?: string | null
): Promise<string | undefined> {
  if (!chartUrl) return undefined; // ⬅️ ganti null -> undefined
  const abs = chartUrl.startsWith("http")
    ? chartUrl
    : `${apiBase.replace(/\/+$/, "")}${chartUrl}`;
  const r = await fetch(abs, { method: "GET", cache: "no-store" });
  if (!r.ok) throw new Error(`Fetch chart failed: HTTP ${r.status}`);
  const text = await r.text();
  return text; // ⬅️ tipe: string | undefined
}
