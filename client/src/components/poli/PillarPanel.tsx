import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { PillarData, RagStatus, VerifyState } from "@shared/poli";
import MetricRow from "./MetricRow";

interface Props {
  title: string;
  pillarKey: string;
  data: PillarData;
}

function getRagClasses(rag: RagStatus): string {
  switch (rag) {
    case 'GREEN': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'AMBER': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'ORANGE': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'RED': return 'bg-red-500/20 text-red-400 border-red-500/30';
  }
}

function getStateClasses(state: VerifyState): string {
  switch (state) {
    case 'VALID':
    case 'PASS':
      return 'bg-green-500/20 text-green-400';
    case 'WARNING':
      return 'bg-amber-500/20 text-amber-400';
    case 'INVALID':
    case 'FAIL':
      return 'bg-red-500/20 text-red-400';
  }
}

export default function PillarPanel({ title, pillarKey, data }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card 
      className="cursor-pointer hover-elevate transition-all"
      data-testid={`pillar-panel-${pillarKey}`}
    >
      <CardHeader 
        className="flex flex-row items-center justify-between gap-2 pb-2"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge className={getRagClasses(data.rag)}>
            {data.score.toFixed(1)}
          </Badge>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{data.summary}</p>
        
        {expanded && (
          <div className="space-y-4 pt-3 border-t border-border">
            {Object.entries(data.inputs).map(([inputKey, inputData]) => (
              <div 
                key={inputKey} 
                className="bg-muted/30 rounded-md p-3"
                data-testid={`input-${pillarKey}-${inputKey}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-xs">
                    {inputKey.toUpperCase()}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{inputData.score.toFixed(1)}</span>
                    <Badge className={getStateClasses(inputData.state)}>
                      {inputData.state}
                    </Badge>
                  </div>
                </div>

                {inputData.highlights && inputData.highlights.length > 0 && (
                  <ul className="text-xs text-muted-foreground mb-2 space-y-1">
                    {inputData.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <span className="text-primary">-</span> {h}
                      </li>
                    ))}
                  </ul>
                )}

                {inputData.metrics && inputData.metrics.length > 0 && (
                  <div className="mt-2">
                    {inputData.metrics.map(m => (
                      <MetricRow key={m.key} metric={m} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
