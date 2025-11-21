import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TimeSeriesPoint } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface TimeSeriesChartProps {
  data: TimeSeriesPoint[];
  selectedTimeframe: string;
  onTimeframeChange: (timeframe: string) => void;
}

export function TimeSeriesChart({ data, selectedTimeframe, onTimeframeChange }: TimeSeriesChartProps) {
  const timeframes = ['1H', '4H', '1D', '1W', '1M'];
  
  const handleTimeframeChange = (newTimeframe: string) => {
    onTimeframeChange(newTimeframe);
    // Immediately invalidate and refetch for the new timeframe
    queryClient.invalidateQueries({ queryKey: ['/api/time-series', newTimeframe] });
  };

  return (
    <Card className="p-4 border-card-border" data-testid="card-time-series">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold tracking-wide">LIQUIDITY DEPTH TRENDS</h3>
        <div className="flex items-center gap-1">
          {timeframes.map((tf) => (
            <Button
              key={tf}
              variant={selectedTimeframe === tf ? "default" : "ghost"}
              size="sm"
              className="text-xs font-medium h-7 px-3"
              onClick={() => handleTimeframeChange(tf)}
              data-testid={`button-timeframe-${tf}`}
            >
              {tf}
            </Button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm font-mono">
          No data available for {selectedTimeframe} timeframe
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="timestamp" 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              yAxisId="left"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))" 
              fontSize={10}
              yAxisId="right"
              orientation="right"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
            <Line 
              type="monotone" 
              dataKey="liquidityDepth" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
              name="Liquidity Depth"
            />
            <Line 
              type="monotone" 
              dataKey="spread" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              dot={false}
              yAxisId="right"
              name="Spread"
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
