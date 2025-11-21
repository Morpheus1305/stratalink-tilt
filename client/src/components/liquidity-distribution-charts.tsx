import { Card } from "@/components/ui/card";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { ExchangeData, CexDexDistribution } from "@shared/schema";

interface LiquidityDistributionChartsProps {
  exchangeData: ExchangeData[];
  cexDexData: CexDexDistribution;
}

export function LiquidityDistributionCharts({ exchangeData, cexDexData }: LiquidityDistributionChartsProps) {
  const pieData = [
    { name: 'CEX', value: cexDexData.cex, color: 'hsl(var(--chart-1))' },
    { name: 'DEX', value: cexDexData.dex, color: 'hsl(var(--chart-2))' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold tracking-wide">LIQUIDITY DISTRIBUTION MAP</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Exchange Distribution Bar Chart */}
        <Card className="p-4 border-card-border" data-testid="card-exchange-distribution">
          <h4 className="text-xs text-muted-foreground tracking-wide mb-4 uppercase">
            Top Exchanges by Liquidity Depth
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={exchangeData} layout="vertical">
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <YAxis 
                type="category" 
                dataKey="exchange" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={10}
                width={80}
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
              <Bar dataKey="liquidity" radius={[0, 4, 4, 0]}>
                {exchangeData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index % 2 === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* CEX/DEX Distribution Pie Chart */}
        <Card className="p-4 border-card-border" data-testid="card-cex-dex-distribution">
          <h4 className="text-xs text-muted-foreground tracking-wide mb-4 uppercase">
            CEX vs DEX Distribution
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}
              />
              <Legend 
                wrapperStyle={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                formatter={(value, entry: any) => `${value}: ${entry.payload.value}%`}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
