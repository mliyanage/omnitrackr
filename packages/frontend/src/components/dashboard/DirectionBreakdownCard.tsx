import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { type DirectionBreakdown } from '@/api/dashboard.api';

interface DirectionBreakdownCardProps {
  data: DirectionBreakdown;
  isLoading?: boolean;
}

const COLORS = {
  inward: '#3b82f6',
  outward: '#8b5cf6',
};

export function DirectionBreakdownCard({ data, isLoading = false }: DirectionBreakdownCardProps) {
  const chartData = [
    { name: 'Inward', value: data.inward },
    { name: 'Outward', value: data.outward },
  ].filter((item) => item.value > 0);


  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Direction Breakdown</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Loading...
        </div>
      </Card>
    );
  }

  if (data.total === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Direction Breakdown</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Direction Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={true}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={70}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[entry.name.toLowerCase() as keyof typeof COLORS]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 gap-6">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Inward</div>
          <div className="text-2xl font-bold mt-1">{data.inward}</div>
          <div className="text-sm text-muted-foreground mt-3">Success Rate</div>
          <div className="text-2xl font-bold mt-1">
            {data.inward_success_rate.toFixed(1)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Outward</div>
          <div className="text-2xl font-bold mt-1">{data.outward}</div>
          <div className="text-sm text-muted-foreground mt-3">Success Rate</div>
          <div className="text-2xl font-bold mt-1">
            {data.outward_success_rate.toFixed(1)}%
          </div>
        </div>
      </div>
    </Card>
  );
}
