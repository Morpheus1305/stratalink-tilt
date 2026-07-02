import { useEffect, useState, useRef } from "react";
import { useMicroFeed } from "@/contexts/MicrostructureFeed";
import { Layers, TrendingUp, TrendingDown, BarChart3, Scale } from "lucide-react";

type BandKey = "10bps" | "25bps" | "50bps" | "100bps" | "200bps";

type BandData = {
  bidUSD?: number;
  askUSD?: number;
};

type DepthBands = Record<BandKey, BandData>;

type LadderState = {
  loading: boolean;
  error: string | null;
  bands: DepthBands | null;
  spread?: number;
  source?: string;
};

const BANDS: BandKey[] = ["10bps", "25bps", "50bps", "100bps", "200bps"];

function DepthCurve({ bands }: { bands: DepthBands }) {
  const values = BANDS.map((k) => {
    const b = bands[k] || {};
    return (b.bidUSD ?? 0) + (b.askUSD ?? 0);
  });
  const max = Math.max(...values, 1);
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 40 - (v / max) * 35;
    return `${x},${y}`;
  }).join(' ');
  
  const areaPath = `M 0,40 L ${points} L 100,40 Z`;
  
  return (
    <svg viewBox="0 0 100 45" className="w-full h-16">
      <defs>
        <linearGradient id="depthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#00D9FF" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#depthGradient)" />
      <polyline
        points={points}
        fill="none"
        stroke="#00D9FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map((v, i) => {
        const x = (i / (values.length - 1)) * 100;
        const y = 40 - (v / max) * 35;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="2.5"
            fill="#0a0a0a"
            stroke="#00D9FF"
            strokeWidth="1.5"
          />
        );
      })}
    </svg>
  );
}

function BidAskBar({ bid, ask, maxTotal }: { bid: number; ask: number; maxTotal: number }) {
  const total = bid + ask;
  const bidPct = total > 0 ? (bid / total) * 100 : 50;
  const askPct = total > 0 ? (ask / total) * 100 : 50;
  const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  return (
    <div className="h-2 bg-neutral-800/60 rounded-full overflow-hidden" style={{ width: `${Math.max(widthPct, 20)}%` }}>
      <div className="h-full flex">
        <div 
          className="h-full bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-500"
          style={{ width: `${bidPct}%` }}
        />
        <div 
          className="h-full bg-gradient-to-l from-red-600 to-red-500 transition-all duration-500"
          style={{ width: `${askPct}%` }}
        />
      </div>
    </div>
  );
}

function ImbalanceGauge({ bands }: { bands: DepthBands }) {
  const totalBid = BANDS.reduce((sum, k) => sum + (bands[k]?.bidUSD ?? 0), 0);
  const totalAsk = BANDS.reduce((sum, k) => sum + (bands[k]?.askUSD ?? 0), 0);
  const total = totalBid + totalAsk;
  const imbalance = total > 0 ? ((totalBid - totalAsk) / total) * 100 : 0;
  
  const angle = Math.max(-45, Math.min(45, imbalance * 2));
  const color = imbalance > 10 ? '#22c55e' : imbalance < -10 ? '#ef4444' : '#64748b';
  const label = imbalance > 10 ? 'Bid Heavy' : imbalance < -10 ? 'Ask Heavy' : 'Balanced';
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-8">
        <svg viewBox="0 0 50 30" className="w-full h-full">
          <path
            d="M 5 25 A 20 20 0 0 1 45 25"
            fill="none"
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <g transform={`rotate(${angle}, 25, 25)`}>
            <line x1="25" y1="25" x2="25" y2="8" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="25" cy="25" r="3" fill={color} />
          </g>
        </svg>
      </div>
      <div>
        <div className="text-sm font-mono font-bold" style={{ color }}>
          {imbalance >= 0 ? '+' : ''}{imbalance.toFixed(1)}%
        </div>
        <div className="text-[9px] text-neutral-500 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function LiquidityScore({ bands }: { bands: DepthBands }) {
  const depth10 = (bands["10bps"]?.bidUSD ?? 0) + (bands["10bps"]?.askUSD ?? 0);
  const depth50 = (bands["50bps"]?.bidUSD ?? 0) + (bands["50bps"]?.askUSD ?? 0);
  const depth200 = (bands["200bps"]?.bidUSD ?? 0) + (bands["200bps"]?.askUSD ?? 0);
  
  let score = 0;
  if (depth10 > 5_000_000) score += 30;
  else if (depth10 > 2_000_000) score += 20;
  else if (depth10 > 1_000_000) score += 10;
  
  if (depth50 > 15_000_000) score += 35;
  else if (depth50 > 8_000_000) score += 25;
  else if (depth50 > 4_000_000) score += 15;
  
  if (depth200 > 30_000_000) score += 35;
  else if (depth200 > 15_000_000) score += 25;
  else if (depth200 > 8_000_000) score += 15;
  
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B+' : 
                score >= 60 ? 'B' : score >= 50 ? 'C+' : score >= 40 ? 'C' : 'D';
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#84cc16' : 
                score >= 40 ? '#f59e0b' : '#ef4444';
  
  return (
    <div className="flex items-center gap-2">
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center border-2 font-bold text-lg"
        style={{ borderColor: color, color, backgroundColor: `${color}15` }}
      >
        {grade}
      </div>
      <div>
        <div className="text-xs font-mono" style={{ color }}>{score}/100</div>
        <div className="text-[9px] text-neutral-500 uppercase">Depth Score</div>
      </div>
    </div>
  );
}

