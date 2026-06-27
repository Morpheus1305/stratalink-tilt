import { useState } from "react";
import type { TickerItem } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

// CDN base for cryptocurrency icons (spothq open-source set on jsDelivr)
const ICON_CDN = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color";

// Tokens whose symbol differs from the CDN filename
const ICON_OVERRIDES: Record<string, string> = {
  BNB:  "bnb",
  SHIB: "shib",
  TON:  "ton",
  SUI:  "sui",
  LEO:  "leo",
  NEAR: "near",
  TRX:  "trx",
  AVAX: "avax",
  USDC: "usdc",
  USDT: "usdt",
  BCH:  "bch",
};

function getIconUrl(rawSymbol: string): string {
  // rawSymbol is e.g. "BTC/USD" — strip the /USD suffix
  const sym = rawSymbol.replace(/\/.*$/, "").toLowerCase();
  const file = ICON_OVERRIDES[sym.toUpperCase()] ?? sym;
  return `${ICON_CDN}/${file}.png`;
}

// One coloured letter badge as fallback
function SymbolBadge({ sym }: { sym: string }) {
  const letters = sym.replace(/\/.*$/, "").slice(0, 4);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "var(--color-accent, #00d4aa)",
        color: "#000",
        fontSize: 7,
        fontWeight: 800,
        fontFamily: "monospace",
        flexShrink: 0,
        letterSpacing: 0,
      }}
    >
      {letters}
    </span>
  );
}

function TokenLogo({ symbol }: { symbol: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <SymbolBadge sym={symbol} />;
  return (
    <img
      src={getIconUrl(symbol)}
      alt={symbol}
      width={18}
      height={18}
      style={{ borderRadius: "50%", flexShrink: 0 }}
      onError={() => setFailed(true)}
      loading="eager"
    />
  );
}

interface BottomTickerProps {
  items: TickerItem[];
}

export function BottomTicker({ items }: BottomTickerProps) {
  // Duplicate for seamless infinite scroll
  const duplicatedItems = [...items, ...items];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border h-10 flex items-center overflow-hidden bg-card"
      data-testid="bottom-ticker"
    >
      <div className="flex items-center gap-8 px-4 whitespace-nowrap ticker-scroll">
        {duplicatedItems.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-6 font-mono text-xs"
            data-testid={`ticker-item-${item.symbol.toLowerCase().replace("/", "-")}-${index}`}
          >
            <div className="flex items-center gap-2">
              <TokenLogo symbol={item.symbol} />
              <span
                className="text-muted-foreground font-semibold tracking-tight"
                data-testid={`ticker-symbol-${item.symbol.toLowerCase().replace("/", "-")}`}
              >
                {item.symbol}
              </span>
              <span
                className="text-foreground font-bold"
                data-testid={`ticker-price-${item.symbol.toLowerCase().replace("/", "-")}`}
              >
                ${item.price}
              </span>
              <div className="flex items-center gap-1">
                {parseFloat(item.changePercent) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-chart-3" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span
                  className={
                    parseFloat(item.changePercent) >= 0
                      ? "text-chart-3 font-medium"
                      : "text-destructive font-medium"
                  }
                  data-testid={`ticker-change-${item.symbol.toLowerCase().replace("/", "-")}`}
                >
                  {parseFloat(item.changePercent) > 0 ? "+" : ""}
                  {item.changePercent}%
                </span>
              </div>
            </div>
            <div className="text-muted-foreground">|</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">DEPTH</span>
              <span className="text-accent font-semibold">{item.depth}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">SPREAD</span>
              <span className="text-accent font-semibold">{item.spread}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">VOL</span>
              <span className="text-foreground font-semibold">{item.volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
