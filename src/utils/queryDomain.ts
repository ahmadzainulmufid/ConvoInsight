export type DomainQueryResp = {
  session_id: string;
  response: string;
  chart_url?: string | null;
  execution_time: number;
};

export async function queryDomain({
  apiBase,
  domain,
  prompt,
  sessionId,
}: {
  apiBase: string;
  domain: string;
  prompt: string;
  sessionId?: string | null;
}): Promise<DomainQueryResp> {
  const r = await fetch(`${apiBase}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      domain,
      prompt,
      session_id: sessionId ?? undefined,
    }),
  });
  const data = (await r.json()) as DomainQueryResp | { detail?: unknown };
  if (!r.ok) {
    const msg =
      typeof (data as { detail?: unknown })?.detail === "string"
        ? (data as { detail: string }).detail
        : `HTTP ${r.status}`;
    throw new Error(msg);
  }
  return data as DomainQueryResp;
}
