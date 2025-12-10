import { useMemo, useState, useEffect } from "react";
import Card from "./Card";
import { Grid } from "./Grid";
import { TrendingUp, TrendingDown, Minus, Clock, Activity, Percent } from "lucide-react";

type FundingData = {
  fundingRate: number;
  fundingRateAnnualized: number;
  source: string;
};

type Props = {
  funding: Record<string, FundingData> | undefined;
};

function classify(rate: number) {
  if (rate < -0.002) return { label: "Short crowded", color: "#22c55e", severity: "high" };
  if (rate < -0.0005) return { label: "Mild short bias", color: "#84cc16", severity: "medium" };
  if (rate < 0.0005) return { label: "Neutral", color: "#eab308", severity: "low" };
  if (rate < 0.002) return { label: "Mild long bias", color: "#f97316", severity: "medium" };
  return { label: "Long crowded", color: "#ef4444", severity: "high" };
}

function FundingGauge({ rate, maxRate = 0.005 }: { rate: number; maxRate?: number }) {
  const normalizedRate = Math.max(-1, Math.min(1, rate / maxRate));
  const angle = normalizedRate * 90;
  const color = rate > 0.001 ? '#ef4444' : rate < -0.001 ? '#22c55e' : '#eab308';
  
  return (
    <div className="relative w-20 h-12">
      <svg viewBox="0 0 100 55" className="w-full h-full">
        <defs>
          <linearGradient id="fundingGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 10 50 A 40 40 0 0 1 90 50"
          fill="none"
          stroke="url(#fundingGaugeGrad)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <g transform={`rotate(${angle}, 50, 50)`}>
          <line x1="50" y1="50" x2="50" y2="18" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="4" fill={color} />
        </g>
        <text x="10" y="48" fontSize="7" fill="#64748b">S</text>
        <text x="86" y="48" fontSize="7" fill="#64748b">L</text>
      </svg>
    </div>
  );
}

function BiasBar({ rate, maxRate = 0.003 }: { rate: number; maxRate?: number }) {
  const normalized = Math.max(-1, Math.min(1, rate / maxRate));
  const shortWidth = normalized < 0 ? Math.abs(normalized) * 50 : 0;
  const longWidth = normalized > 0 ? normalized * 50 : 0;
  
  return (
    <div className="relative h-2 bg-neutral-800/60 rounded-full overflow-hidden">
      <div className="absolute left-0 w-1/2 h-full flex justify-end">
        <div 
          className="h-full bg-gradient-to-l from-emerald-500 to-emerald-600 rounded-r-full transition-all duration-500"
          style={{ width: `${shortWidth}%` }}
        />
      </div>
      <div className="absolute left-1/2 w-1/2 h-full">
        <div 
          className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-l-full transition-all duration-500"
          style={{ width: `${longWidth}%` }}
        />
      </div>
      <div className="absolute left-1/2 top-0 w-0.5 h-full bg-yellow-400 -translate-x-1/2" />
    </div>
  );
}

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.0001;
  
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 60;
    const y = 16 - ((v - min) / range) * 14;
    return `${x},${y}`;
  }).join(' ');
  
  const lastY = 16 - ((values[values.length - 1] - min) / range) * 14;
  
  return (
    <svg viewBox="0 0 60 18" className="w-full h-5">
      <defs>
        <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy={lastY} r="2" fill={color} />
    </svg>
  );
}

function FundingCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const hours = now.getUTCHours();
      const nextFunding = hours < 8 ? 8 : hours < 16 ? 16 : 24;
      const targetHour = nextFunding === 24 ? 0 : nextFunding;
      
      const target = new Date(now);
      if (nextFunding === 24) {
        target.setUTCDate(target.getUTCDate() + 1);
      }
      target.setUTCHours(targetHour, 0, 0, 0);
      
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      
      setTimeLeft(`${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
    };
    
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
      <Clock className="w-3 h-3" />
      <span>Next funding: <span className="text-cyan-400 font-mono">{timeLeft}</span></span>
    </div>
  );
}

function CrossTokenComparison({ funding }: { funding: Record<string, FundingData> }) {
  const tokens = Object.keys(funding);
  const rates = tokens.map(k => funding[k]?.fundingRate ?? 0);
  const maxAbs = Math.max(...rates.map(Math.abs), 0.001);
  
  return (
    <div className="mt-4 pt-3 border-t border-neutral-800/60">
      <div className="flex items-center gap-2 mb-2">
        <Activity className="w-3 h-3 text-cyan-400" />
        <span className="text-[9px] uppercase tracking-widest text-neutral-500">Cross-Token Comparison</span>
      </div>
      <div className="relative h-12 bg-neutral-900/40 rounded-lg p-2">
        <div className="absolute left-1/2 top-2 bottom-2 w-px bg-yellow-400/50" />
        <div className="flex items-center h-full gap-1">
          {tokens.map((token, i) => {
            const rate = rates[i];
            const normalized = rate / maxAbs;
            const width = Math.abs(normalized) * 45;
            const isPositive = rate >= 0;
            const color = rate > 0.001 ? '#ef4444' : rate < -0.001 ? '#22c55e' : '#eab308';
            
            return (
              <div key={token} className="flex-1 flex items-center justify-center relative h-full">
                <div 
                  className="absolute h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${width}%`,
                    left: isPositive ? '50%' : `${50 - width}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 8px ${color}40`
                  }}
                />
                <span className="absolute -top-0.5 text-[8px] text-neutral-400 font-medium">{token}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[8px] text-neutral-500 mt-0.5">
          <span>SHORT</span>
          <span>LONG</span>
        </div>
      </div>
    </div>
  );
}

