import type { PoLiPayload, PillarKey, RagStatus } from "@shared/poli";
import { PILLAR_LABELS } from "@shared/poli";

interface Props {
  pillars: PoLiPayload['pillars'];
}

function getRagBgClass(rag: RagStatus): string {
  switch (rag) {
    case 'GREEN': return 'bg-green-500';
    case 'AMBER': return 'bg-amber-500';
    case 'ORANGE': return 'bg-orange-500';
    case 'RED': return 'bg-red-500';
  }
}

function getRagDotClass(rag: RagStatus): string {
  switch (rag) {
    case 'GREEN': return 'bg-green-500 shadow-green-500/50';
    case 'AMBER': return 'bg-amber-500 shadow-amber-500/50';
    case 'ORANGE': return 'bg-orange-500 shadow-orange-500/50';
    case 'RED': return 'bg-red-500 shadow-red-500/50';
  }
}

export default function PillarSummaryBars({ pillars }: Props) {
  return (
    <div className="space-y-3" data-testid="pillar-summary-bars">
      {(Object.entries(pillars) as [PillarKey, typeof pillars[PillarKey]][])
        .filter(([, data]) => data !== undefined)
        .map(([key, data]) => {
          if (!data) return null;
          return (
            <div key={key} className="flex items-center gap-3" data-testid={`pillar-bar-${key}`}>
              <div className="w-40 text-sm text-muted-foreground truncate">
                {PILLAR_LABELS[key]}
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getRagBgClass(data.rag)}`}
                  style={{ width: `${data.score}%` }}
                />
              </div>
              <div className="w-12 text-right font-mono text-sm">
                {data.score.toFixed(1)}
              </div>
              <div 
                className={`w-2 h-2 rounded-full shadow-sm ${getRagDotClass(data.rag)}`}
              />
            </div>
          );
        })}
    </div>
  );
}
