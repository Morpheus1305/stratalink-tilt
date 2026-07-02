// FILE: components/analytics/PerpetualFundingSnapshot.tsx

import { useEffect, useMemo, useState } from "react";

/**
 * Types that match the Cloudflare Worker funding proxy response.
 */
type FundingVenue = {
  venue: string;
  ok: boolean;
  rate: number | null;
  apr?: number | null;
  error?: string | null;
};

type FundingSnapshot = {
  symbol: string;
  source: "proxy" | "fallback" | string;
  venues: FundingVenue[];
  medianRate: number;
  avgRate: number;
  headlineRate: number;
  regime: string;
};

type FetchState =
  | { status: "idle" | "loading" }
  | { status: "success"; data: FundingSnapshot }
  | { status: "error"; error: string };

// --------- small helpers ---------

const formatBps = (rate: number | null | undefined): string => {
  if (rate == null || !Number.isFinite(rate)) return " - ";
  // rate is a per-period funding rate (e.g. 0.0001 = 1 bps)
  const bps = rate * 10_000;
  const signed = bps >= 0 ? "+" : "";
  return `${signed}${bps.toFixed(2)} bps`;
};

const formatApr = (apr: number | null | undefined): string => {
  if (apr == null || !Number.isFinite(apr)) return " - ";
  const signed = apr >= 0 ? "+" : "";
  return `${signed}${apr.toFixed(2)}%`;
};

const formatPercent = (rate: number | null | undefined): string => {
  if (rate == null || !Number.isFinite(rate)) return " - ";
  return `${(rate * 100).toFixed(4)}%`;
};

const regimeColour = (regime: string): string => {
  const r = regime.toLowerCase();
  if (r.includes("ultra") || r.includes("tight")) return "text-emerald-400";
  if (r.includes("neutral")) return "text-sky-300";
  if (r.includes("stressed") || r.includes("wide")) return "text-amber-400";
  if (r.includes("crisis") || r.includes("extreme")) return "text-red-400";
  return "text-slate-200";
};

const regimeBg = (regime: string): string => {
  const r = regime.toLowerCase();
  if (r.includes("ultra") || r.includes("tight")) return "bg-emerald-500/10 border-emerald-500/40";
  if (r.includes("neutral")) return "bg-sky-500/10 border-sky-500/40";
  if (r.includes("stressed") || r.includes("wide")) return "bg-amber-500/10 border-amber-500/40";
  if (r.includes("crisis") || r.includes("extreme")) return "bg-red-500/10 border-red-500/40";
  return "bg-slate-500/5 border-slate-500/30";
};

// --------- main component ---------

interface PerpetualFundingSnapshotProps {
  symbol?: string;
  label?: string;
}

/**
 * Perpetual Funding Snapshot (multi-venue, proxy-aware)
 *
 * NOTE: This component assumes your backend exposes:
 *   GET /api/funding/snapshot?symbol=BTC
 * which forwards to the Cloudflare Worker and returns the
 * FundingSnapshot shape defined above.
 *
 * If your page already has a global "token focus" state,
 * you can pass it via the `symbol` prop so everything stays in sync.
 */
