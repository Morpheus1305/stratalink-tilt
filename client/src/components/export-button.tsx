import { useState, useRef, useEffect } from "react";
import { Download, Loader2 } from "lucide-react";

export interface ExportOption {
  label: string;
  format?: "PDF" | "JSON" | "CSV";
  onGenerate: () => Promise<void>;
}

interface ExportButtonProps {
  options: ExportOption[];
  className?: string;
}

export function ExportButton({ options, className = "" }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOption = async (idx: number) => {
    setGenerating(idx);
    setOpen(false);
    try {
      await options[idx].onGenerate();
    } finally {
      setGenerating(null);
    }
  };

  const isGenerating = generating !== null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        data-testid="button-export"
        onClick={() => !isGenerating && setOpen((o) => !o)}
        className={className}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "var(--tilt-panel, #0F151F)",
          border: `1px solid ${open ? "var(--tilt-accent, #00BFA5)" : "var(--tilt-border, #1A2435)"}`,
          borderRadius: 2,
          padding: "4px 8px",
          cursor: isGenerating ? "wait" : "pointer",
          fontFamily: "var(--tilt-mono, monospace)",
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "var(--tilt-sub, #7B8EA3)",
          whiteSpace: "nowrap",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!open && !isGenerating)
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--tilt-accent, #00BFA5)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--tilt-border, #1A2435)";
        }}
      >
        {isGenerating ? (
          <Loader2
            size={11}
            style={{ color: "var(--tilt-accent, #00BFA5)", animation: "spin 1s linear infinite" }}
          />
        ) : (
          <Download size={11} />
        )}
        {isGenerating ? "GENERATING…" : "EXPORT"}
      </button>

      {open && (
        <div
          data-testid="export-dropdown"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 220,
            background: "var(--tilt-panel, #0F151F)",
            border: "1px solid var(--tilt-border, #1A2435)",
            borderRadius: 2,
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {options.map((opt, i) => (
            <button
              key={i}
              data-testid={`export-option-${i}`}
              onClick={() => handleOption(i)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "7px 10px",
                background: "transparent",
                border: "none",
                borderBottom: i < options.length - 1 ? "1px solid var(--tilt-border, #1A2435)" : "none",
                cursor: "pointer",
                fontFamily: "var(--tilt-mono, monospace)",
                fontSize: 10,
                color: "var(--tilt-text, #D8DEE8)",
                textAlign: "left",
                gap: 8,
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "rgba(0,191,165,0.07)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              <span>{opt.label}</span>
              {opt.format && (
                <span
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: "var(--tilt-accent, #00BFA5)",
                    background: "rgba(0,191,165,0.10)",
                    border: "1px solid rgba(0,191,165,0.25)",
                    borderRadius: 2,
                    padding: "1px 4px",
                  }}
                >
                  {opt.format}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
