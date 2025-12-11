import { useState, useEffect } from "react";
import Card from "./Card";
import { TrendingUp, TrendingDown, Activity, Waves } from "lucide-react";

type LiquidationData = {
  longs: number;
  shorts: number;
  imbalance: number;
};

type Props = {
  liquidations: Record<string, LiquidationData> | undefined;
};

function LiquidationBar({ token, longs, shorts, maxTotal }: { token: string; longs: number; shorts: number; maxTotal: number }) {
  const total = longs + shorts;
  const longPct = total > 0 ? (longs / total) * 100 : 50;
  const shortPct = total > 0 ? (shorts / total) * 100 : 50;
  const widthPct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  
  return (
    <div className="mb-3" data-testid={`item-whale-${token}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-cyan-400">{token}</span>
        <span className="text-[10px] text-neutral-400 font-mono">
          ${(total / 1_000_000).toFixed(2)}M
        </span>
      </div>
      <div className="relative h-4 rounded-sm overflow-hidden bg-neutral-800/50" style={{ width: `${Math.max(widthPct, 30)}%` }}>
        <div 
          className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-500"
          style={{ width: `${longPct}%` }}
        />
        <div 
          className="absolute right-0 top-0 h-full bg-gradient-to-l from-emerald-600 to-emerald-500 transition-all duration-500"
          style={{ width: `${shortPct}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-mono text-white/90 drop-shadow">
            {longPct.toFixed(0)}% / {shortPct.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}

export default function WhaleImbalancePanel({ liquidations }: Props) {
  const [pulse, setPulse] = useState(false);
  
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => !p), 2000);
    return () => clearInterval(interval);
  }, []);

  const entries = Object.keys(liquidations || {}).map((k) => ({
    token: k,
    longs: liquidations![k].longs ?? 0,
    shorts: liquidations![k].shorts ?? 0,
    imbalance: liquidations![k].imbalance ?? 0,
  })).sort((a, b) => (b.longs + b.shorts) - (a.longs + a.shorts));

  const maxTotal = Math.max(...entries.map(e => e.longs + e.shorts), 1);
  const totalLongs = entries.reduce((sum, e) => sum + e.longs, 0);
  const totalShorts = entries.reduce((sum, e) => sum + e.shorts, 0);
  const netImbalance = totalLongs - totalShorts;
  const imbalancePct = (totalLongs + totalShorts) > 0 
    ? ((netImbalance) / (totalLongs + totalShorts)) * 100 
    : 0;

  return (
    <Card title="Whale Imbalance & Liquidations">
      <div className="flex items-center gap-4 mb-4">
        <div className="relative">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${
            imbalancePct > 10 ? 'bg-red-500/20 border-2 border-red-500' :
            imbalancePct < -10 ? 'bg-emerald-500/20 border-2 border-emerald-500' :
            'bg-neutral-700/40 border-2 border-neutral-600'
          }`}>
            {imbalancePct > 10 ? (
              <TrendingDown className="w-6 h-6 text-red-400" />
            ) : imbalancePct < -10 ? (
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            ) : (
              <Activity className={`w-6 h-6 text-neutral-400 ${pulse ? 'opacity-100' : 'opacity-60'} transition-opacity`} />
            )}
          </div>
          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
            Math.abs(imbalancePct) > 15 ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'
          }`} />
        </div>
        
        <div>
          <div className="text-lg font-mono font-semibold" style={{ 
            color: imbalancePct > 10 ? '#ef4444' : imbalancePct < -10 ? '#22c55e' : '#94a3b8' 
          }}>
            {imbalancePct >= 0 ? '+' : ''}{imbalancePct.toFixed(1)}%
          </div>
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
            {imbalancePct > 10 ? 'Long Heavy' : imbalancePct < -10 ? 'Short Heavy' : 'Balanced'}
          </div>
        </div>

        <div className="ml-auto text-right">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-red-400">L: ${(totalLongs / 1_000_000).toFixed(1)}M</span>
            <span className="text-neutral-500">/</span>
            <span className="text-emerald-400">S: ${(totalShorts / 1_000_000).toFixed(1)}M</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Waves className="w-3 h-3 text-cyan-400" />
        <span className="text-[10px] uppercase tracking-widest text-neutral-400">Per-Token Breakdown</span>
      </div>

      <div className="space-y-1">
        {entries.slice(0, 3).map((e) => (
          <LiquidationBar 
            key={e.token} 
            token={e.token} 
            longs={e.longs} 
            shorts={e.shorts}
            maxTotal={maxTotal}
          />
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-500">
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-red-500" /> Longs
        </span>
        <span className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-emerald-500" /> Shorts
        </span>
      </div>

      {/* Enhanced Bottom Stats */}
      <div className="mt-3 pt-3 border-t border-neutral-800/60 grid grid-cols-3 gap-2">
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Net Flow</div>
          <div className={`text-xs font-mono font-semibold ${netImbalance >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {netImbalance >= 0 ? '+' : ''}${(netImbalance / 1_000_000).toFixed(1)}M
          </div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Total Vol</div>
          <div className="text-xs font-mono font-semibold text-cyan-400">
            ${((totalLongs + totalShorts) / 1_000_000).toFixed(1)}M
          </div>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <div className="text-[9px] text-neutral-500 uppercase">Tokens</div>
          <div className="text-xs font-mono font-semibold text-white">
            {entries.length}
          </div>
        </div>
      </div>
      
      {/* Pressure Indicator */}
      <div className="mt-2 flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-neutral-900/80 to-neutral-800/40 border border-neutral-700/30">
        <div className={`w-2 h-2 rounded-full ${Math.abs(imbalancePct) > 15 ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="text-[10px] text-neutral-400">
          {Math.abs(imbalancePct) > 25 
            ? "High liquidation pressure — expect volatility"
            : Math.abs(imbalancePct) > 10
              ? "Moderate directional pressure building"
              : "Neutral positioning — low cascade risk"
          }
        </span>
      </div>
    </Card>
  );
}
