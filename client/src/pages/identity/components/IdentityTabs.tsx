import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  LayoutGrid, 
  GitBranch, 
  Shield, 
  Zap, 
  AlertTriangle, 
  Eye 
} from "lucide-react";

const identityTabs = [
  { path: '/identity', label: 'Overview', icon: LayoutGrid },
  { path: '/identity/liquidity-fragmentation', label: 'Liquidity Fragmentation', icon: GitBranch },
  { path: '/identity/mm-integrity', label: 'MM Integrity', icon: Shield },
  { path: '/identity/poli-plus', label: 'PoLi+', icon: Zap },
  { path: '/identity/identity-alerts', label: 'Identity Alerts', icon: AlertTriangle },
  { path: '/identity/reg-surveillance', label: 'Reg Surveillance', icon: Eye },
];

export function IdentityTabs() {
  const [location] = useLocation();

  return (
    <div className="border-b border-border bg-muted/30 px-4">
      <div className="flex items-center gap-1 py-1">
        {identityTabs.map((tab) => {
          const isActive = location === tab.path;
          const Icon = tab.icon;
          
          return (
            <Link key={tab.path} href={tab.path}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                size="sm"
                className={`text-xs font-medium h-8 ${
                  isActive ? 'bg-primary/10 text-primary border border-primary/20' : ''
                }`}
                data-testid={`tab-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {tab.label.toUpperCase()}
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
