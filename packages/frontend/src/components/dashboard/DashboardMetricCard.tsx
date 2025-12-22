import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMetricCardProps {
  label: string;
  value: string | number;
  changePercentage?: number;
  formatType?: 'number' | 'percentage' | 'currency';
  isLoading?: boolean;
}

export function DashboardMetricCard({
  label,
  value,
  changePercentage,
  formatType = 'number',
  isLoading = false,
}: DashboardMetricCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (formatType) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  return (
    <Card className="p-4">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-2">
        {isLoading ? '...' : formatValue(value)}
      </div>
      {changePercentage !== undefined && !isLoading && (
        <div className={cn('flex items-center gap-1 text-sm mt-2', getTrendColor(changePercentage))}>
          {getTrendIcon(changePercentage)}
          <span>
            {changePercentage > 0 ? '+' : ''}
            {changePercentage.toFixed(1)}% from previous period
          </span>
        </div>
      )}
    </Card>
  );
}
