export type KPIKey =
  | "active_users"
  | "conversion_rate"
  | "total_revenue"
  | "retention_rate"
  | "avg_session_duration"
  | "ctr"
  | "cpa"
  | `column:${string}`;

export type KPIItem = { key: KPIKey; label: string; unit?: string };

export const BUILTIN_KPIS: KPIItem[] = [
  { key: "active_users", label: "Active Users" },
  { key: "conversion_rate", label: "Conversion Rate", unit: "%" },
  { key: "total_revenue", label: "Total Revenue", unit: "IDR" },
  { key: "retention_rate", label: "Retention Rate", unit: "%" },
  { key: "avg_session_duration", label: "Avg. Session Duration", unit: "min" },
  { key: "ctr", label: "CTR", unit: "%" },
  { key: "cpa", label: "CPA", unit: "IDR" },
];