const PerpetualFundingSnapshot = ({ symbol: propSymbol, label }: PerpetualFundingSnapshotProps) => {
  const [internalSymbol, setInternalSymbol] = useState<string>("BTC");
  const [state, setState] = useState<FetchState>({ status: "idle" });

  // Use prop symbol if provided, otherwise use internal state
  const symbol = propSymbol ?? internalSymbol;

  // Try to pick up symbol from query-string (?symbol=ETH) as a safe default.
  useEffect(() => {
    if (propSymbol) return; // Don't override if prop is provided
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("symbol");
      if (q) setInternalSymbol(q.toUpperCase());
    } catch {
      // ignore, keep BTC
    }
  }, [propSymbol]);

  useEffect(() => {
    let cancelled = false;

    const fetchSnapshot = async () => {
      setState({ status: "loading" });

      try {
        const res = await fetch(`/api/funding/snapshot?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const json = (await res.json()) as FundingSnapshot;
        if (!cancelled) {
          setState({ status: "success", data: json });
        }
      } catch (err: any) {
        if (!cancelled) {
          setState({
            status: "error",
            error: err?.message ?? "Failed to load funding snapshot",
          });
        }
      }
    };

    fetchSnapshot();

    // Optionally refresh every 60s so funding regime stays fresh.
    const id = setInterval(fetchSnapshot, 60_000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [symbol]);

  const snapshot = state.status === "success" ? state.data : undefined;

  const headline = useMemo(() => {
    if (!snapshot) return null;

    // Prefer headlineRate if present, otherwise fall back to median.
    const base = snapshot.headlineRate ?? snapshot.medianRate ?? snapshot.avgRate;
    const aprFromRate =
      snapshot.venues && snapshot.venues.length > 0 && Number.isFinite(base)
        ? base * 3 * 365 * 100 // 8h → 3 periods per day → APR %
        : null;

    return {
      rateLabel: formatPercent(base),
      bpsLabel: formatBps(base),
      aprLabel: formatApr(aprFromRate),
    };
  }, [snapshot]);

  const venues: FundingVenue[] = snapshot?.venues ?? [];
  const titleSymbol = label ?? symbol.toUpperCase();

  return (
    <section 
      className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 sm:px-5 sm:py-4 shadow-[0_0_0_1px_rgba(15,23,42,0.6)]"
      data-testid={`panel-funding-snapshot-${symbol}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
            Perpetual Funding  -  {titleSymbol}
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-lg font-semibold text-slate-50">
              {headline ? headline.rateLabel : state.status === "loading" ? "Loading…" : " - "}
            </span>
            {headline && (
              <>
                <span className="text-xs text-slate-400">{headline.bpsLabel}</span>
                <span className="text-xs text-slate-400">/ {headline.aprLabel} APR</span>
              </>
            )}
          </div>
          {snapshot && (
            <div className="mt-1 text-[11px] text-slate-500">
              Source:{" "}
              <span className="font-medium text-slate-300">
                {snapshot.source === "proxy" ? "Stratalink multi-venue proxy" : snapshot.source}
              </span>
              {snapshot.source !== "proxy" && " (fallback mode)"}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${regimeBg(
              snapshot?.regime ?? ""
            )} ${regimeColour(snapshot?.regime ?? "")}`}
          >
            {snapshot?.regime ?? " - "}
          </div>
          {state.status === "error" && (
            <div className="max-w-[180px] text-right text-[11px] text-red-400">
              {state.error}
            </div>
          )}
        </div>
      </div>

      {/* Multi-venue table */}
      <div className="mt-3 rounded-xl border border-slate-800/80 bg-slate-950/60">
        <div className="grid grid-cols-4 gap-2 border-b border-slate-800 px-3 py-1.5 text-[11px] font-medium text-slate-400">
          <span>Venue</span>
          <span className="text-right">Funding</span>
          <span className="text-right">APR</span>
          <span className="text-right">Status</span>
        </div>
        <div className="max-h-40 overflow-y-auto">
          {state.status === "loading" && (
            <div className="px-3 py-2 text-[11px] text-slate-400">Loading venues…</div>
          )}

          {state.status === "success" && venues.length === 0 && (
            <div className="px-3 py-2 text-[11px] text-slate-400">
              No venue data returned for {snapshot?.symbol}.
            </div>
          )}

          {venues.map((v) => {
            const statusColour = v.ok
              ? "text-emerald-400"
              : v.error
              ? "text-amber-400"
              : "text-slate-400";

            return (
              <div
                key={v.venue}
                className="grid grid-cols-4 gap-2 border-t border-slate-900/70 px-3 py-1.5 text-[11px] text-slate-200"
              >
                <span className="truncate">{v.venue}</span>
                <span className="text-right">{formatPercent(v.rate)}</span>
                <span className="text-right">
                  {v.apr != null && Number.isFinite(v.apr)
                    ? formatApr(v.apr)
                    : // If APR not provided by Worker, approximate from rate.
                      v.rate != null && Number.isFinite(v.rate)
                    ? formatApr(v.rate * 3 * 365 * 100)
                    : " - "}
                </span>
                <span className={`text-right ${statusColour}`}>
                  {v.ok ? "Live" : v.error ? v.error : "Unavailable"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Small explanatory footer */}
      <div className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Median rate and regime are computed across all available venues. Binance / Bybit will be
        included whenever accessible via the Cloudflare proxy; otherwise Coinbase / OKX / other
        venues continue to drive the composite view.
      </div>
    </section>
  );
};

export default PerpetualFundingSnapshot;
