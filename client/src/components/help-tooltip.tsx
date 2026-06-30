import { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";
import { HELP_TOOLTIPS } from "@shared/help-content";

// ─── HelpTooltip ─────────────────────────────────────────────────────────────
// Reusable ? icon that shows a contextual popover from the central help config.
//
// Usage:
//   <HelpTooltip helpKey="l5f-composite" />
//   <HelpTooltip helpKey="poli-score" side="left" />

interface HelpTooltipProps {
  helpKey: string;
  side?: "top" | "right" | "bottom" | "left";
  size?: number;
}

const MONO: React.CSSProperties = { fontFamily: "JetBrains Mono, monospace" };
const COL = {
  bg: "#0B1019", border: "#1A2435", accent: "#00BFA5",
  text: "#D8DEE8", sub: "#7B8EA3", dim: "#4A5B6E", amber: "#FFB300",
};

export function HelpTooltip({ helpKey, side = "top", size = 12 }: HelpTooltipProps) {
  const content = HELP_TOOLTIPS[helpKey];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!content) return null;

  const posStyle: React.CSSProperties =
    side === "top"    ? { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" } :
    side === "bottom" ? { top:    "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" } :
    side === "right"  ? { left:   "calc(100% + 6px)", top: "50%",  transform: "translateY(-50%)" } :
                        { right:  "calc(100% + 6px)", top: "50%",  transform: "translateY(-50%)" };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Help: ${content.title}`}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          color: open ? COL.accent : COL.dim, display: "flex", alignItems: "center",
          transition: "color 0.15s",
        }}
        onMouseEnter={() => setOpen(true)}
      >
        <HelpCircle size={size} strokeWidth={1.8} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", ...posStyle,
            width: 260, zIndex: 9999,
            background: COL.bg, border: `1px solid ${COL.border}`,
            borderRadius: 2, padding: "10px 12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            animation: "help-tooltip-in 0.12s ease-out",
          }}
        >
          <div style={{ ...MONO, fontSize: 10, fontWeight: 700, color: COL.accent, letterSpacing: "0.10em", textTransform: "uppercase", marginBottom: 6 }}>
            {content.title}
          </div>
          <p style={{ ...MONO, fontSize: 10, color: COL.text, lineHeight: 1.7, margin: 0, marginBottom: content.thresholds ? 8 : 0 }}>
            {content.text}
          </p>
          {content.thresholds && (
            <div style={{ ...MONO, fontSize: 9, color: COL.amber, lineHeight: 1.6, borderTop: `1px solid ${COL.border}`, paddingTop: 6, marginTop: 6 }}>
              {content.thresholds}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes help-tooltip-in {
          from { opacity: 0; transform: scale(0.95) ${side === "top" ? "translateX(-50%)" : side === "bottom" ? "translateX(-50%)" : "translateY(-50%)"}; }
          to   { opacity: 1; transform: scale(1)    ${side === "top" ? "translateX(-50%)" : side === "bottom" ? "translateX(-50%)" : "translateY(-50%)"}; }
        }
      `}</style>
    </div>
  );
}
