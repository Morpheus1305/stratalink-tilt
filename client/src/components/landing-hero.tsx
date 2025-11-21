import { Button } from "@/components/ui/button";
import { ArrowRight, FileText } from "lucide-react";
import { Link } from "wouter";

export function LandingHero() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border h-14 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary flex items-center justify-center">
            <div className="text-primary font-bold text-sm">SL</div>
          </div>
          <span className="font-semibold text-sm tracking-tight">STRATALINK LABS</span>
        </div>
        <nav className="ml-auto flex items-center gap-6">
          <Link href="/platform" data-testid="link-platform">
            <span className="text-sm hover-elevate active-elevate-2 px-3 py-1.5 rounded-md cursor-pointer">
              PLATFORM
            </span>
          </Link>
          <Link href="/platform" data-testid="link-docs">
            <span className="text-sm hover-elevate active-elevate-2 px-3 py-1.5 rounded-md cursor-pointer">
              DOCS
            </span>
          </Link>
          <span className="text-sm text-muted-foreground px-3 py-1.5 cursor-pointer">
            DEMO MODE
          </span>
          <span className="text-sm hover-elevate active-elevate-2 px-3 py-1.5 rounded-md cursor-pointer">
            ABOUT
          </span>
          <span className="text-sm hover-elevate active-elevate-2 px-3 py-1.5 rounded-md cursor-pointer">
            HELP
          </span>
        </nav>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-between px-12 gap-16">
        {/* Left Side - Hero Content */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-full border-2 border-primary flex items-center justify-center">
              <div className="text-primary font-bold text-xl">S</div>
            </div>
            <div className="text-sm text-muted-foreground leading-tight">
              The Liquidity Truth Layer — powered by STRATA AI and PoLi.
            </div>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6 text-primary tracking-tight">
            THE INSTITUTIONAL
            <br />
            LIQUIDITY TERMINAL
          </h1>

          <p className="text-lg text-foreground mb-4 leading-relaxed max-w-xl">
            Real-time Liquidity Risk Intelligence for digital assets.
            <br />
            Built for regulators, exchanges, protocols, and institutional risk managers.
          </p>

          <ul className="space-y-2 mb-8 text-sm">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Comprehensive depth, spread & volatility analytics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Real-time CEX/DEX ratio & concentration risk metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Automated stress-signal detection & compliance reporting</span>
            </li>
          </ul>

          <div className="flex items-center gap-4">
            <Link href="/platform">
              <Button 
                size="lg" 
                className="font-semibold"
                data-testid="button-enter-platform"
              >
                ENTER PLATFORM
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="font-semibold"
              data-testid="button-documentation"
            >
              <FileText className="mr-2 h-4 w-4" />
              DOCUMENTATION
            </Button>
          </div>
        </div>

        {/* Right Side - Live Market Data */}
        <div className="flex-1 max-w-md">
          <div className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-primary">LIVE MARKET DATA</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-chart-3 animate-pulse" />
                <span className="text-xs text-chart-3">LIVE</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground tracking-wide">POLI SCORE</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold">72</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                  <span className="text-xs text-chart-3">↗ +2.4%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground tracking-wide">MARKET DEPTH</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-accent">$42.5M</span>
                  <span className="text-xs text-chart-3">↗ +8.2%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground tracking-wide">BID-ASK SPREAD</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-accent">0.08%</span>
                  <span className="text-xs text-destructive">↘ -2.1%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="text-xs text-muted-foreground tracking-wide">VOLATILITY 24H</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold text-destructive">12.4%</span>
                  <span className="text-xs text-chart-3">↗ +15.3%</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground tracking-wide">CEX/DEX RATIO</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xl font-bold">68:32</span>
                  <span className="text-xs text-destructive">↘ -3.2%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="border-t border-border h-10 flex items-center overflow-hidden bg-card">
        <div className="flex items-center gap-8 px-4 animate-scroll whitespace-nowrap">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">BTC/USD</span>
            <span className="text-foreground font-semibold">63,421</span>
            <span className="text-chart-3">↗ +1.8%</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">ETH/USD</span>
            <span className="text-foreground font-semibold">3,124</span>
            <span className="text-destructive">↘ -0.4%</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">DEPTH</span>
            <span className="text-accent font-semibold">$42.5M</span>
            <span className="text-chart-3">↗ +8.2%</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">SPREAD</span>
            <span className="text-accent font-semibold">0.08%</span>
            <span className="text-destructive">↘ -2.1%</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-muted-foreground">VOL-24H</span>
            <span className="text-foreground font-semibold">$1.2B</span>
            <span className="text-chart-3">↗ +12.9%</span>
          </div>
          <div className="text-xs text-muted-foreground">
            NOV 2025 10:07 UTC
          </div>
        </div>
      </div>
    </div>
  );
}
