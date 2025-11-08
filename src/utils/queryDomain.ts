export type DomainQueryResp = {
  session_id: string;
  response: string;

  // lama (dev, path relatif GCS)
  chart_url?: string | null;

  // baru (Supabase / atau signed link lain)
  diagram_kind?: "charts" | "tables" | string | null;
  diagram_signed_url?: string | null;
  diagram_public_url?: string | null;
  diagram_gs_uri?: string | null;

  execution_time: number;
  insights?: string[];

  // flags opsional dari backend
  need_router?: boolean;
  need_orchestrator?: boolean;
  need_manipulator?: boolean;
  need_analyzer?: boolean;
  need_visualizer?: boolean;
  need_compiler?: boolean;

  plan_explainer?: string;
  need_plan_explainer?: boolean;
};

type QueryOpts = {
  apiBase: string;
  domain: string;
  prompt: string;
  sessionId?: string | null;
  signal?: AbortSignal;

  dataset?: string[] | string;
  includeInsight?: boolean;

  provider?: string;
  model?: string;
  apiKey?: string | null;  // tetap opsional, tapi akan difilter
  userId?: string | null;
};

export async function queryDomain({
  apiBase,
  domain,
  prompt,
  sessionId,
  signal,
  dataset,
  includeInsight,
  provider,
  model,
  apiKey,
  userId,
}: QueryOpts): Promise<DomainQueryResp> {
  // Guard: kalau ada yang tak sengaja ngirim token terenkripsi, buang.
  const cleanedApiKey =
    typeof apiKey === "string" && apiKey.startsWith("gAAAA") ? undefined : apiKey ?? undefined;

  const body: Record<string, unknown> = {
    domain,
    prompt,
    session_id: sessionId ?? undefined,
    dataset: dataset ?? undefined,
    includeInsight: includeInsight ?? true,
    provider: provider ?? undefined,
    model: model ?? undefined,
    apiKey: cleanedApiKey, // biasanya undefined
    userId: userId ?? undefined,
  };

  const r = await fetch(`${apiBase}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  const raw = await r.json().catch(() => ({}));
  const data = raw as Partial<DomainQueryResp> & { detail?: unknown };

  if (!r.ok) {
    const msg =
      typeof data.detail === "string"
        ? data.detail
        : `HTTP ${r.status} — ${JSON.stringify(data)}`;
    throw new Error(msg);
  }

  return {
    session_id: data.session_id ?? "",
    response: data.response ?? "",
    chart_url: data.chart_url ?? null,
    diagram_kind: (data.diagram_kind as DomainQueryResp["diagram_kind"]) ?? null,
    diagram_signed_url: data.diagram_signed_url ?? null,
    diagram_public_url: data.diagram_public_url ?? null,
    diagram_gs_uri: data.diagram_gs_uri ?? null,
    execution_time: data.execution_time ?? 0,
    insights: data.insights ?? [],
    need_router: data.need_router ?? true,
    need_orchestrator: data.need_orchestrator ?? true,
    need_manipulator: data.need_manipulator ?? false,
    need_analyzer: data.need_analyzer ?? false,
    need_visualizer: data.need_visualizer ?? false,
    need_compiler: data.need_compiler ?? true,
    plan_explainer:
      typeof data.plan_explainer === "string" ? data.plan_explainer : "",
    need_plan_explainer:
      typeof data.need_plan_explainer === "boolean"
        ? data.need_plan_explainer
        : true,
  };
}
