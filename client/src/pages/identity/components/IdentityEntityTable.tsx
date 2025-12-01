import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Entity {
  id: string;
  name: string;
  type: string;
  address?: string;
  balance?: string;
  lastActivity?: string;
  riskScore?: number;
  labels?: string[];
}

interface IdentityEntityTableProps {
  title: string;
  entities: Entity[];
  showRiskScore?: boolean;
}

export function IdentityEntityTable({ title, entities, showRiskScore = true }: IdentityEntityTableProps) {
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-500';
    if (score < 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getRiskBadge = (score: number) => {
    if (score < 30) return 'default';
    if (score < 60) return 'secondary';
    return 'destructive';
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card className="bg-card border-border" data-testid="table-identity-entities">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Entity</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Address</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground">Balance</th>
                {showRiskScore && (
                  <th className="text-center py-2 px-4 font-medium text-muted-foreground">Risk</th>
                )}
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Labels</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((entity) => (
                <tr 
                  key={entity.id} 
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  data-testid={`row-entity-${entity.id}`}
                >
                  <td className="py-2.5 px-4 font-medium">{entity.name}</td>
                  <td className="py-2.5 px-4 text-muted-foreground">{entity.type}</td>
                  <td className="py-2.5 px-4 font-mono text-[11px] text-primary">
                    {entity.address ? truncateAddress(entity.address) : '-'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">{entity.balance || '-'}</td>
                  {showRiskScore && (
                    <td className="py-2.5 px-4 text-center">
                      {entity.riskScore !== undefined && (
                        <Badge 
                          variant={getRiskBadge(entity.riskScore)}
                          className="text-[10px] min-w-[40px]"
                        >
                          {entity.riskScore}/100
                        </Badge>
                      )}
                    </td>
                  )}
                  <td className="py-2.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {entity.labels?.slice(0, 3).map((label, i) => (
                        <Badge 
                          key={i} 
                          variant="outline" 
                          className="text-[9px] px-1.5 py-0"
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
