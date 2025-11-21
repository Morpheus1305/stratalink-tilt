import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ReportExportSection() {
  const { toast } = useToast();

  const handleExport = () => {
    toast({
      title: "Report Generation Started",
      description: "Your Proof-of-Liquidity Intelligence Report is being generated...",
    });
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
          <Button 
            size="sm"
            onClick={handleExport}
            data-testid="button-export-report"
          >
            <Download className="mr-2 h-3 w-3" />
            EXPORT PDF REPORT
          </Button>
        </div>
      </div>
    </Card>
  );
}
