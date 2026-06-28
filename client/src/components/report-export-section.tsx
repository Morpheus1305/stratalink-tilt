import { Card } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function ReportExportSection() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    toast({
      title: "Report Generation Started",
      description: "Your Proof-of-Liquidity Intelligence Report is being generated...",
    });
    await new Promise((r) => setTimeout(r, 1200));
    setGenerating(false);
  };

  return (
    <Card className="p-4 border-card-border" data-testid="card-report-export">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold mb-1">Proof-of-Liquidity Intelligence Report</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            Generate a comprehensive liquidity risk assessment report compliant with AQAP and FCX regulatory standards.
            Includes live metrics, stress signals, and historical trend data.
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="font-mono">LAST GENERATED</span>
            <span>•</span>
            <span className="font-mono">NOV 20, 2025</span>
            <span>•</span>
            <span className="font-mono">FILE SIZE: ~243KB</span>
          </div>
          <button
            onClick={handleExport}
            disabled={generating}
            data-testid="button-export-report"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "var(--tilt-panel, #0F151F)",
              border: "1px solid var(--tilt-border, #1A2435)",
              borderRadius: 2,
              padding: "4px 10px",
              cursor: generating ? "wait" : "pointer",
              fontFamily: "var(--tilt-mono, monospace)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "var(--tilt-green, #00E676)",
              whiteSpace: "nowrap",
              transition: "border-color 0.15s",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!generating)
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--tilt-accent, #00BFA5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--tilt-border, #1A2435)";
            }}
          >
            {generating ? (
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <Download size={11} />
            )}
            {generating ? "GENERATING…" : "EXPORT PDF REPORT"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Card>
  );
}
