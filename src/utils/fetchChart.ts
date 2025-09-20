// src/utils/fetchChart.ts
export async function fetchChartHtml(
  apiBase: string,
  chartUrl?: string | null
) {
  if (!chartUrl) return null;
  const abs = chartUrl.startsWith("http")
    ? chartUrl
    : `${apiBase.replace(/\/+$/, "")}${chartUrl}`;
  const r = await fetch(abs, { method: "GET" });
  if (!r.ok) throw new Error(`Fetch chart failed: HTTP ${r.status}`);
  return await r.text();
}
