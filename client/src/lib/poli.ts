import type { PoLiSnapshot } from "@shared/poli";

export async function fetchPoLi(params?: {
  token?: string;
  venue?: string;
  scope?: string;
  mock?: boolean;
}): Promise<PoLiSnapshot> {
  const q = new URLSearchParams();

  if (params?.token) q.set("token", params.token);
  if (params?.venue) q.set("venue", params.venue);
  if (params?.scope) q.set("scope", params.scope);
  if (params?.mock) q.set("mock", "1");

  const res = await fetch(`/api/poli?${q.toString()}`);

  if (!res.ok) {
    throw new Error(`PoLi fetch failed (${res.status})`);
  }

  return res.json();
}