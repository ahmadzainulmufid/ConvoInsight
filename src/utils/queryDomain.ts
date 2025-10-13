export type DomainQueryResp = {
  session_id: string;
  response: string;
  chart_url?: string | null;
  execution_time: number;
  insights?: string[];

  // 🧩 Tambahan flag dari backend (opsional)
  need_router?: boolean;
  need_orchestrator?: boolean;
  need_manipulator?: boolean;
  need_analyzer?: boolean;
  need_visualizer?: boolean;
  need_compiler?: boolean;
};

export async function queryDomain({
  apiBase,
  domain,
  prompt,
  sessionId,
  signal,
  dataset,
  includeInsight,
}: {
  apiBase: string;
  domain: string;
  prompt: string;
  sessionId?: string | null;
  signal?: AbortSignal;
  dataset?: string[];
  includeInsight?: boolean;
}): Promise<DomainQueryResp> {
  const r = await fetch(`${apiBase}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain,
      prompt,
      session_id: sessionId ?? undefined,
      dataset: dataset ?? undefined,
      includeInsight: includeInsight ?? true,
    }),
    signal,
  });

  // --- Aman dari error parsing ---
  const raw = await r.json().catch(() => ({}));
  const data = raw as Partial<DomainQueryResp> & { detail?: unknown };

  if (!r.ok) {
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : `HTTP ${r.status} — ${JSON.stringify(data)}`;
    throw new Error(msg);
  }

  // --- Normalisasi field biar selalu ada ---
  return {
    session_id: data.session_id ?? "",
    response: data.response ?? "",
    chart_url: data.chart_url ?? null,
    execution_time: data.execution_time ?? 0,
    insights: data.insights ?? [],
    need_router: data.need_router ?? true,
    need_orchestrator: data.need_orchestrator ?? true,
    need_manipulator: data.need_manipulator ?? false,
    need_analyzer: data.need_analyzer ?? false,
    need_visualizer: data.need_visualizer ?? false,
    need_compiler: data.need_compiler ?? true,
  };
}
