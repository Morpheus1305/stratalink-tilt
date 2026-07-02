import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, TrendingUp } from "lucide-react";
import type { LiquidityScore } from "@shared/schema";
import { getPoLiRating } from "@/lib/poli-rating";
import { TT } from "@/components/tilt-tooltip";

interface LiquidityScoreGaugeProps {
  scoreData: LiquidityScore;
}

export function LiquidityScoreGauge({ scoreData }: LiquidityScoreGaugeProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-chart-3';
      case 'medium':
        return 'text-primary';
      case 'high':
        return 'text-destructive';
      case 'critical':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const getRiskBg = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-chart-3/10 border-chart-3/20';
      case 'medium':
        return 'bg-primary/10 border-primary/20';
      case 'high':
        return 'bg-destructive/10 border-destructive/20';
      case 'critical':
        return 'bg-destructive/20 border-destructive/30';
      default:
        return 'bg-muted';
    }
  };

  const percentage = (scoreData.score / 100) * 100;

  return (
    <Card className="p-6 border-card-border" data-testid="card-liquidity-score">
      <div className="flex items-center justify-between mb-4">
        <TT title="PoLi Score" body="Proof of Liquidity composite score (0-100). Aggregated from the L5F 5-factor model across all active venues. Rating bands: AAA 90+, AA 80-89, A 70-79, BBB 60-69, BB 50-59, B 40-49, CCC 25-39, D below 25. Refreshes every 10 seconds.">
          <h3 className="text-sm font-semibold tracking-wide">POLI SCORE</h3>
        </TT>
        <div className="flex items-center gap-1 text-xs">
          {scoreData.trend === 'up' ? (
            <ArrowUp className="h-3 w-3 text-chart-3" />
          ) : (
            <ArrowDown className="h-3 w-3 text-destructive" />
          )}
          <span className={scoreData.trend === 'up' ? 'text-chart-3' : 'text-destructive'}>
            {scoreData.change24h > 0 ? '+' : ''}{scoreData.change24h.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-48 h-48">
          {/* Background circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="96"
              cy="96"
              r="88"
              fill="none"
              stroke={scoreData.riskLevel === 'low' ? 'hsl(var(--chart-3))' : scoreData.riskLevel === 'medium' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
              strokeWidth="8"
              strokeDasharray={`${percentage * 5.53} ${553 - percentage * 5.53}`}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-mono text-5xl font-bold" data-testid="text-score-value">
              {scoreData.score}
            </div>
            <div className="text-xs text-muted-foreground">/100</div>
            <TT title="Liquidity Rating (PoLi Letter Grade)" body="Letter grade derived from the PoLi numeric score. AAA = 90+ (institutional-grade). AA = 80-89. A = 70-79. BBB = 60-69 (investment-grade minimum). BB = 50-59 (sub-investment). B = 40-49. CCC = 25-39 (unreliable at scale). D = below 25 (emergency conditions).">
              <div className="mt-2 text-xs text-muted-foreground">
                Liquidity Rating: <span className="font-bold text-foreground" data-testid="text-poli-rating">{getPoLiRating(scoreData.score)}</span>
              </div>
            </TT>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${getRiskBg(scoreData.riskLevel)}`}>
          <TrendingUp className={`h-3 w-3 ${getRiskColor(scoreData.riskLevel)}`} />
          <span className={`text-xs font-semibold uppercase ${getRiskColor(scoreData.riskLevel)}`} data-testid="text-risk-level">
            {scoreData.riskLevel} RISK
          </span>
        </div>

        <div className="pt-3 border-t border-border space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <TT title="24H PoLi Change" body="How much the PoLi score has changed over the past 24 hours as a percentage. A declining PoLi score over 24 hours is a stronger signal than a single point-in-time reading.">
              <span className="text-muted-foreground">24H CHANGE</span>
            </TT>
            <span className="font-mono font-semibold">
              {scoreData.change24h > 0 ? '+' : ''}{scoreData.change24h.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <TT title="Historical Average" body="Average PoLi score over the past 30 days. Comparing current score to this baseline helps identify whether today's conditions are unusual or within normal range for this asset.">
              <span className="text-muted-foreground">HISTORICAL AVG</span>
            </TT>
            <span className="font-mono font-semibold">{scoreData.historicalAverage}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
