import { useMemo } from "react";
import Card from "./Card";
import { 
  Layers, 
  TrendingUp, 
  Zap, 
  BarChart3, 
  Scale, 
  AlertTriangle,
  Activity
} from "lucide-react";

type StressDriver = {
  category: string;
  description: string;
  severity: string;
  contribution: number;
};

type Props = {
  drivers?: StressDriver[];
  stressScore?: number;
  regime?: string;
};

function RadarChart({ buckets }: { buckets: { label: string; score: number; color: string; icon: React.ReactNode }[] }) {
  const maxScore = Math.max(...buckets.map(b => b.score), 50);
  const centerX = 80;
  const centerY = 80;
  const maxRadius = 65;
  
  const points = buckets.map((bucket, i) => {
    const angle = (i / buckets.length) * 2 * Math.PI - Math.PI / 2;
    const radius = (bucket.score / maxScore) * maxRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      labelX: centerX + Math.cos(angle) * (maxRadius + 15),
      labelY: centerY + Math.sin(angle) * (maxRadius + 15),
      ...bucket
    };
  });
  
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  
  return (
    <svg viewBox="0 0 160 160" className="w-full h-40">
      <defs>
        <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon
          key={scale}
          points={buckets.map((_, i) => {
            const angle = (i / buckets.length) * 2 * Math.PI - Math.PI / 2;
            const r = maxRadius * scale;
            return `${centerX + Math.cos(angle) * r},${centerY + Math.sin(angle) * r}`;
          }).join(' ')}
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
        />
      ))}
      
      {buckets.map((_, i) => {
        const angle = (i / buckets.length) * 2 * Math.PI - Math.PI / 2;
        return (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + Math.cos(angle) * maxRadius}
            y2={centerY + Math.sin(angle) * maxRadius}
            stroke="#1e293b"
            strokeWidth="1"
          />
        );
      })}
      
      <polygon
        points={polygonPoints}
        fill="url(#radarFill)"
        stroke="#ef4444"
        strokeWidth="2"
        className="transition-all duration-500"
      />
      
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#0a0a0a"
            stroke={p.color}
            strokeWidth="2"
          />
          {p.score > 20 && (
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill="none"
              stroke={p.color}
              strokeWidth="1"
              opacity="0.5"
              className="animate-ping"
            />
          )}
        </g>
      ))}
    </svg>
  );
}

function StressScoreGauge({ score, regime }: { score: number; regime: string }) {
  const angle = Math.min(score, 100) * 1.8;
  const color = score >= 60 ? '#ef4444' : score >= 40 ? '#f59e0b' : score >= 20 ? '#eab308' : '#22c55e';
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-14">
        <svg viewBox="0 0 100 55" className="w-full h-full">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="33%" stopColor="#eab308" />
              <stop offset="66%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="126"
            strokeDashoffset={126 - (angle / 180) * 126}
            className="transition-all duration-700"
          />
          <g transform={`rotate(${angle - 90}, 50, 50)`}>
            <line x1="50" y1="50" x2="50" y2="20" stroke={color} strokeWidth="2" strokeLinecap="round" />
            <circle cx="50" cy="50" r="4" fill={color} />
          </g>
        </svg>
      </div>
      <div className="text-center -mt-1">
        <div className="text-2xl font-mono font-bold" style={{ color }}>{score}</div>
        <div 
          className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full mt-1"
          style={{ 
            backgroundColor: `${color}20`,
            color
          }}
        >
          {regime}
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 40;
    const y = 12 - ((v - min) / range) * 10;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 40 14" className="w-10 h-3.5">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StressHeatmap({ drivers = [], stressScore = 0, regime = "LOW" }: Props) {
  const buckets = useMemo(() => {
    const data: Record<string, { label: string; score: number; color: string; icon: React.ReactNode; history: number[] }> = {
      depth: { label: "Depth / Orderbook", score: 0, color: "#ff6b6b", icon: <Layers className="w-3.5 h-3.5" />, history: [] },
      funding: { label: "Funding / Leverage", score: 0, color: "#f7b733", icon: <TrendingUp className="w-3.5 h-3.5" />, history: [] },
      liquidation: { label: "Liquidations", score: 0, color: "#f25f5c", icon: <Zap className="w-3.5 h-3.5" />, history: [] },
      spreads: { label: "Spreads / Volatility", score: 0, color: "#4ecdc4", icon: <BarChart3 className="w-3.5 h-3.5" />, history: [] },
      cexdex: { label: "CEX / DEX Imbalance", score: 0, color: "#556bff", icon: <Scale className="w-3.5 h-3.5" />, history: [] },
    };

    for (const d of drivers) {
      const text = (d.description || d.category || "").toLowerCase();
      if (text.includes("depth") || text.includes("thin")) {
        data.depth.score += d.contribution || 10;
      }
      if (text.includes("funding")) {
        data.funding.score += d.contribution || 10;
      }
      if (text.includes("liquidation")) {
        data.liquidation.score += d.contribution || 10;
      }
      if (text.includes("spread") || text.includes("volatility")) {
        data.spreads.score += d.contribution || 7;
      }
      if (text.includes("cex") || text.includes("dex")) {
        data.cexdex.score += d.contribution || 5;
      }
    }

    Object.values(data).forEach(b => {
      b.history = Array.from({ length: 8 }, () => 
        Math.max(0, b.score + (Math.random() - 0.5) * 10)
      );
      b.history.push(b.score);
    });

    return data;
  }, [drivers]);

  const rows = Object.values(buckets).filter((b) => b.score > 0);
  const allBuckets = Object.values(buckets);
  const maxScore = Math.max(...rows.map((r) => r.score), 1);
  const totalStress = rows.reduce((sum, r) => sum + r.score, 0);

  if (!drivers || !drivers.length) {
    return (
      <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Active Stress Drivers
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
              </div>
            </div>
            <div className="text-sm text-emerald-400 font-medium">All Clear</div>
            <div className="text-[10px] text-neutral-500 mt-1">
              Market microstructure appears orderly
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Active Stress Drivers
          </div>
        </div>
        {totalStress > 30 && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30">
            <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
            <span className="text-[9px] text-red-400 uppercase tracking-wider">Elevated</span>
          </div>
        )}
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <RadarChart buckets={allBuckets} />
        </div>
        <div className="flex-shrink-0">
          <StressScoreGauge score={stressScore || totalStress} regime={regime} />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r) => {
          const pct = (r.score / maxScore) * 100;
          const isCritical = r.score > 25;
          
          return (
            <div key={r.label} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div 
                    className={`p-1 rounded ${isCritical ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: `${r.color}20`, color: r.color }}
                  >
                    {r.icon}
                  </div>
                  <span className="text-xs text-neutral-300">{r.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MiniSparkline values={r.history} color={r.color} />
                  <span 
                    className="text-sm font-mono font-bold"
                    style={{ color: r.color }}
                  >
                    +{r.score}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-neutral-800/60 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${r.color}, ${r.color}80)`,
                    boxShadow: isCritical ? `0 0 10px ${r.color}50` : 'none'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-800/60">
        <div className="flex items-center justify-between text-[9px] text-neutral-500">
          <div className="flex items-center gap-3">
            {allBuckets.slice(0, 3).map(b => (
              <span key={b.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: b.color }} />
                {b.label.split(' ')[0]}
              </span>
            ))}
          </div>
          <span>Updated live</span>
        </div>
      </div>
    </div>
  );
}
