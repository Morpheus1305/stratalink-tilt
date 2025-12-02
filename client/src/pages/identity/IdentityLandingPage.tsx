import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/components/dashboard-header";
import { DateTimeBar } from "@/components/date-time-bar";
import { BottomTicker } from "@/components/bottom-ticker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IdentityTabs } from "./components/IdentityTabs";
import { IdentityMetricCard } from "./components/IdentityMetricCard";
import { IdentityEntityTable } from "./components/IdentityEntityTable";
import { Link } from "wouter";
import { 
  GitBranch, 
  Shield, 
  Zap, 
  AlertTriangle, 
  Eye,
  ArrowRight,
  Fingerprint,
  Activity
} from "lucide-react";

const defaultTickerItems = [
  { id: '1', symbol: 'BTC/USD', price: '97842.50', change: 2.34, changePercent: '2.34', depth: '$42.8M', spread: '0.02%', volume: '$1.2B', timestamp: new Date().toISOString() },
  { id: '2', symbol: 'ETH/USD', price: '3654.80', change: 1.89, changePercent: '1.89', depth: '$28.2M', spread: '0.03%', volume: '$892M', timestamp: new Date().toISOString() },
  { id: '3', symbol: 'SOL/USD', price: '242.15', change: -0.78, changePercent: '-0.78', depth: '$15.1M', spread: '0.04%', volume: '$456M', timestamp: new Date().toISOString() },
];

interface ArkhamEntity {
  id: string;
  name: string;
  type: string;
  address?: string;
  balance?: string;
  lastActivity?: string;
  riskScore?: number;
  labels?: string[];
}

interface IdentityAlert {
  id: string;
  timestamp: string;
  entityName: string;
  alertType: string;
  severity: string;
  description: string;
  status: string;
}

interface SurveillanceSnapshot {
  totalEntitiesMonitored: number;
  highRiskEntities: number;
  sanctionedAddresses: number;
  pendingInvestigations: number;
  complianceScore: number;
}

export default function IdentityLandingPage() {
  const { data: entities, isLoading: entitiesLoading } = useQuery<ArkhamEntity[]>({
    queryKey: ['/api/identity/entity', 'BTC'],
    queryFn: async () => {
      const response = await fetch('/api/identity/entity/BTC');
      if (!response.ok) throw new Error('Failed to fetch entities');
      return response.json();
    },
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<IdentityAlert[]>({
    queryKey: ['/api/identity/alerts'],
    queryFn: async () => {
      const response = await fetch('/api/identity/alerts');
      if (!response.ok) throw new Error('Failed to fetch alerts');
      return response.json();
    },
  });

  const { data: surveillance, isLoading: surveillanceLoading } = useQuery<SurveillanceSnapshot>({
    queryKey: ['/api/identity/surveillance'],
    queryFn: async () => {
      const response = await fetch('/api/identity/surveillance');
      if (!response.ok) throw new Error('Failed to fetch surveillance');
      return response.json();
    },
  });

  const isLoading = entitiesLoading || alertsLoading || surveillanceLoading;

  const moduleCards = [
    {
      title: 'Liquidity Fragmentation',
      description: 'Analyze how liquidity is distributed across exchanges and venues',
      icon: GitBranch,
      path: '/identity/liquidity-fragmentation',
      color: 'text-primary',
    },
    {
      title: 'MM Integrity',
      description: 'Assess market maker behavior and trading pattern integrity',
      icon: Shield,
      path: '/identity/mm-integrity',
      color: 'text-cyan-400',
    },
    {
      title: 'PoLi+',
      description: 'Enhanced liquidity metrics with Arkham entity intelligence',
      icon: Zap,
      path: '/identity/poli-plus',
      color: 'text-green-400',
    },
    {
      title: 'Identity Alerts',
      description: 'Real-time alerts on entity activity and unusual patterns',
      icon: AlertTriangle,
      path: '/identity/identity-alerts',
      color: 'text-yellow-400',
    },
    {
      title: 'Reg Surveillance',
      description: 'Regulatory compliance monitoring and sanctioned address tracking',
      icon: Eye,
      path: '/identity/reg-surveillance',
      color: 'text-purple-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <DashboardHeader />
        <IdentityTabs />
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[72px]">
      <DashboardHeader />
      <IdentityTabs />
      <DateTimeBar />

      <div className="flex-1 p-4 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Fingerprint className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold">STRATALINK × ARKHAM IDENTITY INTELLIGENCE</h1>
            <p className="text-xs text-muted-foreground">
              On-chain entity attribution powered by Arkham Intelligence
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Activity className="h-4 w-4 text-green-500 animate-pulse" />
            <span className="text-xs font-mono text-green-500">CONNECTED</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <IdentityMetricCard
            title="Entities Monitored"
            value={surveillance?.totalEntitiesMonitored?.toLocaleString() || '0'}
            status="GOOD"
            source="Arkham Intel"
          />
          <IdentityMetricCard
            title="High Risk Entities"
            value={surveillance?.highRiskEntities || 0}
            status={surveillance?.highRiskEntities && surveillance.highRiskEntities > 300 ? 'CRITICAL' : 'CAUTION'}
            source="Risk Engine"
          />
          <IdentityMetricCard
            title="Sanctioned Addresses"
            value={surveillance?.sanctionedAddresses?.toLocaleString() || '0'}
            status="CAUTION"
            source="OFAC + EU Lists"
          />
          <IdentityMetricCard
            title="Compliance Score"
            value={`${surveillance?.complianceScore || 0}/100`}
            status={surveillance?.complianceScore && surveillance.complianceScore > 90 ? 'GOOD' : 'CAUTION'}
            source="Aggregated"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {moduleCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.path} href={card.path}>
                <Card 
                  className="bg-card border-border hover:border-primary/50 transition-all cursor-pointer group h-full"
                  data-testid={`card-module-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardContent className="p-4">
                    <Icon className={`h-8 w-8 ${card.color} mb-3`} />
                    <h3 className="font-semibold text-sm mb-1">{card.title}</h3>
                    <p className="text-[11px] text-muted-foreground mb-3">{card.description}</p>
                    <div className="flex items-center text-xs text-primary group-hover:translate-x-1 transition-transform">
                      <span>Explore</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {entities && (
            <IdentityEntityTable
              title="TOP TRACKED ENTITIES"
              entities={entities.slice(0, 5)}
            />
          )}

          <Card className="bg-card border-border" data-testid="card-recent-alerts">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">RECENT IDENTITY ALERTS</CardTitle>
                <Link href="/identity/identity-alerts">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="space-y-2">
                {alerts?.slice(0, 5).map((alert) => (
                  <div 
                    key={alert.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={
                          alert.severity === 'CRITICAL' ? 'destructive' : 
                          alert.severity === 'HIGH' ? 'destructive' : 
                          alert.severity === 'MEDIUM' ? 'secondary' : 'outline'
                        }
                        className="text-[10px] w-16 justify-center"
                      >
                        {alert.severity}
                      </Badge>
                      <div>
                        <div className="text-xs font-medium">{alert.entityName}</div>
                        <div className="text-[10px] text-muted-foreground">{alert.alertType}</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomTicker items={defaultTickerItems} />
    </div>
  );
}
