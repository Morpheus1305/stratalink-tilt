import { useEffect, useState } from "react";
import { useMicroFeed } from "@/contexts/MicrostructureFeed";

type BandKey = "10bps" | "25bps" | "50bps" | "100bps" | "200bps";

type BandData = {
  bidUSD?: number;
  askUSD?: number;
};

type DepthBands = Record<BandKey, BandData>;

export default function DepthLadderMiniHeatmap() {
  const { token } = useMicroFeed();
  const [bands, setBands] = useState<DepthBands | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchBands = async () => {
      try {
        const res = await fetch(`/api/analytics/depth?symbol=${token}`);
        const json = await res.json();
        if (!mounted) return;
        setBands(json?.bands ?? null);
        setLoading(false);
      } catch (e) {
        console.error("Depth ladder fetch error:", e);
        if (!mounted) return;
        setBands(null);
        setLoading(false);
      }
    };

    fetchBands();
    const id = setInterval(fetchBands, 15000);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token]);

  const keys: BandKey[] = ["10bps", "25bps", "50bps", "100bps", "200bps"];

  const totals = keys.map((k) => {
    const b = bands?.[k];
    const bid = b?.bidUSD ?? 0;
    const ask = b?.askUSD ?? 0;
    return bid + ask;
  });

  const max = Math.max(...totals, 0.0001);

  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 mb-1">
        Depth Ladder (Total USD)
      </div>
      {loading && !bands && (
        <div className="text-[11px] text-neutral-500">Loading…</div>
      )}
      {!loading && !bands && (
        <div className="text-[11px] text-neutral-500">
          No depth data available for {token}.
        </div>
      )}
      {bands && (
        <div className="grid grid-cols-5 gap-1 mt-1">
          {keys.map((k, idx) => {
            const total = totals[idx];
            const intensity = total / max;
            const bg = `rgba(44, 199, 255, ${0.15 + intensity * 0.6})`;

            return (
              <div
                key={k}
                className="flex flex-col items-center justify-end rounded-md border border-[#1a1f2e] px-1 py-1"
                style={{
                  background: `linear-gradient(to top, ${bg}, rgba(5, 8, 20, 0.9))`,
                  minHeight: 40,
                }}
              >
                <div className="w-full h-2 rounded-sm mb-1 bg-[#101524]">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: "100%",
                      background: `rgba(44, 199, 255, ${
                        0.25 + intensity * 0.5
                      })`,
                    }}
                  />
                </div>
                <div className="text-[9px] text-neutral-400 mb-0.5">{k}</div>
                <div className="text-[9px] text-neutral-300">
                  {total > 0 ? `$${(total / 1_000_000).toFixed(2)}M` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="text-[10px] text-neutral-500 mt-1">
        Relative depth across 10/25/50/100/200bps for {token}.
      </div>
    </div>
  );
}
