import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface IdentityMetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  status?: 'GOOD' | 'CAUTION' | 'CRITICAL';
  source?: string;
  benchmark?: string;
}

export function IdentityMetricCard({ 
  title, 
  value, 
  change, 
  status, 
  source,
  benchmark 
}: IdentityMetricCardProps) {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'GOOD': return 'text-green-500';
      case 'CAUTION': return 'text-yellow-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadgeVariant = (status?: string) => {
    switch (status) {
      case 'GOOD': return 'default';
      case 'CAUTION': return 'secondary';
      case 'CRITICAL': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card className="bg-card border-border" data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {status && (
            <Badge variant={getStatusBadgeVariant(status)} className="text-[10px]">
              {status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className={`text-xl font-bold font-mono ${getStatusColor(status)}`}>
              {value}
            </div>
            {benchmark && (
              <div className="text-[10px] text-muted-foreground">
                Benchmark: {benchmark}
              </div>
            )}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-mono ${
              change > 0 ? 'text-green-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
            }`}>
              {change > 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : change < 0 ? (
                <TrendingDown className="h-3 w-3" />
              ) : (
                <Minus className="h-3 w-3" />
              )}
              <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
            </div>
          )}
        </div>
        {source && (
          <div className="mt-2 text-[10px] text-muted-foreground/70 border-t border-border pt-2">
            Source: {source}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
