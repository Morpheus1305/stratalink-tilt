import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TT } from "@/components/tilt-tooltip";
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type DepthBand = {
  bidUSD: number;
  askUSD: number;
  totalUSD: number;
  imbalance: number;
};

type TokenDepth = {
  mid: number;
  spread: number;
  spreadBps: number;
  bands: {
    "10bps": DepthBand;
    "25bps": DepthBand;
    "50bps": DepthBand;
    "100bps": DepthBand;
    "200bps": DepthBand;
  };
  source: string;
  ts: number;
};

type DepthPanelProps = {
  depth: Record<string, TokenDepth> | undefined;
};

const BANDS = [
  { key: "10bps", label: "10bps" },
  { key: "25bps", label: "25bps" },
  { key: "50bps", label: "50bps" },
  { key: "100bps", label: "100bps" },
  { key: "200bps", label: "200bps" },
] as const;

function formatMillions(value: number): string {
  if (!value || value === 0) return " - ";
  if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000) return "$" + (value / 1_000).toFixed(1) + "K";
  return "$" + value.toFixed(0);
}

export default function DepthPanel({ depth }: DepthPanelProps) {
  if (!depth || Object.keys(depth).length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <TT title="Orderbook Depth" body="Cross-token depth snapshot at multiple price bands (10, 25, 50, 100, 200 bps from mid). Bid and ask depth are shown separately so you can detect imbalances. Tokens with consistently thin depth across all bands carry higher execution risk at institutional order sizes.">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Orderbook Depth (Top 10 Tokens)
            </CardTitle>
          </TT>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No depth data available.</p>
        </CardContent>
      </Card>
    );
  }

  const tokens = Object.keys(depth);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <TT title="Orderbook Depth" body="Cross-token depth snapshot at multiple price bands (10, 25, 50, 100, 200 bps from mid). Bid and ask depth are shown separately so you can detect imbalances. Tokens with consistently thin depth across all bands carry higher execution risk at institutional order sizes.">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Orderbook Depth (Top 10 Tokens)
          </CardTitle>
        </TT>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 text-muted-foreground font-medium">Token</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Mid Price</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Spread</th>
                {BANDS.map((b) => (
                  <th key={b.key} className="text-right py-2 text-muted-foreground font-medium">
                    {b.label}
                  </th>
                ))}
                <th className="text-right py-2 text-muted-foreground font-medium">Imbalance</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((symbol) => {
                const row = depth[symbol];
                if (!row) return null;

                const { mid, spreadBps, bands, source } = row;
                const imbalance = bands?.["10bps"]?.imbalance ?? 0;

                return (
                  <tr 
                    key={symbol} 
                    className="border-b border-border/30 hover:bg-muted/20"
                    data-testid={`row-depth-${symbol}`}
                  >
                    <td className="py-2 font-mono font-medium text-foreground">{symbol}</td>
                    <td className="py-2 text-right font-mono text-foreground">
                      ${mid?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 text-right font-mono text-muted-foreground">
                      {spreadBps?.toFixed(2) ?? "0.00"} bps
                    </td>
                    {BANDS.map((b) => {
                      const entry = bands?.[b.key as keyof typeof bands];
                      const total = (entry?.bidUSD ?? 0) + (entry?.askUSD ?? 0);
                      return (
                        <td key={b.key} className="py-2 text-right font-mono text-foreground">
                          {formatMillions(total)}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right">
                      <span className={cn(
                        "font-mono",
                        imbalance > 0 ? "text-green-400" : imbalance < 0 ? "text-red-400" : "text-muted-foreground"
                      )}>
                        {imbalance !== 0 ? (
                          imbalance > 0 ? (
                            <TrendingUp className="inline h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="inline h-3 w-3 mr-1" />
                          )
                        ) : null}
                        {imbalance ? (imbalance * 100).toFixed(1) + "%" : " - "}
                      </span>
                    </td>
                    <td className="py-2 text-right text-muted-foreground capitalize">
                      {source ?? " - "}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
