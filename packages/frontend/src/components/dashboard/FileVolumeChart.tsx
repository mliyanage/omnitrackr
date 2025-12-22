import { Card } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { type TimeSeriesDataPoint } from '@/api/dashboard.api';
import { format } from 'date-fns';

interface FileVolumeChartProps {
  data: TimeSeriesDataPoint[];
  isLoading?: boolean;
}

export function FileVolumeChart({ data, isLoading = false }: FileVolumeChartProps) {
  const chartData = data.map((point) => ({
    date: format(new Date(point.time_bucket), 'MMM dd'),
    'On Time': point.arrived_on_time,
    'Late': point.arrived_late,
    'Missing': point.missing,
    'Pending': point.pending,
  }));

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">File Volume Trends</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Loading chart data...
        </div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">File Volume Trends</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          No data available for the selected period
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">File Volume Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            style={{ fontSize: '12px' }}
          />
          <YAxis style={{ fontSize: '12px' }} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="On Time"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="Late"
            stackId="1"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="Missing"
            stackId="1"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="Pending"
            stackId="1"
            stroke="#6b7280"
            fill="#6b7280"
            fillOpacity={0.6}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
