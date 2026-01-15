import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WatcherCombobox } from '@/components/ui/watcher-combobox';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  createAlertConfig,
  updateAlertConfig,
  deleteAlertConfig,
  getEscalations,
  createEscalation,
  updateEscalation,
  deleteEscalation,
} from '@/api/alerts.api';
import { getWatchers } from '@/api/watchers.api';
import { showSuccess, showError } from '@/lib/toast';
import type { AlertConfig, AlertRecipientGroup, AlertType, AlertEscalation } from '@/types';

interface AlertConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config?: AlertConfig;
  recipientGroups: AlertRecipientGroup[];
}

const alertTypes: { value: AlertType; label: string }[] = [
  { value: 'sla_breached', label: 'SLA Breached' },
  { value: 'sla_at_risk', label: 'SLA At Risk' },
  { value: 'file_arrived', label: 'File Arrived' },
  { value: 'file_arrived_late', label: 'File Arrived Late' },
];

export function AlertConfigSheet({
  open,
  onOpenChange,
  config,
  recipientGroups,
}: AlertConfigSheetProps) {
  const isEditing = !!config;
  const queryClient = useQueryClient();

  // Form state
  const [watcherId, setWatcherId] = useState<number | null>(null);
  const [selectedAlertTypes, setSelectedAlertTypes] = useState<AlertType[]>([]);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailCC, setEmailCC] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [escalations, setEscalations] = useState<
    Array<{ level: number; delay: number; recipients: string[] }>
  >([]);

  // Queries
  const { data: watchers = [] } = useQuery({
    queryKey: ['watchers'],
    queryFn: () => getWatchers(),
  });

  const { data: existingEscalations = [] } = useQuery({
    queryKey: ['escalations', config?.id],
    queryFn: () => getEscalations(config!.id),
    enabled: isEditing && !!config,
  });

  useEffect(() => {
    if (config && open) {
      setWatcherId(config.watcher_id);
      setSelectedAlertTypes(config.alert_types);
      setEmailEnabled(config.email_enabled);
      setEmailRecipients(config.email_recipients || []);
      setEmailCC(config.email_cc || []);
      setSelectedGroupIds(config.recipient_group_ids || []);
      setEnabled(config.enabled);

      // Load escalations
      if (existingEscalations.length > 0) {
        setEscalations(
          existingEscalations.map((esc) => ({
            level: esc.escalation_level,
            delay: esc.delay_minutes,
            recipients: esc.email_recipients || [],
          }))
        );
      }
    } else if (!open) {
      // Reset form
      setWatcherId(null);
      setSelectedAlertTypes([]);
      setEmailEnabled(true);
      setEmailRecipients([]);
      setEmailCC([]);
      setSelectedGroupIds([]);
      setEnabled(true);
      setEscalations([]);
    }
  }, [config, open, existingEscalations]);

  const createMutation = useMutation({
    mutationFn: createAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Alert configuration created successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      updateAlertConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Alert configuration updated successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alertConfigs'] });
      showSuccess('Alert configuration deleted successfully');
      onOpenChange(false);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const handleAddEmail = (type: 'to' | 'cc') => {
    const input = type === 'to' ? emailInput : ccInput;
    const setter = type === 'to' ? setEmailRecipients : setEmailCC;
    const currentList = type === 'to' ? emailRecipients : emailCC;
    const inputSetter = type === 'to' ? setEmailInput : setCcInput;

    const email = input.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (email && emailRegex.test(email) && !currentList.includes(email)) {
      setter([...currentList, email]);
      inputSetter('');
    } else if (email && !emailRegex.test(email)) {
      showError(new Error('Please enter a valid email address'));
    }
  };

  const handleRemoveEmail = (email: string, type: 'to' | 'cc') => {
    if (type === 'to') {
      setEmailRecipients(emailRecipients.filter((e) => e !== email));
    } else {
      setEmailCC(emailCC.filter((e) => e !== email));
    }
  };

  const handleToggleAlertType = (type: AlertType) => {
    setSelectedAlertTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleToggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleAddEscalation = () => {
    const nextLevel = escalations.length + 1;
    setEscalations([...escalations, { level: nextLevel, delay: 30, recipients: [] }]);
  };

  const handleRemoveEscalation = (level: number) => {
    setEscalations(escalations.filter((esc) => esc.level !== level));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!watcherId) {
      showError(new Error('Please select a watcher'));
      return;
    }

    if (selectedAlertTypes.length === 0) {
      showError(new Error('Please select at least one alert type'));
      return;
    }

    if (emailEnabled && emailRecipients.length === 0 && selectedGroupIds.length === 0) {
      showError(new Error('Please add at least one email recipient or select a recipient group'));
      return;
    }

    const data = {
      watcher_id: watcherId,
      alert_types: selectedAlertTypes,
      email_enabled: emailEnabled,
      email_recipients: emailRecipients.length > 0 ? emailRecipients : undefined,
      email_cc: emailCC.length > 0 ? emailCC : undefined,
      recipient_group_ids: selectedGroupIds.length > 0 ? selectedGroupIds : undefined,
      enabled,
    };

    if (isEditing) {
      updateMutation.mutate({ id: config.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (config && window.confirm('Are you sure you want to delete this alert configuration?')) {
      deleteMutation.mutate(config.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px] p-6" side="right">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? 'Edit Alert Configuration' : 'Create Alert Configuration'}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? 'Update the alert configuration below.'
              : 'Configure alert notifications for a watcher.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] pr-4 mt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Watcher Selection */}
            <div className="space-y-2">
              <Label htmlFor="watcher">
                Watcher <span className="text-destructive">*</span>
              </Label>
              <WatcherCombobox
                watchers={watchers}
                value={watcherId?.toString() || ''}
                onValueChange={(value) => setWatcherId(Number(value))}
                placeholder="Select a watcher"
                className="w-full"
                disabled={isEditing}
              />
              {isEditing && (
                <p className="text-sm text-muted-foreground">
                  Watcher cannot be changed for existing configurations
                </p>
              )}
            </div>

            {/* Alert Types */}
            <div className="space-y-3">
              <Label>
                Alert Types <span className="text-destructive">*</span>
              </Label>
              <div className="space-y-2">
                {alertTypes.map((type) => (
                  <div key={type.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={type.value}
                      checked={selectedAlertTypes.includes(type.value)}
                      onCheckedChange={() => handleToggleAlertType(type.value)}
                    />
                    <Label htmlFor={type.value} className="font-normal cursor-pointer">
                      {type.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Email Configuration */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={(checked) => setEmailEnabled(checked as boolean)}
                />
                <Label htmlFor="email-enabled" className="font-semibold cursor-pointer">
                  Email Notifications
                </Label>
              </div>

              {emailEnabled && (
                <>
                  {/* Direct Recipients */}
                  <div className="space-y-2">
                    <Label htmlFor="email-recipients">Email Recipients</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-recipients"
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEmail('to');
                          }
                        }}
                        placeholder="email@example.com"
                      />
                      <Button type="button" onClick={() => handleAddEmail('to')}>
                        Add
                      </Button>
                    </div>
                    {emailRecipients.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {emailRecipients.map((email) => (
                          <Badge key={email} variant="secondary" className="gap-1">
                            {email}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleRemoveEmail(email, 'to')}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* CC Recipients */}
                  <div className="space-y-2">
                    <Label htmlFor="email-cc">CC Recipients</Label>
                    <div className="flex gap-2">
                      <Input
                        id="email-cc"
                        type="email"
                        value={ccInput}
                        onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddEmail('cc');
                          }
                        }}
                        placeholder="email@example.com"
                      />
                      <Button type="button" onClick={() => handleAddEmail('cc')}>
                        Add
                      </Button>
                    </div>
                    {emailCC.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {emailCC.map((email) => (
                          <Badge key={email} variant="outline" className="gap-1">
                            {email}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => handleRemoveEmail(email, 'cc')}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recipient Groups */}
                  <div className="space-y-2">
                    <Label>Recipient Groups</Label>
                    <div className="space-y-2">
                      {recipientGroups.map((group) => (
                        <div key={group.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedGroupIds.includes(group.id)}
                            onCheckedChange={() => handleToggleGroup(group.id)}
                          />
                          <Label
                            htmlFor={`group-${group.id}`}
                            className="font-normal cursor-pointer flex-1"
                          >
                            {group.name}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({group.email_addresses.length} recipients)
                            </span>
                          </Label>
                        </div>
                      ))}
                      {recipientGroups.length === 0 && (
                        <p className="text-sm text-muted-foreground">
                          No recipient groups available. Create one in the Recipient Groups tab.
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Separator />

            {/* Escalations */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Escalation Chains</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEscalation}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </div>
              {escalations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No escalation levels configured. Add levels to automatically escalate unacknowledged alerts.
                </p>
              ) : (
                <div className="space-y-3">
                  {escalations.map((esc) => (
                    <div key={esc.level} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge>Level {esc.level}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEscalation(esc.level)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Escalate after (minutes)</Label>
                        <Input
                          type="number"
                          value={esc.delay}
                          onChange={(e) =>
                            setEscalations(
                              escalations.map((es) =>
                                es.level === esc.level
                                  ? { ...es, delay: Number(e.target.value) }
                                  : es
                              )
                            )
                          }
                          min={1}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Enabled Status */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enabled"
                checked={enabled}
                onCheckedChange={(checked) => setEnabled(checked as boolean)}
              />
              <Label htmlFor="enabled" className="font-normal cursor-pointer">
                Configuration enabled
              </Label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {isEditing ? 'Update' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="ml-auto"
                >
                  Delete
                </Button>
              )}
            </div>
          </form>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
