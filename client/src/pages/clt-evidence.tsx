// client/src/pages/clt-evidence.tsx
import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PlatformFooter } from "@/components/platform-footer";

// Same-origin (Express serves the SPA + /api).
const API_BASE = "";

type FetchParams = {
  token: string;
  venuesCsv: string;
  maxAgeMsDepth: number;
  maxAgeMsCrossVenue: number;
  maxAgeMsIntegrity: number;
  debug: boolean;
};

async function fetchPoLiEvidence(p: FetchParams) {
  const qs = new URLSearchParams();
  qs.set("token", p.token.toUpperCase());
  qs.set("venues", p.venuesCsv);
  if (p.debug) qs.set("debug", "1");
  qs.set("maxAgeMsDepth", String(p.maxAgeMsDepth));
  qs.set("maxAgeMsCrossVenue", String(p.maxAgeMsCrossVenue));
  qs.set("maxAgeMsIntegrity", String(p.maxAgeMsIntegrity));

  const url = `${API_BASE}/api/poli/evidence?${qs.toString()}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`,
    );
  }
  return res.json();
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function Badge({
  tone = "slate",
  children,
}: {
  tone?: "green" | "amber" | "red" | "blue" | "slate" | "purple";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    green: "bg-green-600/15 text-green-200 ring-green-500/30",
    amber: "bg-amber-600/15 text-amber-200 ring-amber-500/30",
    red: "bg-red-600/15 text-red-200 ring-red-500/30",
    blue: "bg-blue-600/15 text-blue-200 ring-blue-500/30",
    purple: "bg-purple-600/15 text-purple-200 ring-purple-500/30",
    slate: "bg-slate-600/15 text-slate-200 ring-slate-500/30",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        map[tone],
      )}
    >
      {children}
    </span>
  );
}

