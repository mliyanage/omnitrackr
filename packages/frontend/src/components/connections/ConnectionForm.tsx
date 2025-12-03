import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { createConnection, updateConnection, testConnection } from '@/api/connections.api';
import type { SourceConnection } from '@/types';
import { useState } from 'react';
import { showSuccess, showError } from '@/lib/toast';

// S3 Configuration Schema
const s3ConfigSchema = z.object({
  bucket: z.string().min(1, 'Bucket name is required'),
  region: z.string().min(1, 'Region is required'),
  path_prefix: z.string().optional(),
  access_key_id: z.string().min(1, 'Access key ID is required'),
  secret_access_key: z.string().min(1, 'Secret access key is required'),
});

// SFTP Configuration Schema
const sftpConfigSchema = z.object({
  host: z.string().min(1, 'Host is required'),
  port: z.coerce.number().int().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  private_key: z.string().optional(),
  path_prefix: z.string().optional(),
});

// Azure Blob Configuration Schema
const azureBlobConfigSchema = z.object({
  account_name: z.string().min(1, 'Account name is required'),
  container: z.string().min(1, 'Container is required'),
  account_key: z.string().min(1, 'Account key is required'),
  path_prefix: z.string().optional(),
});

// Base form schema
const connectionFormSchema = z.object({
  name: z.string().min(1, 'Connection name is required'),
  description: z.string().optional(),
  type: z.enum(['S3', 'SFTP', 'AZURE_BLOB'] as const),
  connection_config: z.union([s3ConfigSchema, sftpConfigSchema, azureBlobConfigSchema]),
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

interface ConnectionFormProps {
  connection?: SourceConnection;
  onSuccess: (connection: SourceConnection) => void;
  onCancel: () => void;
}

export function ConnectionForm({ connection, onSuccess, onCancel }: ConnectionFormProps) {
  const queryClient = useQueryClient();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const isEditing = !!connection;

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: connection
      ? {
          name: connection.name,
          description: connection.description || '',
          type: connection.type as 'S3' | 'SFTP' | 'AZURE_BLOB',
          connection_config: connection.connection_config,
        }
      : {
          name: '',
          description: '',
          type: 'S3',
          connection_config: {
            bucket: '',
            region: 'us-east-1',
            path_prefix: '',
            access_key_id: '',
            secret_access_key: '',
          },
        },
  });

  const connectionType = form.watch('type');
  // Type-safe control for FormField components
  const control = form.control;

  const createMutation = useMutation({
    mutationFn: createConnection,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onSuccess(data);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ConnectionFormValues> }) => updateConnection(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      onSuccess(data);
    },
    onError: (error) => {
      showError(error);
    },
  });

  const onSubmit = (data: ConnectionFormValues) => {
    if (isEditing) {
      updateMutation.mutate({ id: connection.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleTestConnection = async () => {
    const formData = form.getValues();
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testConnection({
        type: formData.type,
        connection_config: formData.connection_config,
      });
      setTestResult({ success: result.success, message: result.message });

      // Show toast notification
      if (result.success) {
        showSuccess(result.message || 'Connection test successful');
      } else {
        showError(result.message || 'Connection test failed');
      }
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message || 'Connection test failed';
      setTestResult({
        success: false,
        message,
      });
      showError(message);
    } finally {
      setIsTesting(false);
    }
  };

  const renderConfigFields = () => {
    switch (connectionType) {
      case 'S3':
        return (
          <>
            <FormField
              control={control}
              name="connection_config.bucket"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bucket Name</FormLabel>
                  <FormControl>
                    <Input placeholder="my-bucket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <FormControl>
                    <Input placeholder="us-east-1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.path_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path Prefix (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="files/" {...field} />
                  </FormControl>
                  <FormDescription>
                    Restrict to a specific folder within the bucket
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.access_key_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Access Key ID</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="AKIA..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.secret_access_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret Access Key</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 'SFTP':
        return (
          <>
            <FormField
              control={control}
              name="connection_config.host"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Host</FormLabel>
                  <FormControl>
                    <Input placeholder="sftp.example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.port"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Port</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="22" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password (Optional)</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormDescription>
                    Required if not using private key
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.path_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path Prefix (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="/files/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      case 'AZURE_BLOB':
        return (
          <>
            <FormField
              control={control}
              name="connection_config.account_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input placeholder="mystorageaccount" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.container"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Container</FormLabel>
                  <FormControl>
                    <Input placeholder="mycontainer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.account_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Key</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="connection_config.path_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path Prefix (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="files/" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );

      default:
        return null;
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Connection Details</CardTitle>
            <CardDescription>
              Configure the basic connection information and type
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Production S3 Bucket" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this connection"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Connection Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select connection type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="S3">Amazon S3</SelectItem>
                      <SelectItem value="SFTP">SFTP</SelectItem>
                      <SelectItem value="AZURE_BLOB">Azure Blob Storage</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="space-y-6 rounded-lg border p-6 bg-muted/30">
          <div className="space-y-2">
            <h3 className="text-base font-semibold leading-none">Connection Configuration</h3>
            <p className="text-sm text-muted-foreground">
              Configure the specific settings for this {connectionType} connection
            </p>
          </div>
          <div className="space-y-4">
            {renderConfigFields()}
          </div>
        </div>

        {testResult && (
          <div
            className={`rounded-md p-3 text-sm ${
              testResult.success
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {testResult.message}
          </div>
        )}

        <div className="flex justify-between gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleTestConnection}
            disabled={isTesting || isLoading}
          >
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
