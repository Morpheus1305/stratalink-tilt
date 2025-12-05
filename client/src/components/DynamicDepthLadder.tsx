import { useEffect, useState } from "react";
import { useMicroFeed } from "@/contexts/MicrostructureFeed";

type BandKey = "10bps" | "25bps" | "50bps" | "100bps" | "200bps";
type BandData = { bidUSD?: number; askUSD?: number };
type DepthBands = Record<BandKey, BandData>;

type LadderState = {
  loading: boolean;
  error: string | null;
  bands: DepthBands | null;
};

const BANDS: BandKey[] = ["10bps", "25bps", "50bps", "100bps", "200bps"];

export default function DynamicDepthLadder() {
  const { token } = useMicroFeed();
  const [state, setState] = useState<LadderState>({
    loading: true,
    error: null,
    bands: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/analytics/stress/full");
        const json = await res.json();
        const tokenDepth = json?.depth?.[token];
        const bands = tokenDepth?.bands ?? null;

        if (!cancelled) {
          setState({
            loading: false,
            error: bands ? null : "No depth data for this token",
            bands,
          });
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setState({
            loading: false,
            error: e instanceof Error ? e.message : "Error loading ladder",
            bands: null,
          });
        }
      }
    };

    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const { loading, error, bands } = state;

  return (
    <div className="flex flex-col">
      <div className="text-[10px] uppercase tracking-[0.15em] text-neutral-400 mb-1">
        Depth Ladder (Total USD) — {token}
      </div>

      {loading && <div className="text-[11px] text-neutral-500">Loading…</div>}
      {error && <div className="text-[11px] text-red-400">{error}</div>}

      {!loading && bands && (
        <div className="grid grid-cols-5 gap-2">
          {BANDS.map((b) => {
            const d = bands[b] || {};
            const total = (d.bidUSD ?? 0) + (d.askUSD ?? 0);
            return (
              <div
                key={b}
                className="rounded-lg bg-[#08111f] border border-[#1a2335] px-2 py-2 flex flex-col items-center"
              >
                <div className="text-[11px] text-neutral-300">{b}</div>
                <div className="text-[11px] text-cyan-300">
                  {total > 0 ? `$${(total / 1_000_000).toFixed(2)}M` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[10px] text-neutral-500 mt-2">
        Relative depth across 10/25/50/100/200bps bands for {token}.
      </div>
    </div>
  );
}
