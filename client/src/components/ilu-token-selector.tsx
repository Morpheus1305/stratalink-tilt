import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import { ILU_CATEGORIES, type ILUToken } from "../../../shared/ilu-universe";
import { useToken } from "@/contexts/TokenContext";

const C = {
  bg:        "#0F151F",
  border:    "#1A2435",
  borderHov: "#00BFA5",
  text:      "#D8DEE8",
  sub:       "#7B8EA3",
  muted:     "#4A5B6E",
  accent:    "#00BFA5",
  catBg:     "#080D14",
  rowHov:    "#131D2B",
  selBg:     "rgba(0,191,165,0.08)",
  dotLive:   "#00E676",
  dotLoad:   "#F59E0B",
  dotOff:    "#EF4444",
};

const TOKEN_LOGOS: Record<string, string> = {
  BTC:  "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH:  "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  USDT: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  USDe: "https://assets.coingecko.com/coins/images/33613/small/usde.png",
  DAI:  "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
  BNB:  "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  HYPE: "https://assets.coingecko.com/coins/images/50533/small/hyperliquid.jpg",
  OKB:  "https://assets.coingecko.com/coins/images/4463/small/WeChat_Image_20220118095654.png",
  CRO:  "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  MKR:  "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png",
  AAVE: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
  UNI:  "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
  SOL:  "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP:  "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  TON:  "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png",
  ADA:  "https://assets.coingecko.com/coins/images/975/small/cardano.png",
};

function TokenLogo({ symbol, size = 20 }: { symbol: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const src = TOKEN_LOGOS[symbol];

  if (!src || errored) {
    return (
      <span style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#1A2435",
        fontFamily: "var(--tilt-mono, monospace)",
        fontSize: size * 0.42,
        fontWeight: 700,
        color: C.accent,
        flexShrink: 0,
      }}>
        {symbol.charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setErrored(true)}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        flexShrink: 0,
        background: "#1A2435",
      }}
    />
  );
}

type LiveState = true | false | null;
type LiveMap = Record<string, LiveState>;

async function checkLive(symbol: string): Promise<boolean> {
  try {
    const r = await fetch(`/api/analytics/l5f/snapshot/${symbol}`);
    const d = await r.json();
    return !!(d.ok && d.aggregate && d.aggregate.total_depth_10bps > 0);
  } catch {
    return false;
  }
}

function StatusDot({ state }: { state: LiveState }) {
  const color =
    state === null  ? C.dotLoad :
    state === true  ? C.dotLive :
                      C.dotOff;
  const label =
    state === null  ? "LOADING" :
    state === true  ? "LIVE"    :
                      "OFF";

  return (
    <span style={{
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "var(--tilt-mono, monospace)",
      fontSize: 10,
      color,
      whiteSpace: "nowrap",
      minWidth: 52,
      justifyContent: "flex-end",
    }}>
      <span style={{
        display: "inline-block",
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        boxShadow: state === true ? `0 0 5px ${C.dotLive}80` : "none",
      }} />
      {label}
    </span>
  );
}

export function ILUTokenSelector() {
  const { selectedToken, setSelectedToken } = useToken();
  const [open, setOpen]       = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [liveMap, setLiveMap] = useState<LiveMap>({});
  const [hovBorder, setHovBorder] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    const symbols = ILU_CATEGORIES.flatMap(c => c.tokens.map(t => t.symbol));
    const initial: LiveMap = {};
    symbols.forEach(s => { initial[s] = null; });
    setLiveMap(initial);
    symbols.forEach(sym => {
      checkLive(sym).then(isLive => {
        setLiveMap(prev => ({ ...prev, [sym]: isLive }));
      });
    });
  }, [open]);

  function select(token: ILUToken) {
    setSelectedToken(token);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      {/* Trigger */}
      <div
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovBorder(true)}
        onMouseLeave={() => setHovBorder(false)}
        data-testid="ilu-token-selector-trigger"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 10px",
          background: C.bg,
          border: `1px solid ${hovBorder || open ? C.borderHov : C.border}`,
          borderRadius: 2,
          cursor: "pointer",
          userSelect: "none",
          transition: "border-color 0.15s",
          minWidth: 200,
        }}
      >
        <TokenLogo symbol={selectedToken.symbol} size={18} />
        <span style={{ fontFamily: "var(--tilt-mono, monospace)", fontSize: 12, fontWeight: 700, color: C.text }}>
          {selectedToken.symbol}
        </span>
        <span style={{ fontFamily: "sans-serif", fontSize: 12, color: C.sub }}>
          {selectedToken.name}
        </span>
        <span style={{ color: C.muted, fontSize: 11, margin: "0 2px" }}>·</span>
        <span style={{ fontFamily: "var(--tilt-mono, monospace)", fontSize: 9, color: C.muted, letterSpacing: "0.06em" }}>
          {selectedToken.categoryLabel}
        </span>
        <ChevronDown
          size={12}
          style={{
            marginLeft: "auto",
            color: C.muted,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.15s",
            flexShrink: 0,
          }}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="ilu-dropdown-scroll"
          style={{
            position: "fixed",
            zIndex: 99999,
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 2,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            maxHeight: "calc(100vh - 120px)",
            overflowY: "scroll",
            width: 340,
            top: ref.current
              ? ref.current.getBoundingClientRect().bottom + 4
              : 60,
            right: ref.current
              ? window.innerWidth - ref.current.getBoundingClientRect().right
              : 16,
          }}
          data-testid="ilu-token-selector-dropdown"
        >
          {ILU_CATEGORIES.map(cat => (
            <div key={cat.id}>
              <div style={{
                background: C.catBg,
                padding: "7px 14px",
                fontFamily: "var(--tilt-mono, monospace)",
                fontSize: 9,
                color: C.accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderTop: `1px solid ${C.border}`,
              }}>
                {cat.label}
              </div>

              {cat.tokens.map(token => {
                const isSelected = token.symbol === selectedToken.symbol;
                const isHov      = hovered === token.symbol;
                const liveState  = liveMap[token.symbol] ?? null;

                return (
                  <div
                    key={token.symbol}
                    onClick={() => select(token)}
                    onMouseEnter={() => setHovered(token.symbol)}
                    onMouseLeave={() => setHovered(null)}
                    data-testid={`ilu-token-option-${token.symbol}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 14px",
                      cursor: "pointer",
                      background: isSelected ? C.selBg : isHov ? C.rowHov : "transparent",
                      borderLeft: isSelected ? `2px solid ${C.accent}` : "2px solid transparent",
                    }}
                  >
                    <TokenLogo symbol={token.symbol} size={22} />
                    <span style={{
                      fontFamily: "var(--tilt-mono, monospace)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: C.text,
                      minWidth: 38,
                    }}>
                      {token.symbol}
                    </span>
                    <span style={{
                      fontFamily: "sans-serif",
                      fontSize: 12,
                      color: C.sub,
                      flex: 1,
                    }}>
                      {token.name}
                    </span>
                    <StatusDot state={liveState} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
