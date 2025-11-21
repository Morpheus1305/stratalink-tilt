import type { TickerItem } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

interface BottomTickerProps {
  items: TickerItem[];
}

export function BottomTicker({ items }: BottomTickerProps) {
  // Duplicate items for seamless scroll
  const duplicatedItems = [...items, ...items];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border h-10 flex items-center overflow-hidden bg-card" data-testid="bottom-ticker">
      <div className="flex items-center gap-8 px-4 whitespace-nowrap ticker-scroll">
        {duplicatedItems.map((item, index) => (
          <div 
            key={`${item.symbol}-${index}`} 
            className="flex items-center gap-6 font-mono text-xs"
            data-testid={`ticker-item-${item.symbol.toLowerCase().replace('/', '-')}-${index}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold tracking-tight" data-testid={`ticker-symbol-${item.symbol.toLowerCase().replace('/', '-')}`}>
                {item.symbol}
              </span>
              <span className="text-foreground font-bold" data-testid={`ticker-price-${item.symbol.toLowerCase().replace('/', '-')}`}>
                ${parseFloat(item.price).toLocaleString()}
              </span>
              <div className="flex items-center gap-1">
                {parseFloat(item.changePercent) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-chart-3" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span 
                  className={parseFloat(item.changePercent) >= 0 ? 'text-chart-3 font-medium' : 'text-destructive font-medium'}
                  data-testid={`ticker-change-${item.symbol.toLowerCase().replace('/', '-')}`}
                >
                  {parseFloat(item.changePercent) > 0 ? '+' : ''}{item.changePercent}%
                </span>
              </div>
            </div>
            <div className="text-muted-foreground">|</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">DEPTH</span>
              <span className="text-accent font-semibold">{item.depth}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">SPREAD</span>
              <span className="text-accent font-semibold">{item.spread}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground tracking-tight">VOL</span>
              <span className="text-foreground font-semibold">{item.volume}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