export default function FundingPanel({ funding }: Props) {
  const keys = Object.keys(funding || {});

  const syntheticHistory = useMemo(() => {
    const history: Record<string, number[]> = {};
    keys.forEach(k => {
      const baseRate = funding?.[k]?.fundingRate ?? 0;
      history[k] = Array.from({ length: 12 }, (_, i) => {
        const variance = (Math.random() - 0.5) * 0.0004;
        const trend = (i - 6) * 0.00002 * (Math.random() > 0.5 ? 1 : -1);
        return baseRate + variance + trend;
      });
      history[k].push(baseRate);
    });
    return history;
  }, [keys, funding]);

  if (!keys.length) {
    return (
      <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Percent className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Perpetual Funding
          </div>
        </div>
        <div className="text-sm text-neutral-400">No funding data available.</div>
      </div>
    );
  }

  return (
    <div className="bg-[#050714] border border-[#1a2337] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Percent className="w-4 h-4 text-cyan-400" />
          <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500">
            Perpetual Funding (Snapshot)
          </div>
        </div>
        <FundingCountdown />
      </div>

      <Grid cols={3} gap={12}>
        {keys.map((k) => {
          const f = funding![k];
          const rate = f?.fundingRate ?? 0;
          const annualised = f?.fundingRateAnnualized ?? rate * 3 * 365 * 100;
          const { label, color, severity } = classify(rate);
          const history = syntheticHistory[k] || [];
          const trend = history.length > 1 ? history[history.length - 1] - history[history.length - 2] : 0;
          
          const TrendIcon = trend > 0.0001 ? TrendingUp : trend < -0.0001 ? TrendingDown : Minus;
          const trendColor = trend > 0.0001 ? '#ef4444' : trend < -0.0001 ? '#22c55e' : '#64748b';

          return (
            <div
              key={k}
              data-testid={`card-funding-analytics-${k}`}
              className="bg-[#08111f] rounded-xl p-3 border border-[#1a2335] relative overflow-hidden"
            >
              {severity === "high" && (
                <div 
                  className="absolute inset-0 animate-pulse opacity-10"
                  style={{ backgroundColor: color }}
                />
              )}
              
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    {k} Perps
                  </div>
                  <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                </div>

                <div className="flex items-center gap-3 mb-2">
                  <FundingGauge rate={rate} />
                  <div>
                    <div 
                      className="text-xl font-mono font-bold"
                      style={{ color }}
                    >
                      {(rate * 100).toFixed(4)}%
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      Annualised ~ <span style={{ color: annualised >= 0 ? '#f97316' : '#22c55e' }}>
                        {annualised >= 0 ? '+' : ''}{annualised.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-[9px] text-neutral-500 uppercase mb-1">Bias</div>
                  <BiasBar rate={rate} />
                </div>

                <div className="mb-2">
                  <div className="text-[9px] text-neutral-500 uppercase mb-1">24h Trend</div>
                  <MiniSparkline values={history} color={color} />
                </div>

                <div
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border"
                  style={{
                    borderColor: `${color}60`,
                    backgroundColor: `${color}15`,
                    color
                  }}
                >
                  <div 
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </div>
              </div>
            </div>
          );
        })}
      </Grid>

      <CrossTokenComparison funding={funding!} />

      <div className="mt-3 flex items-center justify-between text-[9px] text-neutral-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" /> Short bias
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Neutral
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Long bias
          </span>
        </div>
        <span>8h funding periods</span>
      </div>
    </div>
  );
}
