import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertConfigTable } from '@/components/alerts/AlertConfigTable';
import { AlertHistoryTable } from '@/components/alerts/AlertHistoryTable';
import { AlertConfigSheet } from '@/components/alerts/AlertConfigSheet';
import { RecipientGroupSheet } from '@/components/alerts/RecipientGroupSheet';
import {
  getAlertConfigs,
  getAlertHistory,
  getAlertStats,
  getRecipientGroups,
} from '@/api/alerts.api';
import { useAuthStore } from '@/stores/authStore';
import type { AlertConfig, AlertRecipientGroup } from '@/types';

export default function AlertsPage() {
  const isViewer = useAuthStore((state) => state.isViewer());
  const [activeTab, setActiveTab] = useState('configurations');
  const [selectedConfig, setSelectedConfig] = useState<AlertConfig | undefined>();
  const [isConfigSheetOpen, setIsConfigSheetOpen] = useState(false);
  const [isRecipientGroupSheetOpen, setIsRecipientGroupSheetOpen] = useState(false);
  const [selectedRecipientGroup, setSelectedRecipientGroup] = useState<
    AlertRecipientGroup | undefined
  >();

  // Queries
  const { data: alertConfigs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ['alertConfigs'],
    queryFn: () => getAlertConfigs(),
  });

  const { data: recipientGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['recipientGroups'],
    queryFn: () => getRecipientGroups(),
  });

  const { data: alertHistoryData, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['alertHistory'],
    queryFn: () => getAlertHistory({ page: 1, limit: 50 }),
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['alertStats'],
    queryFn: () => getAlertStats(),
  });

  const handleCreateConfig = () => {
    setSelectedConfig(undefined);
    setIsConfigSheetOpen(true);
  };

  const handleEditConfig = (config: AlertConfig) => {
    setSelectedConfig(config);
    setIsConfigSheetOpen(true);
  };

  const handleCreateRecipientGroup = () => {
    setSelectedRecipientGroup(undefined);
    setIsRecipientGroupSheetOpen(true);
  };

  const handleEditRecipientGroup = (group: AlertRecipientGroup) => {
    setSelectedRecipientGroup(group);
    setIsRecipientGroupSheetOpen(true);
  };

  const enabledConfigs = alertConfigs.filter((c) => c.enabled).length;
  const totalAlerts = stats?.total_alerts || 0;
  const unacknowledged = stats?.unacknowledged_alerts || 0;
  const failedDeliveries = stats?.failed_deliveries || 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            SLA Breach Alerts
          </h1>
          <p className="text-muted-foreground">
            Configure alert notifications for SLA breaches and manage escalation chains
          </p>
        </div>
        {!isViewer && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCreateRecipientGroup}>
              <Plus className="mr-2 h-4 w-4" />
              Recipient Group
            </Button>
            <Button onClick={handleCreateConfig}>
              <Plus className="mr-2 h-4 w-4" />
              Alert Configuration
            </Button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Active Configs</div>
          <div className="text-2xl font-bold">{enabledConfigs}</div>
          <div className="text-xs text-muted-foreground mt-1">
            of {alertConfigs.length} total
          </div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Total Alerts</div>
          <div className="text-2xl font-bold">{totalAlerts}</div>
          <div className="text-xs text-muted-foreground mt-1">all time</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Unacknowledged</div>
          <div className="text-2xl font-bold text-orange-600">{unacknowledged}</div>
          <div className="text-xs text-muted-foreground mt-1">requires attention</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-sm text-muted-foreground">Failed Deliveries</div>
          <div className="text-2xl font-bold text-red-600">{failedDeliveries}</div>
          <div className="text-xs text-muted-foreground mt-1">delivery errors</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="configurations">Configurations</TabsTrigger>
          <TabsTrigger value="history">Alert History</TabsTrigger>
          <TabsTrigger value="recipient-groups">Recipient Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="configurations" className="space-y-4 mt-4">
          <div className="rounded-lg border">
            <AlertConfigTable
              configs={alertConfigs}
              onEdit={handleEditConfig}
              isLoading={isLoadingConfigs}
              isViewer={isViewer}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <div className="rounded-lg border">
            <AlertHistoryTable
              alerts={alertHistoryData?.data || []}
              pagination={alertHistoryData?.pagination}
              isLoading={isLoadingHistory}
              isViewer={isViewer}
            />
          </div>
        </TabsContent>

        <TabsContent value="recipient-groups" className="space-y-4 mt-4">
          <div className="rounded-lg border">
            <div className="p-6">
              {isLoadingGroups ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading recipient groups...
                </div>
              ) : recipientGroups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recipient groups configured.</p>
                  {!isViewer && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleCreateRecipientGroup}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Recipient Group
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recipientGroups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {group.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {group.email_addresses.map((email, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {group.email_addresses.length} recipient(s)
                        </p>
                      </div>
                      {!isViewer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditRecipientGroup(group)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <AlertConfigSheet
        open={isConfigSheetOpen}
        onOpenChange={setIsConfigSheetOpen}
        config={selectedConfig}
        recipientGroups={recipientGroups}
      />

      <RecipientGroupSheet
        open={isRecipientGroupSheetOpen}
        onOpenChange={setIsRecipientGroupSheetOpen}
        group={selectedRecipientGroup}
      />
    </div>
  );
}
