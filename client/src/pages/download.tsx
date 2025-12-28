import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileArchive, Check } from "lucide-react";

const files = [
  "shared/liquidity-truth.ts",
  "shared/venue-config.ts", 
  "server/services/tsle-buffer.ts",
  "server/services/divergence-detector.ts",
  "server/services/alert-service.ts",
  "server/routes/lis.ts",
  "server/routes/alerts.ts",
  "server/tests/lis-state-invariants.ts",
  "client/src/components/tsle-chart.tsx",
  "replit.md"
];

export default function DownloadPage() {
  const handleDownload = () => {
    window.location.href = "/download/LTC-v1.0.zip";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileArchive className="h-6 w-6 text-primary" />
              LTC v1.0 Code Archive
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Liquidity Truth Console v1.0 - Canonical Liquidity State implementation with 
              unified LiquidityState object and price-independent invariants.
            </p>
            
            <Button 
              onClick={handleDownload} 
              size="lg" 
              className="w-full"
              data-testid="button-download-ltc"
            >
              <Download className="mr-2 h-5 w-5" />
              Download LTC-v1.0.zip (43 KB)
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">Included Files:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {files.map((file) => (
                  <li key={file} className="flex items-center gap-2">
                    <Check className="h-3 w-3 text-green-500" />
                    <code className="font-mono">{file}</code>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
