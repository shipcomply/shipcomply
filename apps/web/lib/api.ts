const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
    throw new Error(err.detail ?? `API error ${res.status}`);
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
    localScan: (path: string) =>
      apiFetch("/scans/local", { method: "POST", body: JSON.stringify({ path }) }),
  },
};