function fmtMs(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return "—";
  if (!Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rs = Math.round(s - m * 60);
  return `${m}m ${rs}s`;
}

function toneForOk(ok: boolean | undefined) {
  return ok ? "green" : "red";
}

function toneForVerdict(v?: string) {
  const vv = (v || "").toUpperCase();

  // verdict-like
  if (vv === "PASS" || vv === "OK") return "green";
  if (vv === "WARN" || vv === "WARNING") return "amber";
  if (vv === "FAIL" || vv === "FAILED") return "red";
  if (vv === "STALE") return "amber";
  if (vv === "INSUFFICIENT") return "amber";

  // severity-like
  if (vv === "HIGH" || vv === "CRITICAL") return "red";
  if (vv === "MEDIUM") return "amber";
  if (vv === "LOW") return "slate";

  return "slate";
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/40 ring-1 ring-white/10">
      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div className="text-sm font-semibold text-slate-100">{title}</div>
        {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function KV({
  k,
  v,
  mono = true,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs text-slate-400">{k}</div>
      <div className={cx("text-xs text-slate-200", mono && "font-mono")}>{v}</div>
    </div>
  );
}

function JsonBox({ data }: { data: any }) {
  return (
    <pre className="overflow-auto rounded-xl bg-black/40 p-4 text-xs text-slate-200 ring-1 ring-white/10">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

/**
 * v0 compatibility helpers:
 * - depth bands can come back as "pct_0.25" (dot key) or "pct_0_25" (underscore key)
 * - same for "pct_0.5" / "pct_0_5"
 */
function getDepthBand(depth: any, band: "pct_0.25" | "pct_0.5") {
  if (!depth || typeof depth !== "object") return undefined;
  const underscoreKey = band.replace(".", "_"); // pct_0_25 / pct_0_5
  return depth[band] ?? depth[underscoreKey];
}

function fmtMaybeNumber(x: any) {
  if (x === null || x === undefined) return "—";
  if (typeof x === "number" && Number.isFinite(x)) return String(x);
  // allow numeric strings
  const n = Number(x);
  if (Number.isFinite(n)) return String(n);
  return String(x);
}

export default function CLTEvidence() {
  // Controls
  const [token, setToken] = useState("BTC");
  const [venuesCsv, setVenuesCsv] = useState("coinbase,binance");
  const [debug, setDebug] = useState(true);

  const [maxAgeMsDepth, setMaxAgeMsDepth] = useState(60_000);
  const [maxAgeMsCrossVenue, setMaxAgeMsCrossVenue] = useState(60_000);
  const [maxAgeMsIntegrity, setMaxAgeMsIntegrity] = useState(60_000);

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showRaw, setShowRaw] = useState(false);

  const params: FetchParams = useMemo(
    () => ({
      token: token.trim().toUpperCase() || "BTC",
      venuesCsv: (venuesCsv || "")
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean)
        .join(","),
      maxAgeMsDepth,
      maxAgeMsCrossVenue,
      maxAgeMsIntegrity,
      debug,
    }),
    [token, venuesCsv, maxAgeMsDepth, maxAgeMsCrossVenue, maxAgeMsIntegrity, debug],
  );

  const q = useQuery({
    queryKey: ["poli-evidence", params],
    queryFn: () => fetchPoLiEvidence(params),
    refetchInterval: autoRefresh ? 5000 : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const data = q.data;

  // Derived bits (guarded)
  const perVenues: any[] = Array.isArray(data?.venues) ? data.venues : [];
  const aggregate = data?.aggregate || {};
  const crossVenue = aggregate?.crossVenue || data?.crossVenue;

  // v0 L4 normalization (supports L4.aggregate + L4.perVenue[])
  const rawL4 = data?.L4 || aggregate?.L4 || data?.integrity || aggregate?.integrity;
  const l4Agg =
    rawL4 && typeof rawL4 === "object" && "aggregate" in rawL4 ? rawL4.aggregate : rawL4;
  const l4PerVenue: any[] =
    rawL4 && typeof rawL4 === "object" && Array.isArray((rawL4 as any).perVenue)
      ? (rawL4 as any).perVenue
      : rawL4 && typeof rawL4 === "object" && Array.isArray((rawL4 as any).venues)
        ? (rawL4 as any).venues
        : rawL4 && typeof rawL4 === "object" && (rawL4 as any).venue
          ? [rawL4]
          : [];

  const ladderLevel = aggregate?.ladderLevel || data?.ladderLevel || "—";
  const aggregateOk = aggregate?.ok ?? data?.ok;

  const copyJson = async () => {
    try {
      const text = JSON.stringify(data ?? {}, null, 2);
      await navigator.clipboard.writeText(text);
      alert("Copied JSON to clipboard.");
    } catch {
      alert("Copy failed (clipboard permission?).");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400">
              Stratalink • Consolidated Liquidity Tape
            </div>
            <h1 className="mt-1 text-2xl font-semibold">CLT Evidence Console</h1>
            <p className="mt-1 text-sm text-slate-300">
              Ladder-first view of PoLi evidence: L2 Depth → L3 Cross-Venue → L4 Market Integrity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={toneForOk(Boolean(aggregateOk)) as any}>
              Aggregate: {aggregateOk === undefined ? "—" : aggregateOk ? "OK" : "FAIL"}
            </Badge>
            <Badge tone="purple">Ladder: {String(ladderLevel)}</Badge>
            <button
              onClick={() => q.refetch()}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/15"
            >
              Refresh
            </button>
            <button
              onClick={copyJson}
              disabled={!data}
              className="rounded-xl bg-white/10 px-3 py-2 text-sm font-medium ring-1 ring-white/10 hover:bg-white/15 disabled:opacity-50"
            >
              Copy JSON
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 rounded-2xl bg-slate-900/40 p-5 ring-1 ring-white/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">Token</label>
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/20"
                placeholder="BTC"
              />
            </div>

            <div className="md:col-span-4">
              <label className="mb-1 block text-xs text-slate-400">Venues (CSV)</label>
              <input
                value={venuesCsv}
                onChange={(e) => setVenuesCsv(e.target.value)}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/20"
                placeholder="coinbase,binance"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">MaxAge Depth (ms)</label>
              <input
                type="number"
                value={maxAgeMsDepth}
                onChange={(e) => setMaxAgeMsDepth(Number(e.target.value))}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">MaxAge Cross-Venue (ms)</label>
              <input
                type="number"
                value={maxAgeMsCrossVenue}
                onChange={(e) => setMaxAgeMsCrossVenue(Number(e.target.value))}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-slate-400">MaxAge Integrity (ms)</label>
              <input
                type="number"
                value={maxAgeMsIntegrity}
                onChange={(e) => setMaxAgeMsIntegrity(Number(e.target.value))}
                className="w-full rounded-xl bg-black/30 px-3 py-2 text-sm text-slate-100 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-white/20"
              />
            </div>

            <div className="md:col-span-12 mt-1 flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh (5s)
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={debug} onChange={(e) => setDebug(e.target.checked)} />
                debug=1
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={showRaw}
                  onChange={(e) => setShowRaw(e.target.checked)}
                />
                Show raw JSON
              </label>

              <div className="text-xs text-slate-400">
                Endpoint: <span className="font-mono">/api/poli/evidence</span>
              </div>
            </div>
          </div>

          {/* Status line */}
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-300">
            {q.isFetching ? <Badge tone="blue">Fetching…</Badge> : <Badge tone="slate">Idle</Badge>}
            {q.error ? (
              <Badge tone="red">Error</Badge>
            ) : data ? (
              <Badge tone="green">Loaded</Badge>
            ) : (
              <Badge tone="slate">No data</Badge>
            )}
            <span className="text-slate-400">
              Tip: if you see STALE/INSUFFICIENT, warm buffers via{" "}
              <span className="font-mono">/api/lis/&lt;venue&gt;/depth</span>.
            </span>
          </div>

          {q.error ? (
            <div className="mt-3 rounded-xl bg-red-600/10 p-3 text-sm text-red-200 ring-1 ring-red-500/20">
              {(q.error as any)?.message || "Failed to load evidence."}
            </div>
          ) : null}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Ladder */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* L2 Per venue */}
            <Section
              title="L2 — Per-Venue Depth Evidence"
              right={
                <>
                  <Badge tone="purple">venues: {perVenues.length}</Badge>
                  <Badge tone="slate">symbol: {String(data?.symbol ?? params.token)}</Badge>
                </>
              }
            >
              {perVenues.length === 0 ? (
                <div className="text-sm text-slate-300">No per-venue evidence in response.</div>
              ) : (
                <div className="space-y-4">
                  {perVenues.map((v, idx) => {
                    const ok = Boolean(v?.ok);
                    const lvl = v?.ladderLevel ?? "—";
                    const tags: string[] = Array.isArray(v?.verifyTags) ? v.verifyTags : [];
                    const reasons: string[] = Array.isArray(v?.reasons) ? v.reasons : [];
                    const f = v?.freshnessMs || {};
                    const depth = v?.depth || {};
                    const b025 = getDepthBand(depth, "pct_0.25");
                    const b05 = getDepthBand(depth, "pct_0.5");
                    const bandHealth = depth?.bandHealth ?? v?.bandHealth;

                    return (
                      <div
                        key={`${v?.venue || idx}`}
                        className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-semibold">{String(v?.venue ?? "—")}</div>
                            <Badge tone={toneForOk(ok) as any}>{ok ? "OK" : "FAIL"}</Badge>
                            <Badge tone="purple">{String(lvl)}</Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {tags.slice(0, 4).map((t) => (
                              <Badge key={t} tone="slate">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <KV k="fresh TSLE" v={fmtMs(f.TSLE)} />
                          <KV k="fresh DEPTH" v={fmtMs(f.DEPTH)} />
                          <KV k="fresh POLI" v={fmtMs(f.POLI)} />
                          <KV k="depth.sufficient" v={String(Boolean(depth?.sufficient))} />
                          <KV k='depth["pct_0.25"]' v={fmtMaybeNumber(b025)} />
                          <KV k='depth["pct_0.5"]' v={fmtMaybeNumber(b05)} />
                          {bandHealth !== undefined ? <KV k="bandHealth" v={String(bandHealth)} /> : null}
                        </div>

                        {reasons.length ? (
                          <div className="mt-3 rounded-xl bg-amber-600/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                            <div className="font-semibold">Reasons</div>
                            <ul className="mt-1 list-disc space-y-1 pl-4">
                              {reasons.slice(0, 6).map((r: string, i2: number) => (
                                <li key={`${i2}-${r}`}>{r}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* L3 Cross-venue */}
            <Section
              title="L3 — Cross-Venue Divergence Evidence"
              right={
                <>
                  <Badge tone={toneForOk(Boolean(crossVenue?.ok)) as any}>
                    compute:{" "}
                    {crossVenue?.ok === undefined ? "—" : crossVenue.ok ? "OK" : "FAIL"}
                  </Badge>
                  <Badge tone={toneForOk(Boolean(crossVenue?.gatingOk)) as any}>
                    gatingOk:{" "}
                    {crossVenue?.gatingOk === undefined
                      ? "—"
                      : crossVenue.gatingOk
                        ? "true"
                        : "false"}
                  </Badge>
                  <Badge tone={toneForVerdict(crossVenue?.verdict) as any}>
                    verdict: {String(crossVenue?.verdict ?? "—")}
                  </Badge>
                </>
              }
            >
              {!crossVenue ? (
                <div className="text-sm text-slate-300">No cross-venue block present.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <KV k="referenceVenue" v={String(crossVenue?.referenceVenue ?? "—")} />
                    <KV k="stressVenue" v={String(crossVenue?.stressVenue ?? "—")} />
                    <KV k="severity" v={String(crossVenue?.severity ?? "—")} />
                    <KV k="ladderLevel" v={String(crossVenue?.ladderLevel ?? "—")} />
                    <KV k="freshness(reference)" v={fmtMs(crossVenue?.freshnessMs?.reference)} />
                    <KV k="freshness(stress)" v={fmtMs(crossVenue?.freshnessMs?.stress)} />
                  </div>

                  {Array.isArray(crossVenue?.reasons) && crossVenue.reasons.length ? (
                    <div className="mt-3 rounded-xl bg-amber-600/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                      <div className="font-semibold">Reasons</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {crossVenue.reasons.slice(0, 8).map((r: string, i: number) => (
                          <li key={`${i}-${r}`}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* Divergence signals */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold text-slate-300">Signals</div>
                    {Array.isArray(crossVenue?.block?.report?.signals) &&
                    crossVenue.block.report.signals.length ? (
                      <div className="space-y-2">
                        {crossVenue.block.report.signals.slice(0, 12).map((s: any, i: number) => (
                          <div key={i} className="rounded-xl bg-black/25 p-3 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge tone="slate">{String(s?.type ?? "—")}</Badge>
                              <Badge tone={toneForVerdict(s?.severity) as any}>
                                {String(s?.severity ?? "—")}
                              </Badge>
                              {s?.message ? (
                                <div className="text-xs text-slate-200">{String(s.message)}</div>
                              ) : null}
                            </div>
                            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <KV k="referenceValue" v={String(s?.referenceValue ?? "—")} />
                              <KV k="stressValue" v={String(s?.stressValue ?? "—")} />
                              <KV k="delta" v={String(s?.delta ?? "—")} />
                              <KV k="threshold" v={String(s?.threshold ?? "—")} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-300">No L3 signals found.</div>
                    )}
                  </div>
                </>
              )}
            </Section>

            {/* L4 Market Integrity */}
            <Section
              title="L4 — Market Integrity Evidence (Phase 1)"
              right={
                <>
                  <Badge tone={toneForOk(Boolean(l4Agg?.ok)) as any}>
                    compute: {l4Agg?.ok === undefined ? "—" : l4Agg.ok ? "OK" : "FAIL"}
                  </Badge>
                  <Badge tone={toneForOk(Boolean(l4Agg?.gatingOk)) as any}>
                    gatingOk:{" "}
                    {l4Agg?.gatingOk === undefined ? "—" : l4Agg.gatingOk ? "true" : "false"}
                  </Badge>
                  <Badge tone={toneForVerdict(l4Agg?.verdict) as any}>
                    verdict: {String(l4Agg?.verdict ?? "—")}
                  </Badge>
                  <Badge tone={toneForVerdict(l4Agg?.severity) as any}>
                    severity: {String(l4Agg?.severity ?? "—")}
                  </Badge>
                </>
              }
            >
              {!rawL4 ? (
                <div className="text-sm text-slate-300">No L4 integrity block present.</div>
              ) : (
                <>
                  {/* L4 aggregate overview */}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <KV k="minOkVenues" v={String(l4Agg?.minOkVenues ?? "—")} />
                    <KV k="okVenues" v={String(l4Agg?.okVenues ?? "—")} />
                    <KV k="gatingOkVenues" v={String(l4Agg?.gatingOkVenues ?? "—")} />
                    <KV k="timestamp" v={String(l4Agg?.timestamp ?? "—")} />
                  </div>

                  {Array.isArray(l4Agg?.reasons) && l4Agg.reasons.length ? (
                    <div className="mt-3 rounded-xl bg-amber-600/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                      <div className="font-semibold">Reasons</div>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {l4Agg.reasons.slice(0, 8).map((r: string, i: number) => (
                          <li key={`${i}-${r}`}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {/* L4 per-venue cards */}
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold text-slate-300">Per-venue integrity</div>

                    {l4PerVenue.length ? (
                      <div className="space-y-3">
                        {l4PerVenue.slice(0, 8).map((pv: any, i: number) => (
                          <div key={i} className="rounded-2xl bg-black/25 p-4 ring-1 ring-white/10">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold">{String(pv?.venue ?? "—")}</div>
                                <Badge tone={toneForOk(Boolean(pv?.ok)) as any}>
                                  {pv?.ok === undefined ? "—" : pv.ok ? "OK" : "FAIL"}
                                </Badge>
                                <Badge tone={toneForOk(Boolean(pv?.gatingOk)) as any}>
                                  gatingOk:{" "}
                                  {pv?.gatingOk === undefined ? "—" : pv.gatingOk ? "true" : "false"}
                                </Badge>
                                <Badge tone={toneForVerdict(pv?.verdict) as any}>
                                  {String(pv?.verdict ?? "—")}
                                </Badge>
                                <Badge tone={toneForVerdict(pv?.severity) as any}>
                                  {String(pv?.severity ?? "—")}
                                </Badge>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {Array.isArray(pv?.verifyTags)
                                  ? pv.verifyTags.slice(0, 4).map((t: string) => (
                                      <Badge key={t} tone="slate">
                                        {t}
                                      </Badge>
                                    ))
                                  : null}
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                              <KV k="freshness(latestPoint)" v={fmtMs(pv?.freshnessMs?.latestPoint)} />
                              <KV k="maxAgeMs" v={String(pv?.freshnessMs?.maxAgeMs ?? "—")} />
                            </div>

                            {Array.isArray(pv?.reasons) && pv.reasons.length ? (
                              <div className="mt-3 rounded-xl bg-amber-600/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                                <div className="font-semibold">Reasons</div>
                                <ul className="mt-1 list-disc space-y-1 pl-4">
                                  {pv.reasons.slice(0, 6).map((r: string, j: number) => (
                                    <li key={`${j}-${r}`}>{r}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null}

                            <div className="mt-4">
                              <div className="mb-2 text-xs font-semibold text-slate-300">Signals</div>
                              {Array.isArray(pv?.signals) && pv.signals.length ? (
                                <div className="space-y-2">
                                  {pv.signals.slice(0, 12).map((s: any, j: number) => (
                                    <div
                                      key={j}
                                      className="rounded-xl bg-black/25 p-3 ring-1 ring-white/10"
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge tone="slate">{String(s?.type ?? "—")}</Badge>
                                        <Badge tone={toneForVerdict(s?.verdict) as any}>
                                          {String(s?.verdict ?? "—")}
                                        </Badge>
                                        <Badge tone={toneForVerdict(s?.severity) as any}>
                                          {String(s?.severity ?? "—")}
                                        </Badge>
                                        <Badge tone="blue">
                                          conf:{" "}
                                          {Number.isFinite(s?.confidence)
                                            ? Number(s.confidence).toFixed(2)
                                            : "—"}
                                        </Badge>
                                      </div>
                                      {s?.message ? (
                                        <div className="mt-2 text-xs text-slate-200">
                                          {String(s.message)}
                                        </div>
                                      ) : null}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-300">No L4 signals.</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-300">
                        No per-venue L4 block found (this is expected when Phase 1 telemetry is insufficient).
                      </div>
                    )}
                  </div>
                </>
              )}
            </Section>
          </div>

          {/* Right: Aggregate + Raw */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Section
              title="Aggregate Summary"
              right={
                <Badge tone={toneForOk(Boolean(aggregateOk)) as any}>
                  {aggregateOk ? "OK" : "FAIL"}
                </Badge>
              }
            >
              <div className="space-y-2">
                <KV k="ladderLevel" v={String(ladderLevel)} />
                <KV k="minOkVenues" v={String(aggregate?.minOkVenues ?? "—")} />
                <KV k="okVenues" v={String(aggregate?.okVenues ?? "—")} />
                <KV k="gatingOkVenues" v={String(aggregate?.gatingOkVenues ?? "—")} />
                <KV k="verdict" v={String(aggregate?.verdict ?? "—")} />
                <KV k="timestamp" v={String(aggregate?.timestamp ?? data?.timestamp ?? "—")} />
              </div>

              {Array.isArray(aggregate?.reasons) && aggregate.reasons.length ? (
                <div className="mt-3 rounded-xl bg-amber-600/10 p-3 text-xs text-amber-200 ring-1 ring-amber-500/20">
                  <div className="font-semibold">Reasons</div>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    {aggregate.reasons.slice(0, 8).map((r: string, i: number) => (
                      <li key={`${i}-${r}`}>{r}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>

            <Section title="Raw Evidence JSON" right={<Badge tone="slate">debug={params.debug ? "1" : "0"}</Badge>}>
              {showRaw ? (
                data ? (
                  <JsonBox data={data} />
                ) : (
                  <div className="text-sm text-slate-300">No data loaded.</div>
                )
              ) : (
                <div className="text-sm text-slate-300">
                  Toggle “Show raw JSON” to inspect the full payload.
                </div>
              )}
            </Section>

            <Section title="Quick Links">
              <div className="space-y-3 text-sm text-slate-200">
                <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/10">
                  <div className="text-xs text-slate-400">Warm buffers (run in terminal)</div>
                  <pre className="mt-2 overflow-auto rounded-lg bg-black/40 p-2 text-xs text-slate-200 ring-1 ring-white/10">
{`BASE="http://localhost:${"${PORT:-5000}"}"
SYMBOL="${params.token}"
curl -sS "$BASE/api/lis/coinbase/depth?symbol=$SYMBOL" >/dev/null
curl -sS "$BASE/api/lis/binance/depth?symbol=$SYMBOL" >/dev/null`}
                  </pre>
                </div>

                <div className="rounded-xl bg-black/25 p-3 ring-1 ring-white/10">
                  <div className="text-xs text-slate-400">Open JSON in browser</div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-200">
                    {`/api/poli/evidence?token=${params.token}&venues=${params.venuesCsv}&maxAgeMsDepth=${params.maxAgeMsDepth}&maxAgeMsCrossVenue=${params.maxAgeMsCrossVenue}&maxAgeMsIntegrity=${params.maxAgeMsIntegrity}${params.debug ? "&debug=1" : ""}`}
                  </div>
                </div>
              </div>
            </Section>
          </div>
        </div>

        <PlatformFooter />
      </div>
    </div>
  );
}