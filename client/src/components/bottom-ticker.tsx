import { useState } from "react";
import type { TickerItem } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

// ── ILU-19 category membership ───────────────────────────────────────────────
const ILU_CATEGORIES: Record<string, { label: string; color: string }> = {
  BTC:  { label: "RESERVE",    color: "#f5c842" },
  ETH:  { label: "RESERVE",    color: "#f5c842" },
  USDT: { label: "STABLECOIN", color: "#26d5b8" },
  USDC: { label: "STABLECOIN", color: "#26d5b8" },
  USDE: { label: "STABLECOIN", color: "#26d5b8" },
  DAI:  { label: "STABLECOIN", color: "#26d5b8" },
  BNB:  { label: "EXCHANGE",   color: "#a78bfa" },
  HYPE: { label: "EXCHANGE",   color: "#a78bfa" },
  OKB:  { label: "EXCHANGE",   color: "#a78bfa" },
  CRO:  { label: "EXCHANGE",   color: "#a78bfa" },
  LINK: { label: "DEFI",       color: "#60a5fa" },
  MKR:  { label: "DEFI",       color: "#60a5fa" },
  AAVE: { label: "DEFI",       color: "#60a5fa" },
  UNI:  { label: "DEFI",       color: "#60a5fa" },
  SOL:  { label: "LIQUIDITY",  color: "#34d399" },
  XRP:  { label: "LIQUIDITY",  color: "#34d399" },
  DOGE: { label: "LIQUIDITY",  color: "#34d399" },
  TON:  { label: "LIQUIDITY",  color: "#34d399" },
  ADA:  { label: "LIQUIDITY",  color: "#34d399" },
};

// ── Token logo CDN (spothq open-source set on jsDelivr) ──────────────────────
const ICON_CDN = "https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/32/color";

// Tokens whose spothq filename differs from the ticker symbol, or are missing.
// Set to null to skip CDN and go straight to letter-badge fallback.
const ICON_OVERRIDES: Record<string, string | null> = {
  USDE: null,   // Ethena USDe  -  not in spothq set
  HYPE: null,   // Hyperliquid  -  not in spothq set
  OKB:  null,   // OKB  -  not in spothq set
  CRO:  "cro",  // Cronos
  BNB:  "bnb",
  TON:  "ton",
  MKR:  "mkr",
  AAVE: "aave",
  UNI:  "uni",
};

function getIconUrl(rawSymbol: string): string | null {
  const sym = rawSymbol.replace(/\/.*$/, "").toUpperCase();
  if (sym in ICON_OVERRIDES) {
    const override = ICON_OVERRIDES[sym];
    if (override === null) return null;
    return `${ICON_CDN}/${override}.png`;
  }
  return `${ICON_CDN}/${sym.toLowerCase()}.png`;
}

// ── Letter-badge fallback ─────────────────────────────────────────────────────
function SymbolBadge({ sym, color }: { sym: string; color: string }) {
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
        background: color,
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
  const sym = symbol.replace(/\/.*$/, "").toUpperCase();
  const cat = ILU_CATEGORIES[sym];
  const color = cat?.color ?? "#888";
  const iconUrl = getIconUrl(symbol);

  if (!iconUrl || failed) return <SymbolBadge sym={symbol} color={color} />;

  return (
    <img
      src={iconUrl}
      alt={symbol}
      width={18}
      height={18}
      style={{ borderRadius: "50%", flexShrink: 0 }}
      onError={() => setFailed(true)}
      loading="eager"
    />
  );
}

// ── Category separator element ────────────────────────────────────────────────
function CategorySep({ label, color }: { label: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        padding: "0 6px",
      }}
    >
      <div style={{ width: 18, height: 1, background: color, opacity: 0.5 }} />
      <span
        style={{
          fontFamily: "monospace",
          fontSize: 8,
          letterSpacing: "0.12em",
          fontWeight: 700,
          color,
          opacity: 0.75,
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        ILU · {label}
      </span>
      <div style={{ width: 18, height: 1, background: color, opacity: 0.5 }} />
    </div>
  );
}

// ── Build enriched render list (tokens + category separators) ─────────────────
type RenderEntry =
  | { kind: "token"; item: TickerItem; key: string }
  | { kind: "sep"; label: string; color: string; key: string };

function buildRenderList(items: TickerItem[], pass: number): RenderEntry[] {
  const list: RenderEntry[] = [];
  let lastCat: string | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const sym = item.symbol.replace(/\/.*$/, "").toUpperCase();
    const cat = ILU_CATEGORIES[sym];
    const catLabel = cat?.label ?? "OTHER";
    const catColor = cat?.color ?? "#888";

    if (catLabel !== lastCat) {
      list.push({ kind: "sep", label: catLabel, color: catColor, key: `sep-${catLabel}-${pass}-${i}` });
      lastCat = catLabel;
    }
    list.push({ kind: "token", item, key: `${item.symbol}-${pass}-${i}` });
  }
  return list;
}

// ── Main component ────────────────────────────────────────────────────────────
interface BottomTickerProps {
  items: TickerItem[];
}

export function BottomTicker({ items }: BottomTickerProps) {
  // Build two passes (duplicate) for seamless infinite scroll
  const renderList: RenderEntry[] = [
    ...buildRenderList(items, 0),
    ...buildRenderList(items, 1),
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border h-10 flex items-center overflow-hidden bg-card"
      data-testid="bottom-ticker"
    >
      <div className="flex items-center gap-5 px-4 whitespace-nowrap ticker-scroll">
        {renderList.map((entry) => {
          if (entry.kind === "sep") {
            return <CategorySep key={entry.key} label={entry.label} color={entry.color} />;
          }

          const { item } = entry;
          const chg = parseFloat(item.changePercent);
          const positive = chg >= 0;

          return (
            <div
              key={entry.key}
              className="flex items-center gap-5 font-mono text-xs"
              data-testid={`ticker-item-${item.symbol.toLowerCase().replace("/", "-")}-0`}
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
                  {positive ? (
                    <TrendingUp className="h-3 w-3 text-chart-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-destructive" />
                  )}
                  <span
                    className={positive ? "text-chart-3 font-medium" : "text-destructive font-medium"}
                    data-testid={`ticker-change-${item.symbol.toLowerCase().replace("/", "-")}`}
                  >
                    {chg > 0 ? "+" : ""}{item.changePercent}%
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
          );
        })}
      </div>
    </div>
  );
}