export default function DynamicDepthLadder() {
  const { token } = useMicroFeed();
  const [state, setState] = useState<LadderState>({
    loading: true,
    error: null,
    bands: null,
  });
  const [deltas, setDeltas] = useState<Record<BandKey, number>>({} as Record<BandKey, number>);
  const prevBandsRef = useRef<DepthBands | null>(null);
  const prevTokenRef = useRef<string>(token);

  useEffect(() => {
    if (prevTokenRef.current !== token) {
      prevBandsRef.current = null;
      setDeltas({} as Record<BandKey, number>);
      setState(s => ({ ...s, loading: true }));
      prevTokenRef.current = token;
    }
    
    let cancelled = false;
    let isInitialFetch = state.bands === null;

    const fetchBands = async () => {
      try {
        if (isInitialFetch) {
          setState((s) => ({ ...s, loading: true, error: null }));
        }
        const res = await fetch("/api/analytics/stress/full");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const tokenDepth = json?.depth?.[token];
        const bands: DepthBands | null = tokenDepth?.bands ?? null;
        const spread = tokenDepth?.spread;
        const source = tokenDepth?.source;

        if (bands && prevBandsRef.current) {
          const newDeltas: Record<BandKey, number> = {} as Record<BandKey, number>;
          BANDS.forEach(k => {
            const prev = (prevBandsRef.current![k]?.bidUSD ?? 0) + (prevBandsRef.current![k]?.askUSD ?? 0);
            const curr = (bands[k]?.bidUSD ?? 0) + (bands[k]?.askUSD ?? 0);
            newDeltas[k] = curr - prev;
          });
          setDeltas(newDeltas);
        }
        
        if (bands) prevBandsRef.current = bands;

        if (!cancelled) {
          setState({
            loading: false,
            error: bands ? null : "No depth data for this token",
            bands,
            spread,
            source,
          });
          isInitialFetch = false;
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            loading: false,
            error: e instanceof Error ? e.message : "Error loading depth ladder",
          }));
        }
      }
    };

    fetchBands();
    const id = setInterval(fetchBands, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const { loading, error, bands, spread, source } = state;

  if (loading) {
    return (
      <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Depth Ladder  -  {token}
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 animate-pulse">Loading depth bands…</div>
      </div>
    );
  }

  if (error || !bands) {
    return (
      <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Depth Ladder  -  {token}
          </div>
        </div>
        <div className="text-[11px] text-red-400">{error}</div>
      </div>
    );
  }

  const maxTotal = Math.max(...BANDS.map(k => (bands[k]?.bidUSD ?? 0) + (bands[k]?.askUSD ?? 0)), 1);

  return (
    <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Depth Ladder  -  {token}
          </div>
        </div>
        {source && (
          <div className="text-[9px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 uppercase">
            {source}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <ImbalanceGauge bands={bands} />
        {spread !== undefined && (
          <div className="text-center">
            <div className="text-lg font-mono font-bold text-yellow-400">
              {(spread * 10000).toFixed(2)}
            </div>
            <div className="text-[9px] text-neutral-500 uppercase">Spread (bps)</div>
          </div>
        )}
        <LiquidityScore bands={bands} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-3 h-3 text-cyan-400" />
        <span className="text-[9px] uppercase tracking-widest text-neutral-500">Depth Curve</span>
      </div>
      <div className="mb-4">
        <DepthCurve bands={bands} />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <Scale className="w-3 h-3 text-cyan-400" />
        <span className="text-[9px] uppercase tracking-widest text-neutral-500">Band Breakdown</span>
      </div>

      <div className="space-y-2">
        {BANDS.map((k) => {
          const b = bands[k] || {};
          const bid = b.bidUSD ?? 0;
          const ask = b.askUSD ?? 0;
          const total = bid + ask;
          const delta = deltas[k] ?? 0;
          
          return (
            <div key={k} className="flex items-center gap-3">
              <div className="w-12 text-[10px] text-neutral-400 font-mono">{k}</div>
              <div className="flex-1">
                <BidAskBar bid={bid} ask={ask} maxTotal={maxTotal} />
              </div>
              <div className="w-16 text-right">
                <span className="text-xs font-mono text-cyan-300">
                  ${(total / 1_000_000).toFixed(2)}M
                </span>
              </div>
              <div className="w-14 flex items-center justify-end gap-1">
                {delta !== 0 && (
                  <>
                    {delta > 0 ? (
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-[9px] font-mono ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {delta > 0 ? '+' : ''}{(delta / 1_000_000).toFixed(1)}M
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800/60">
        <div className="flex items-center gap-3 text-[9px] text-neutral-500">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Bids
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-sm bg-red-500" /> Asks
          </span>
        </div>
        <div className="text-[9px] text-neutral-500">
          Updated every 15s
        </div>
      </div>
    </div>
  );
}
