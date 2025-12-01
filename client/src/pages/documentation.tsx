import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { 
  FileText, 
  Code2, 
  Database, 
  Layers, 
  BookOpen,
  Home,
  Activity,
  Building2,
  Landmark,
  BarChart3,
  AlertTriangle,
  ExternalLink,
  Github,
  FileCode,
  File
} from "lucide-react";
import stratalinkLogo from "@assets/logo_stratalink_1764604924054.png";

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border h-14 flex items-center px-6">
        <div className="flex items-center gap-3">
          <img 
            src={stratalinkLogo} 
            alt="StrataLink Labs" 
            className="w-10 h-10 rounded-full object-cover"
            style={{ 
              filter: 'brightness(0) invert(1)',
            }}
          />
          <span className="font-semibold text-sm tracking-tight">STRATALINK LABS</span>
        </div>
        <nav className="ml-auto flex items-center gap-6">
          <span className="text-sm text-muted-foreground px-3 py-1.5 cursor-pointer">
            DEMO MODE
          </span>
          <Link href="/">
            <span className="text-sm hover-elevate active-elevate-2 px-3 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5" data-testid="link-home">
              <Home className="h-3.5 w-3.5" />
              HOME
            </span>
          </Link>
          <div className="flex items-center gap-2 text-xs font-mono">
            <Activity className="h-3 w-3 text-chart-3" />
            <span className="text-chart-3 font-semibold">LIVE</span>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Title Section */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-primary mb-3" data-testid="text-docs-title">
            DOCUMENTATION HUB
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Comprehensive guides, technical documentation, and API references for the Stratalink Liquidity Intelligence Terminal.
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - About Stratalink */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                ABOUT STRATALINK
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* What is Stratalink */}
              <div>
                <h3 className="font-semibold text-sm mb-2">What is Stratalink?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Stratalink is an institutional-grade liquidity risk intelligence platform built for regulators, exchanges, protocols, and risk managers within DeFi. We provide real-time Proof-of-Liquidity (PoLi) scoring, comprehensive market depth analysis, and automated stress signal detection.
                </p>
              </div>

              {/* Core Features */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Core Features</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Real-time PoLi scoring (0-100 scale)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Multi-exchange depth & spread analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>CEX/DEX ratio & concentration metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Automated stress signal detection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Historical trend analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Regulatory compliance reporting</span>
                  </li>
                </ul>
              </div>

              {/* PoLi Scoring Methodology */}
              <div>
                <h3 className="font-semibold text-sm mb-3">PoLi Scoring Methodology</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Market Depth</span>
                    <span className="font-mono text-primary">30%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Bid-Ask Spread</span>
                    <span className="font-mono text-primary">25%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume Consistency</span>
                    <span className="font-mono text-primary">20%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">CEX/DEX Balance</span>
                    <span className="font-mono text-primary">15%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volatility Score</span>
                    <span className="font-mono text-primary">10%</span>
                  </div>
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Use Cases</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Landmark className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Regulators</h4>
                      <p className="text-xs text-muted-foreground">Monitor systemic liquidity risk across DeFi protocols</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Exchanges</h4>
                      <p className="text-xs text-muted-foreground">Evaluate token listing quality and market depth requirements</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Protocols</h4>
                      <p className="text-xs text-muted-foreground">Assess token health and optimize liquidity pools</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full border border-border flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Risk Managers</h4>
                      <p className="text-xs text-muted-foreground">Real-time alerts for market stress signals</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Platform Documentation */}
          <Card className="border-border">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Code2 className="h-5 w-5 text-accent" />
                <span className="text-accent">PLATFORM DOCUMENTATION</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Start Guide */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Quick Start Guide</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Get started with the Stratalink platform in 5 minutes</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Select a token (SOL, USDC, USDT)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>View real-time PoLi score and metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Explore historical trends and alerts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Generate compliance reports (PDF export)</span>
                  </li>
                </ul>
              </div>

              {/* API Reference */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Code2 className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-sm">API Reference</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">REST & WebSocket endpoints for data integration</p>
                <div className="bg-card/50 border border-border rounded-md p-3 space-y-1.5 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-chart-3">→</span>
                    <span className="text-accent">GET</span>
                    <span className="text-primary">/api/poli-score/{'{token}'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-chart-3">→</span>
                    <span className="text-accent">GET</span>
                    <span className="text-primary">/api/risk-indicators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-chart-3">→</span>
                    <span className="text-accent">WS</span>
                    <span className="text-primary">/stream/realtime-metrics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-chart-3">→</span>
                    <span className="text-accent">POST</span>
                    <span className="text-primary">/api/reports/generate</span>
                  </div>
                </div>
              </div>

              {/* Data Sources */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Data Sources</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Multi-exchange aggregation & validation</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>CEX: Binance, Bybit, Kraken, Coinbase</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>DEX: Jupiter, Raydium, Orca</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>On-chain: Solana RPC + indexers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>Macro: STRATA AI risk feed</span>
                  </li>
                </ul>
              </div>

              {/* Technical Stack */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="h-4 w-4 text-accent" />
                  <h3 className="font-semibold text-sm">Technical Stack</h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Frontend:</span>
                    <span className="font-mono text-xs text-accent">React + TypeScript + Tailwind</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Real-time:</span>
                    <span className="font-mono text-xs text-accent">WebSocket + Server-Sent Events</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Blockchain:</span>
                    <span className="font-mono text-xs text-accent">Solana Web3.js</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Analytics:</span>
                    <span className="font-mono text-xs text-accent">Recharts + Motion/React</span>
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-semibold text-sm mb-3">Resources</h3>
                <div className="space-y-2">
                  <a 
                    href="https://github.com/stratalinklabs" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover-elevate active-elevate-2 p-2 rounded-md cursor-pointer"
                    data-testid="link-github"
                  >
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <span>GitHub Repository</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                  <a 
                    href="https://docs.stratalinklabs.com/api" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover-elevate active-elevate-2 p-2 rounded-md cursor-pointer"
                    data-testid="link-api-docs"
                  >
                    <FileCode className="h-4 w-4 text-muted-foreground" />
                    <span>API Documentation</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                  <a 
                    href="https://stratalinklabs.com/whitepaper" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm hover-elevate active-elevate-2 p-2 rounded-md cursor-pointer"
                    data-testid="link-whitepaper"
                  >
                    <File className="h-4 w-4 text-muted-foreground" />
                    <span>White Paper</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground ml-auto" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Need Help Section */}
        <div className="mt-12 text-center">
          <h2 className="text-xl font-semibold text-primary mb-2">Need Help?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Contact our technical support team for integration assistance and API access.
          </p>
          <Button 
            variant="outline" 
            size="lg"
            className="font-semibold"
            data-testid="button-contact-support"
          >
            CONTACT SUPPORT
          </Button>
        </div>
      </main>
    </div>
  );
}
