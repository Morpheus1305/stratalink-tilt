import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle } from "lucide-react";
import type { PoLiPayload, RagStatus } from "@shared/poli";

interface Props {
  overall: PoLiPayload['overall'];
  meta: PoLiPayload['meta'];
}

function getRagClasses(rag: RagStatus): string {
  switch (rag) {
    case 'GREEN': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'AMBER': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'ORANGE': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'RED': return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function TrendIcon({ direction }: { direction: 'UP' | 'DOWN' | 'FLAT' }) {
  switch (direction) {
    case 'UP': return <TrendingUp className="h-4 w-4 text-green-400" />;
    case 'DOWN': return <TrendingDown className="h-4 w-4 text-red-400" />;
    case 'FLAT': return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function PoLiScorecard({ overall, meta }: Props) {
  const direction = overall.trend.delta_7d > 0 ? 'UP' : overall.trend.delta_7d < 0 ? 'DOWN' : 'FLAT';
  const trendColor = direction === 'UP' 
    ? 'text-green-400' 
    : direction === 'DOWN' 
      ? 'text-red-400' 
      : 'text-muted-foreground';

  return (
    <Card className="relative overflow-hidden" data-testid="poli-scorecard">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          PoLi Score
          <Badge className={getRagClasses(overall.rag)}>
            {overall.rag}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span 
            className="text-5xl font-bold font-mono tracking-tight"
            data-testid="poli-score-value"
          >
            {overall.score.toFixed(1)}
          </span>
          <span className="text-2xl text-muted-foreground">/100</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="font-normal">
            Confidence: {overall.confidence}
          </Badge>
          
          <div className="flex items-center gap-1">
            <TrendIcon direction={direction} />
            <span className={`font-mono text-sm ${trendColor}`}>
              {overall.trend.delta_7d > 0 ? '+' : ''}
              {overall.trend.delta_7d.toFixed(1)}% (7D)
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {overall.coverage.venues_observed.length >= overall.coverage.venues_expected.length ? (
              <CheckCircle className="h-4 w-4 text-green-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            )}
            <span className="text-muted-foreground">
              {overall.coverage.venues_observed.length}/{overall.coverage.venues_expected.length} venues
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Regimes:</span>
            <div className="flex gap-1">
              {overall.coverage.regimes_observed.map(regime => (
                <Badge key={regime} variant="outline" className="text-xs">
                  {regime}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <div className="pt-2 text-xs text-muted-foreground font-mono">
          VERIFY {meta.versions.verify} | PoLi {meta.versions.poli} | TSLE {meta.versions.tsle}
        </div>
      </CardContent>
    </Card>
  );
}
