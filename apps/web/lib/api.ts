export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ProvisioningError extends Error {
  retryAfter: number;
  constructor(retryAfter = 3) {
    super("Account provisioning in progress — retry in a moment");
    this.name = "ProvisioningError";
    this.retryAfter = retryAfter;
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    if (res.status === 409 && (err.detail?.code === "PROVISIONING" || err.code === "PROVISIONING")) {
      throw new ProvisioningError(err.detail?.retry_after ?? err.retry_after ?? 3);
    }
    const message = typeof err.detail === "string"
      ? err.detail
      : err.detail?.message ?? `API error ${res.status}`;
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export function getAuthHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export const api = {
  scan: {
    create: (body: unknown, token: string) =>
      apiFetch("/scans", { method: "POST", body: JSON.stringify(body), headers: getAuthHeaders(token) }),
    get: (id: string, token: string) =>
      apiFetch(`/scans/${id}`, { headers: getAuthHeaders(token) }),
    audit: (id: string, token: string) =>
      apiFetch(`/scans/${id}/audit`, { headers: getAuthHeaders(token) }),
    policy: (id: string, token: string) =>
      apiFetch(`/scans/${id}/policy`, { headers: getAuthHeaders(token) }),
    graph: (id: string, token: string) =>
      apiFetch(`/scans/${id}/graph`, { headers: getAuthHeaders(token) }),
    list: (token: string) =>
      apiFetch<unknown[]>("/scans", { headers: getAuthHeaders(token) }),
    localScan: (path: string) =>
      apiFetch("/scans/local", { method: "POST", body: JSON.stringify({ path }) }),
  },
  corpus: {
    status: () =>
      apiFetch<{ count: number; jurisdictions: string[]; loaded: boolean }>("/corpus/status"),
  },
};
