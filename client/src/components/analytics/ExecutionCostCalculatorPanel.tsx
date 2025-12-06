import { useMemo, useState } from "react";
import { useExecutionCost } from "@/hooks/useExecutionCost";

type Props = {
  token: string;
};

const PRESETS = [10_000, 100_000, 1_000_000, 10_000_000];

export const ExecutionCostCalculatorPanel: React.FC<Props> = ({ token }) => {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [sizeUsd, setSizeUsd] = useState<number>(100_000);
  const [submitted, setSubmitted] = useState(false);

  const query = useMemo(
    () =>
      submitted
        ? {
            token,
            side,
            sizeUsd,
          }
        : null,
    [submitted, token, side, sizeUsd]
  );

  const { loading, error, result } = useExecutionCost(query);

  const best = result?.bestVenue ? result : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-neutral-400">
        Execution Cost Calculator – {token}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="text-neutral-400 mr-1">Side:</span>
          <button
            data-testid="button-side-buy"
            className={`px-2 py-[2px] rounded text-[11px] border ${
              side === "buy"
                ? "border-emerald-400 text-emerald-300 bg-[#041412]"
                : "border-[#1a2335] text-neutral-400 bg-[#050814]"
            }`}
            onClick={() => setSide("buy")}
          >
            Buy
          </button>
          <button
            data-testid="button-side-sell"
            className={`px-2 py-[2px] rounded text-[11px] border ${
              side === "sell"
                ? "border-red-400 text-red-300 bg-[#19060b]"
                : "border-[#1a2335] text-neutral-400 bg-[#050814]"
            }`}
            onClick={() => setSide("sell")}
          >
            Sell
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-neutral-400">Size (USD):</span>
          <input
            type="number"
            data-testid="input-size-usd"
            className="bg-[#050814] border border-[#1a2335] rounded px-2 py-[2px] text-[11px] w-28 text-neutral-200"
            value={sizeUsd}
            onChange={(e) => setSizeUsd(Number(e.target.value || 0))}
          />
          <div className="flex gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                data-testid={`button-preset-${p}`}
                className="px-2 py-[2px] rounded text-[10px] border border-[#1a2335] text-neutral-400 bg-[#050814]"
                onClick={() => setSizeUsd(p)}
              >
                ${p >= 1_000_000 ? `${p / 1_000_000}M` : `${p / 1_000}K`}
              </button>
            ))}
          </div>
        </div>

        <button
          data-testid="button-calculate"
          className="ml-auto px-3 py-[4px] rounded text-[11px] bg-cyan-500 text-black hover:bg-cyan-400 transition"
          onClick={() => setSubmitted(true)}
        >
          Calculate
        </button>
      </div>

      <div className="min-h-[80px] text-[11px] text-neutral-300">
        {!submitted && (
          <div className="text-neutral-500">
            Enter a size and click <span className="text-cyan-300">Calculate</span> to
            estimate slippage across venues.
          </div>
        )}

        {submitted && loading && (
          <div className="text-neutral-500">Computing execution cost…</div>
        )}

        {submitted && error && (
          <div className="text-red-400">
            {error} – this likely means <code>/api/execution/cost</code> is not
            live yet.
          </div>
        )}

        {submitted && !loading && !error && best && (
          <div className="flex flex-col gap-2">
            <div>
              Best venue:{" "}
              <span className="text-cyan-300 font-medium">
                {best.bestVenue}
              </span>{" "}
              with slippage of{" "}
              <span className="text-cyan-300">
                {best.bestTotalSlippageBps.toFixed(2)} bps
              </span>{" "}
              (~$
              {best.bestTotalSlippageUsd.toFixed(2)}) for a{" "}
              <span className="text-neutral-100">
                ${sizeUsd.toLocaleString()} {side.toUpperCase()} in {token}
              </span>
              .
            </div>

            {Array.isArray(best.quotes) && best.quotes.length > 0 && (
              <div className="mt-1">
                <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-500 mb-1">
                  Venue breakdown
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-[11px]">
                    <thead className="text-neutral-400">
                      <tr>
                        <th className="text-left pr-4 pb-1">Venue</th>
                        <th className="text-right pr-4 pb-1">Slippage (bps)</th>
                        <th className="text-right pr-4 pb-1">Slippage (USD)</th>
                        <th className="text-right pr-4 pb-1">
                          Depth Utilization
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-300">
                      {best.quotes.map((q: any) => (
                        <tr key={q.venue}>
                          <td className="pr-4 py-[2px]">{q.venue}</td>
                          <td className="pr-4 py-[2px] text-right">
                            {q.expectedSlippageBps.toFixed(2)}
                          </td>
                          <td className="pr-4 py-[2px] text-right">
                            ${q.expectedSlippageUsd.toFixed(2)}
                          </td>
                          <td className="pr-4 py-[2px] text-right">
                            {q.depthUtilizationPct != null
                              ? `${q.depthUtilizationPct.toFixed(1)}%`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-[10px] text-neutral-500">
        Estimates venue-level slippage and suggests best execution paths for{" "}
        {token}. Backend must implement <code>/api/execution/cost</code> for
        live routing.
      </div>
    </div>
  );
};
