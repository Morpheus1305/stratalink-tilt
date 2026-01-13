// client/src/pages/platform/tape.tsx
// LIVE ONLY — wired to existing Tape API:
//   GET /api/tape/latest?symbol=BTC-USD&since=<ms>&limit=100
//   GET /api/tape/health
//
// Canonical schema comes from shared/liquidityTape.ts
// Sticky per-venue state: persists the last known MARK/SPREAD/DEPTH/FUNDING/IMBALANCE per venue

import { useEffect, useMemo, useRef, useState, Fragment, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PollingOrbital from "@/components/polling-orbital";
import { DashboardHeader } from "@/components/dashboard-header";
import { PlatformTabs } from "@/components/platform-tabs";
import { TapeTokenSelector } from "@/components/tape-token-selector";
import { 
  TOKEN_LIST, 
  resolveSymbolsForToken, 
  isValidToken,
  type TokenId 
} from "@shared/venueSymbols";

import type {
  LiquidityTapeEvent,
  LiquidityTapeEventType,
  LiquidityVenue,
  LiquidityTapeLatestResponse,
  DepthPayload,
  SpreadPayload,
  FundingPayload,
  ImbalancePayload,
  MarkPricePayload,
} from "@shared/liquidityTape";

const ALL_VENUES: LiquidityVenue[] = [
  "binance", "coinbase", "kraken", "okx", "bybit", "dex", "unknown"
];

type TapeHealthVenue = {
  status: "ok" | "degraded" | "down" | "unknown";
  last_ts_ingest: number | null;
  msg_rate_5s: number | null;
  lag_ms: number | null;
  errors_5m: number | null;
};

type HealthResponse = {
  server_ts: number;
  venues: Record<string, TapeHealthVenue>;
};

type VenueSummary = {
  lastTs: number | null;
  markPrice: number | null;
  spreadBps: number | null;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  depthCount: number;
  lastDepthSide: "bid" | "ask" | null;
  lastDepthPrice: number | null;
  fundingRate: number | null;
  imbalancePct: number | null;
  imbalanceTotalUsd: number | null;
};

function emptyVenueSummary(): VenueSummary {
  return {
    lastTs: null,
    markPrice: null,
    spreadBps: null,
    bid: null,
    ask: null,
    mid: null,
    depthCount: 0,
    lastDepthSide: null,
    lastDepthPrice: null,
    fundingRate: null,
    imbalancePct: null,
    imbalanceTotalUsd: null,
  };
}

function mergeVenueSummaries(
  prev: Record<string, VenueSummary>,
  batch: LiquidityTapeEvent[],
  next: Record<string, VenueSummary>,
  venues: LiquidityVenue[]
): Record<string, VenueSummary> {
  const out: Record<string, VenueSummary> = {};
  for (const v of venues) {
    out[v] = { ...(prev[v] ?? emptyVenueSummary()) };
  }

  for (const ev of batch) {
    if (!out[ev.venue]) continue;
    const s = out[ev.venue];
    const p = ev.payload as any;

    if (s.lastTs === null || ev.ts > s.lastTs) {
      s.lastTs = ev.ts;
    }

    if (ev.type === "MARK_PRICE" && isMarkPricePayload(p)) {
      s.markPrice = p.price;
    }
    if (ev.type === "SPREAD_UPDATE" && isSpreadPayload(p)) {
      s.spreadBps = p.spreadBps;
      if (typeof p.bid === "number") s.bid = p.bid;
      if (typeof p.ask === "number") s.ask = p.ask;
      if (typeof p.mid === "number") s.mid = p.mid;
    }
    if (ev.type === "DEPTH_UPDATE" && isDepthPayload(p)) {
      s.depthCount++;
      s.lastDepthSide = p.side;
      s.lastDepthPrice = p.price;
    }
    if (ev.type === "FUNDING_RATE" && isFundingPayload(p)) {
      s.fundingRate = p.fundingRate;
    }
    if (ev.type === "IMBALANCE" && isImbalancePayload(p)) {
      s.imbalancePct = p.imbalancePct;
      if (typeof p.totalUsd === "number") s.imbalanceTotalUsd = p.totalUsd;
    }
  }

  return out;
}

function computeVenueSummaries(events: LiquidityTapeEvent[], venues: LiquidityVenue[]): Record<string, VenueSummary> {
  return mergeVenueSummaries({}, events, {}, venues);
}

// Tape Status helpers (RAG: GREEN|AMBER|RED)
type TapeFlag = "GREEN" | "AMBER" | "RED";

function tapeFlag(lastTs: number | null, now: number): TapeFlag {
  if (lastTs === null) return "RED";
  const ageSec = (now - lastTs) / 1000;
  if (ageSec < 5) return "GREEN";
  if (ageSec < 30) return "AMBER";
  return "RED";
}

function mapFlagToDisplay(flag: TapeFlag): { label: string; color: string } {
  if (flag === "GREEN") return { label: "FRESH", color: "text-green-400" };
  if (flag === "AMBER") return { label: "AMBER", color: "text-yellow-400" };
  return { label: "STALE", color: "text-red-500" };
}

function fmtTimeMs(ts: number | null | undefined) {
  if (!ts || Number.isNaN(ts)) return "—";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function fmtNum(n: number | null | undefined, dp = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(dp);
}

function fmtUsd(n: number | null | undefined, dp = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const x = Math.abs(n);
  if (x >= 1_000_000_000) return `${sign}$${(x / 1_000_000_000).toFixed(2)}B`;
  if (x >= 1_000_000) return `${sign}$${(x / 1_000_000).toFixed(2)}M`;
  if (x >= 1_000) return `${sign}$${(x / 1_000).toFixed(1)}K`;
  return `${sign}$${x.toFixed(dp)}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function isDepthPayload(p: any): p is DepthPayload {
  return p && (p.side === "bid" || p.side === "ask") && typeof p.price === "number" && typeof p.size === "number";
}
function isSpreadPayload(p: any): p is SpreadPayload {
  return p && typeof p.spreadBps === "number";
}
function isFundingPayload(p: any): p is FundingPayload {
  return p && typeof p.fundingRate === "number";
}
function isImbalancePayload(p: any): p is ImbalancePayload {
  return p && typeof p.imbalancePct === "number";
}
function isMarkPricePayload(p: any): p is MarkPricePayload {
  return p && typeof p.price === "number";
}

function summarize(ev: LiquidityTapeEvent): string {
  const p = ev.payload as any;

  switch (ev.type) {
    case "DEPTH_UPDATE": {
      if (!isDepthPayload(p)) return "depth update";
      const bits: string[] = [];
      bits.push(`${p.side.toUpperCase()} ${fmtNum(p.price, 2)} × ${fmtNum(p.size, 4)}`);
      if (typeof p.notionalUsd === "number") bits.push(`notional=${fmtUsd(p.notionalUsd)}`);
      if (typeof p.bps === "number") bits.push(`bps=${fmtNum(p.bps, 1)}`);
      if (typeof p.depthUsd === "number") bits.push(`depth=${fmtUsd(p.depthUsd)}`);
      if (typeof p.spreadBps === "number") bits.push(`spr=${fmtNum(p.spreadBps, 2)}bps`);
      return bits.join(" | ");
    }

    case "SPREAD_UPDATE": {
      if (!isSpreadPayload(p)) return "spread update";
      const bits: string[] = [];
      if (typeof p.bid === "number") bits.push(`bid=${fmtNum(p.bid, 2)}`);
      if (typeof p.ask === "number") bits.push(`ask=${fmtNum(p.ask, 2)}`);
      if (typeof p.mid === "number") bits.push(`mid=${fmtNum(p.mid, 2)}`);
      bits.push(`spr=${fmtNum(p.spreadBps, 2)}bps`);
      return bits.join(" | ");
    }

    case "FUNDING_RATE": {
      if (!isFundingPayload(p)) return "funding rate";
      const bits: string[] = [];
      bits.push(`funding=${fmtNum(p.fundingRate, 6)}`);
      if (typeof p.apr === "number") bits.push(`apr=${fmtNum(p.apr, 2)}%`);
      return bits.join(" | ");
    }

    case "IMBALANCE": {
      if (!isImbalancePayload(p)) return "imbalance";
      const bits: string[] = [];
      bits.push(`imb=${fmtNum(p.imbalancePct, 2)}%`);
      if (typeof p.totalUsd === "number") bits.push(`total=${fmtUsd(p.totalUsd)}`);
      return bits.join(" | ");
    }

    case "MARK_PRICE": {
      if (!isMarkPricePayload(p)) return "mark price";
      return `px=${fmtNum(p.price, 2)}`;
    }

    default:
      return "";
  }
}

function SummaryStrip({ venueState, selectedVenues, clockNow }: { venueState: Record<string, VenueSummary>; selectedVenues: LiquidityVenue[]; clockNow: number }) {
  const displayVenues = selectedVenues.filter((v) => venueState[v]);
  if (displayVenues.length === 0) {
    return (
      <div className="rounded border border-neutral-900 p-3">
        <div className="text-xs opacity-70">Summary (canonical state) — no data yet</div>
      </div>
    );
  }

  return (
    <div className="rounded border border-neutral-900 p-3 space-y-2">
      <div className="text-xs opacity-70">Summary (canonical state, filtered visually)</div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {displayVenues.map((v) => {
          const s = venueState[v];
          if (!s) return null;
          const ageSec = s.lastTs ? Math.max(0, Math.round((clockNow - s.lastTs) / 100) / 10) : null;
          const flag = tapeFlag(s.lastTs, clockNow);
          const { label: flagLabel, color: flagColor } = mapFlagToDisplay(flag);
          return (
            <div key={v} className="text-sm space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium opacity-90">{v}</span>
                <span className={`text-xs ${flagColor}`}>{flagLabel}</span>
                {ageSec !== null && <span className="text-xs opacity-60 font-mono">{ageSec}s ago</span>}
              </div>
              <div className="flex flex-wrap gap-3 text-xs opacity-80">
                <span>Mark: <span className="font-mono">{s.markPrice !== null ? fmtNum(s.markPrice, 2) : "—"}</span></span>
                <span>Spread: <span className="font-mono">{s.spreadBps !== null ? `${fmtNum(s.spreadBps, 2)}bps` : "—"}</span></span>
                <span>Depth: <span className="font-mono">{s.depthCount}</span></span>
                <span>Funding: <span className="font-mono">{s.fundingRate !== null ? fmtNum(s.fundingRate, 6) : "—"}</span></span>
                <span>Imb: <span className="font-mono">{s.imbalancePct !== null ? `${fmtNum(s.imbalancePct, 2)}%` : "—"}</span></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`HTTP ${r.status} ${r.statusText}${text ? ` — ${text}` : ""}`.trim());
  }
  return (await r.json()) as T;
}

const STORAGE_KEY = "tape_selected_token";

function getInitialToken(): TokenId {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token")?.toUpperCase();
    if (urlToken && isValidToken(urlToken)) {
      return urlToken as TokenId;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidToken(stored)) {
      return stored as TokenId;
    }
  }
  return "BTC";
}

export default function TapePage() {
  const [, setLocation] = useLocation();
  
  const [selectedToken, setSelectedToken] = useState<TokenId>(getInitialToken);
  const [paused, setPaused] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const [windowSec, setWindowSec] = useState(60);
  const [limit, setLimit] = useState(100);
  const [search, setSearch] = useState("");
  
  const handleTokenChange = useCallback((token: TokenId) => {
    setSelectedToken(token);
    localStorage.setItem(STORAGE_KEY, token);
    const params = new URLSearchParams(window.location.search);
    params.set("token", token);
    setLocation(`/platform/tape?${params.toString()}`, { replace: true });
  }, [setLocation]);

  const [pollTick, setPollTick] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Clock ticker: ms/age updates continue even if paused
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setClockNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [venueOn, setVenueOn] = useState<Record<LiquidityVenue, boolean>>({
    binance: true,
    coinbase: true,
    kraken: true,
    okx: false,
    bybit: false,
    dex: false,
    unknown: false,
  });

  const [typeOn, setTypeOn] = useState<Record<LiquidityTapeEventType, boolean>>({
    DEPTH_UPDATE: true,
    SPREAD_UPDATE: true,
    FUNDING_RATE: false,
    IMBALANCE: false,
    MARK_PRICE: true,
  });

  const selectedVenues = useMemo(
    () => (Object.keys(venueOn) as LiquidityVenue[]).filter((v) => venueOn[v]),
    [venueOn]
  );
  const selectedTypes = useMemo(
    () => (Object.keys(typeOn) as LiquidityTapeEventType[]).filter((t) => typeOn[t]),
    [typeOn]
  );

  // Sticky per-venue "current state" cache (derived only from live events)
  const [venueState, setVenueState] = useState<Record<string, VenueSummary>>(() =>
    computeVenueSummaries([], ALL_VENUES)
  );

  const resolvedVenueSymbols = useMemo(() => {
    return resolveSymbolsForToken(selectedToken, selectedVenues);
  }, [selectedToken, selectedVenues]);

  const latestUrl = useMemo(() => {
    const symbolList = resolvedVenueSymbols.map(vs => vs.symbol);
    const usp = new URLSearchParams();
    if (symbolList.length > 0) {
      usp.set("symbols", symbolList.join(","));
    }
    usp.set("limit", String(Math.min(Math.max(limit, 10), 100)));
    const until = Date.now();
    const since = until - windowSec * 1000;
    usp.set("since", String(since));
    return `/api/tape/latest?${usp.toString()}`;
  }, [resolvedVenueSymbols, limit, windowSec]);

  const latestQuery = useQuery({
    queryKey: ["tape-latest", latestUrl],
    queryFn: () => fetchJson<LiquidityTapeLatestResponse>(latestUrl as string),
    enabled: !!latestUrl && !paused,
    refetchInterval: paused ? false : 750,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 2,
  });

  const healthQuery = useQuery({
    queryKey: ["tape-health"],
    queryFn: () => fetchJson<HealthResponse>("/api/tape/health"),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
    retry: 2,
  });

  const eventsRaw: LiquidityTapeEvent[] = latestQuery.data?.events ?? [];

  const events = useMemo(() => {
    const s = search.trim().toLowerCase();
    return eventsRaw
      .filter((e) => selectedVenues.includes(e.venue))
      .filter((e) => selectedTypes.includes(e.type))
      .filter((e) => {
        if (!s) return true;
        const hay = `${e.id} ${e.venue} ${e.symbol} ${e.type}`.toLowerCase();
        return hay.includes(s);
      })
      .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
  }, [eventsRaw, selectedVenues, selectedTypes, search]);

  // Update sticky venueState from ALL ingest (eventsRaw), not filtered events
  // This makes the top summary represent the true global tape state, independent of user filters
  useEffect(() => {
    if (!eventsRaw || eventsRaw.length === 0) return;
    setVenueState((prev) => mergeVenueSummaries(prev, eventsRaw, {}, ALL_VENUES));
  }, [eventsRaw]);

  // Update pollTick and lastUpdate on successful query fetch
  useEffect(() => {
    if (latestQuery.isSuccess && latestQuery.data) {
      setPollTick((t) => t + 1);
      setLastUpdate(new Date());
    }
  }, [latestQuery.dataUpdatedAt]);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const atTop = el.scrollTop <= 10;
      if (!atTop && autoScroll) setAutoScroll(false);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [autoScroll]);

  useEffect(() => {
    if (!autoScroll) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [events.length, autoScroll]);

  function jumpToLatest() {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setAutoScroll(true);
  }

  function statusBoxClass(status: string) {
    const s = status.toLowerCase();
    if (s === "down") return "border border-neutral-800 opacity-70";
    if (s === "degraded") return "border border-neutral-700";
    if (s === "ok") return "border border-neutral-700";
    return "border border-neutral-800 opacity-70";
  }

  async function exportJson() {
    const blob = new Blob(
      [JSON.stringify({ token: selectedToken, resolvedVenueSymbols, filters: { venueOn, typeOn, search, windowSec, limit }, events, venueState }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tape_${selectedToken}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const hb = healthQuery.data?.venues ?? {};
  const showEmpty = !latestQuery.isLoading && events.length === 0;

  // Compute overall Tape Status from venueState
  const tapeStatus = useMemo(() => {
    const coreVenues = ["binance", "coinbase", "kraken"];
    let worstFlag: TapeFlag = "GREEN";
    for (const v of coreVenues) {
      const s = venueState[v];
      const flag = tapeFlag(s?.lastTs ?? null, clockNow);
      if (flag === "RED") worstFlag = "RED";
      else if (flag === "AMBER" && worstFlag !== "RED") worstFlag = "AMBER";
    }
    return worstFlag;
  }, [venueState, clockNow]);

  const tapeStatusDisplay = mapFlagToDisplay(tapeStatus);

  return (
    <div className="min-h-screen bg-background flex flex-col" data-testid="tape-page">
      {/* Global Header - Same as other terminal pages */}
      <DashboardHeader />
      <PlatformTabs />

      {/* Tape Page Content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Status Controls - Reduced visual weight (status indicators, not primary CTAs) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span 
            className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 text-green-400/80 font-medium"
            data-testid="badge-live"
          >
            LIVE
          </span>

          <span
            className={`text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 font-medium ${tapeStatusDisplay.color}`}
            style={{ opacity: 0.8 }}
            data-testid="badge-tape-status"
          >
            {tapeStatusDisplay.label}
          </span>

          <span className="text-neutral-600 mx-1">|</span>

          <button
            onClick={() => setPaused((p) => !p)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-pause"
          >
            {paused ? "Resume" : "Pause"}
          </button>

          <button
            onClick={() => setAdvanced((a) => !a)}
            className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-advanced"
          >
            Advanced
          </button>

          <button
            onClick={exportJson}
            className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-export"
          >
            Export JSON
          </button>

          <button
            onClick={() => setVenueState(computeVenueSummaries([], ALL_VENUES))}
            className="text-[10px] px-1.5 py-0.5 rounded border border-neutral-700/50 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-reset-cache"
          >
            Reset cache
          </button>

          {resolvedVenueSymbols.length > 0 && (
            <div className="text-[10px] text-muted-foreground flex items-center gap-1 ml-2" data-testid="resolved-symbols">
              <span className="opacity-60">→</span>
              {resolvedVenueSymbols.map((vs, i) => (
                <span key={vs.venue} className="font-mono">
                  {i > 0 && " "}
                  {vs.venue}:{vs.symbol}
                </span>
              ))}
            </div>
          )}

          {lastUpdate && (
            <div className="flex items-center gap-1.5 ml-auto text-[10px] text-muted-foreground" data-testid="polling-indicator">
              <PollingOrbital pollTick={pollTick} size={16} />
              <span className="font-mono">{lastUpdate.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Heartbeat */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(["binance", "coinbase", "kraken"] as LiquidityVenue[]).map((v) => {
            const h = hb[v];
            const last = h?.last_ts_ingest ?? null;
            const ageSec = last ? Math.max(0, Math.round(((clockNow - last) / 100)) / 10) : null;
            const status = h?.status ?? "unknown";
            return (
              <div key={v} className={`rounded p-3 ${statusBoxClass(status)}`} data-testid={`health-${v}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{v}</div>
                  <div className="text-xs opacity-80">{String(status).toUpperCase()}</div>
                </div>
                <div className="mt-1 text-sm opacity-90">Last msg: {ageSec != null ? `${ageSec}s ago` : "—"}</div>
                <div className="mt-1 text-xs opacity-80 flex gap-3 flex-wrap">
                  <span>Rate(5s): {h?.msg_rate_5s ?? "—"}</span>
                  <span>Lag: {h?.lag_ms ?? "—"}ms</span>
                  <span>Err(5m): {h?.errors_5m ?? "—"}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Strip (canonical state, filtered visually) */}
        <SummaryStrip venueState={venueState} selectedVenues={selectedVenues} clockNow={clockNow} />

        {/* Controls */}
        <div className="rounded border border-neutral-900 p-3 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <TapeTokenSelector 
              value={selectedToken} 
              onChange={handleTokenChange} 
            />

            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm opacity-80 w-16">Venues</div>
              {(["binance", "coinbase", "kraken"] as LiquidityVenue[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setVenueOn((p) => ({ ...p, [v]: !p[v] }))}
                  className={`text-sm px-2.5 py-1.5 rounded border ${
                    venueOn[v] ? "border-neutral-700" : "border-neutral-900 opacity-60"
                  }`}
                  data-testid={`button-venue-${v}`}
                >
                  {v}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-sm opacity-80 w-16">Types</div>
              {(Object.keys(typeOn) as LiquidityTapeEventType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeOn((p) => ({ ...p, [t]: !p[t] }))}
                  className={`text-sm px-2.5 py-1.5 rounded border ${
                    typeOn[t] ? "border-neutral-700" : "border-neutral-900 opacity-60"
                  }`}
                  data-testid={`button-type-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="text-sm opacity-80 w-16">Window</div>
              <select
                value={windowSec}
                onChange={(e) => setWindowSec(Number(e.target.value))}
                className="px-2 py-1.5 rounded border border-neutral-800 bg-transparent"
                data-testid="select-window"
              >
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={300}>5m</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-sm opacity-80 w-16">Limit</div>
              <select
                value={limit}
                onChange={(e) => setLimit(clamp(Number(e.target.value), 10, 100))}
                className="px-2 py-1.5 rounded border border-neutral-800 bg-transparent"
                data-testid="select-limit"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <div className="text-sm opacity-80 w-16">Search</div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-2 py-1.5 rounded border border-neutral-800 bg-transparent w-full"
                placeholder="id, venue, type…"
                data-testid="input-search"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScroll((a) => !a)}
                className="text-sm px-3 py-1.5 rounded border border-neutral-800 hover:opacity-90"
                data-testid="button-autoscroll"
              >
                Auto-scroll: {autoScroll ? "On" : "Off"}
              </button>
              <button
                onClick={jumpToLatest}
                className="text-sm px-3 py-1.5 rounded border border-neutral-800 hover:opacity-90"
                data-testid="button-jump"
              >
                Jump to latest
              </button>
            </div>
          </div>

          <div className="text-xs opacity-80 flex flex-wrap gap-3">
            <span>Latest: {latestQuery.isLoading ? "loading…" : latestQuery.isError ? "error" : "ok"}</span>
            <span>Health: {healthQuery.isLoading ? "loading…" : healthQuery.isError ? "error" : "ok"}</span>
            {latestQuery.isError && <span className="opacity-90">({(latestQuery.error as Error)?.message})</span>}
            {healthQuery.isError && <span className="opacity-90">({(healthQuery.error as Error)?.message})</span>}
          </div>
        </div>

        {/* Events table */}
        <div className="rounded border border-neutral-900 overflow-hidden">
          <div className="px-3 py-2 border-b border-neutral-900 flex items-center justify-between">
            <div className="text-sm opacity-80">
              Showing <span className="opacity-100">{events.length}</span> events (filtered)
            </div>
            <div className="text-xs opacity-70">Newest first</div>
          </div>

          {showEmpty ? (
            <div className="p-6 text-sm opacity-80" data-testid="text-empty">
              No events for current filters. Check /api/tape/health or widen window/types.
            </div>
          ) : (
            <div ref={listRef} className="max-h-[70vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-neutral-950">
                  <tr className="text-left border-b border-neutral-900">
                    <th className="p-2 w-8"></th>
                    <th className="p-2">Time</th>
                    {advanced && <th className="p-2">Age</th>}
                    <th className="p-2">Venue</th>
                    <th className="p-2">Symbol</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Summary</th>
                  </tr>
                </thead>

                <tbody>
                  {events.map((e) => {
                    const ageMs = clockNow - e.ts;
                    const age = ageMs >= 0 ? `${(ageMs / 1000).toFixed(1)}s` : "—";
                    const isOpen = !!expanded[e.id];

                    return (
                      <Fragment key={e.id}>
                        <tr className="border-b border-neutral-950 align-top" data-testid={`row-event-${e.id}`}>
                          <td className="p-2">
                            <button
                              onClick={() => setExpanded((p) => ({ ...p, [e.id]: !p[e.id] }))}
                              className="px-2 py-0.5 rounded border border-neutral-900 hover:opacity-90 text-xs"
                              aria-label="Toggle row"
                              data-testid={`button-expand-${e.id}`}
                            >
                              {isOpen ? "–" : "+"}
                            </button>
                          </td>

                          <td className="p-2 font-mono text-xs">{fmtTimeMs(e.ts)}</td>
                          {advanced && <td className="p-2 font-mono text-xs">{age}</td>}
                          <td className="p-2">{e.venue}</td>
                          <td className="p-2">{e.symbol}</td>
                          <td className="p-2">{e.type}</td>
                          <td className="p-2 font-mono text-xs whitespace-pre-wrap break-words">
                            {summarize(e)}
                          </td>
                        </tr>

                        {isOpen && (
                          <tr className="border-b border-neutral-950">
                            <td className="p-2" />
                            <td className="p-2" colSpan={advanced ? 6 : 5}>
                              <div className="rounded border border-neutral-900 p-3">
                                <div className="text-xs opacity-80 mb-2">
                                  id: <span className="opacity-100 font-mono">{e.id}</span>
                                </div>
                                <pre className="text-xs overflow-auto max-h-[260px] whitespace-pre-wrap break-words">
                                  {JSON.stringify(e, null, 2)}
                                </pre>
                                {advanced && (
                                  <div className="mt-3 text-xs opacity-80 flex flex-wrap gap-3">
                                    <a
                                      className="underline opacity-80 hover:opacity-100"
                                      href={`/lis?venue=${encodeURIComponent(String(e.venue))}&symbol=${encodeURIComponent(e.symbol)}`}
                                    >
                                      Open in LIS debug
                                    </a>
                                    <a
                                      className="underline opacity-80 hover:opacity-100"
                                      href={`/clt/evidence?event_id=${encodeURIComponent(String(e.id))}`}
                                    >
                                      Open evidence
                                    </a>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-3 py-2 border-t border-neutral-900 flex items-center justify-between">
            <div className="text-xs opacity-70">LIVE DATA ONLY • /api/tape/latest • /api/tape/health</div>
            <div className="text-xs opacity-70">Advanced shows Age (now - ts)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
