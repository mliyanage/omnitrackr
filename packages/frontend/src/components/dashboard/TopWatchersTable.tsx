import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { type TopWatcherStats } from '@/api/dashboard.api';
import { cn } from '@/lib/utils';

interface TopWatchersTableProps {
  data: TopWatcherStats[];
  isLoading?: boolean;
}

export function TopWatchersTable({ data, isLoading = false }: TopWatchersTableProps) {
  const getSuccessRateBadge = (rate: number) => {
    if (rate >= 95) {
      return <Badge className="bg-green-600">Excellent</Badge>;
    } else if (rate >= 85) {
      return <Badge className="bg-yellow-600">Good</Badge>;
    } else if (rate >= 70) {
      return <Badge className="bg-orange-600">Fair</Badge>;
    } else {
      return <Badge className="bg-red-600">Poor</Badge>;
    }
  };

  const getDirectionBadge = (direction: string) => {
    const colors = {
      inward: 'bg-blue-600',
      outward: 'bg-purple-600',
      bidirectional: 'bg-green-600',
    };
    return (
      <Badge className={colors[direction as keyof typeof colors] || 'bg-gray-600'}>
        {direction.charAt(0).toUpperCase() + direction.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top 5 Watchers</h3>
        <div className="text-muted-foreground">Loading...</div>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Top 5 Watchers</h3>
        <div className="text-muted-foreground">No watchers found for the selected period</div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Top 5 Watchers</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Watcher</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="text-right">Total Files</TableHead>
            <TableHead className="text-right">On Time</TableHead>
            <TableHead className="text-right">Late</TableHead>
            <TableHead className="text-right">Success Rate</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((watcher) => (
            <TableRow key={watcher.watcher_id}>
              <TableCell className="font-medium">
                <div>{watcher.watcher_name}</div>
                {watcher.department_code && (
                  <div className="text-xs text-muted-foreground">{watcher.department_code}</div>
                )}
              </TableCell>
              <TableCell>{getDirectionBadge(watcher.direction)}</TableCell>
              <TableCell className="text-right">{watcher.total_files}</TableCell>
              <TableCell className="text-right text-green-600">{watcher.arrived_on_time}</TableCell>
              <TableCell className="text-right text-red-600">{watcher.arrived_late}</TableCell>
              <TableCell className={cn('text-right font-semibold')}>
                {watcher.success_rate.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">{getSuccessRateBadge(watcher.success_rate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
