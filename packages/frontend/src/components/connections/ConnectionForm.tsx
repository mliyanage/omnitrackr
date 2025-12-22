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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
import { useState, useEffect } from 'react';
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
  auth_method: z.enum(['password', 'privateKey']).default('password'),
  password: z.string().optional(),
  private_key: z.string().optional(),
  passphrase: z.string().optional(),
  path_prefix: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.auth_method === 'password' && !data.password?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password is required when using password authentication',
      path: ['password'],
    });
  } else if (data.auth_method === 'privateKey' && !data.private_key?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Private key is required when using key authentication',
      path: ['private_key'],
    });
  }
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
  const [sftpAuthMethod, setSftpAuthMethod] = useState<'password' | 'privateKey'>('password');
  const [privateKeyFile, setPrivateKeyFile] = useState<File | null>(null);

  const isEditing = !!connection;

  const handlePrivateKeyFileUpload = (file: File | null) => {
    if (!file) {
      setPrivateKeyFile(null);
      form.setValue('connection_config.private_key' as any, '');
      return;
    }

    setPrivateKeyFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      form.setValue('connection_config.private_key' as any, content);
    };
    reader.onerror = () => {
      showError('Failed to read private key file');
      setPrivateKeyFile(null);
    };
    reader.readAsText(file);
  };

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

  // Initialize connection_config when type changes
  useEffect(() => {
    if (!isEditing) {
      switch (connectionType) {
        case 'S3':
          form.setValue('connection_config', {
            bucket: '',
            region: 'us-east-1',
            path_prefix: '',
            access_key_id: '',
            secret_access_key: '',
          } as any);
          break;
        case 'SFTP':
          form.setValue('connection_config', {
            host: '',
            port: 22,
            username: '',
            auth_method: 'password',
            password: '',
            private_key: '',
            passphrase: '',
            path_prefix: '',
          } as any);
          setSftpAuthMethod('password');
          break;
        case 'AZURE_BLOB':
          form.setValue('connection_config', {
            account_name: '',
            container: '',
            account_key: '',
            path_prefix: '',
          } as any);
          break;
      }
    }
  }, [connectionType, isEditing]);

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

            {/* Authentication Method Selection */}
            <FormField
              control={control}
              name="connection_config.auth_method"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Authentication Method</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSftpAuthMethod(value as 'password' | 'privateKey');
                        // Clear opposite fields when switching
                        if (value === 'password') {
                          form.setValue('connection_config.private_key' as any, '');
                          form.setValue('connection_config.passphrase' as any, '');
                          setPrivateKeyFile(null);
                        } else {
                          form.setValue('connection_config.password' as any, '');
                        }
                      }}
                      value={field.value || sftpAuthMethod}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="password" id="password" />
                        <Label htmlFor="password" className="font-normal cursor-pointer">
                          Password
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="privateKey" id="privateKey" />
                        <Label htmlFor="privateKey" className="font-normal cursor-pointer">
                          SSH Private Key
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Authentication Fields */}
            {sftpAuthMethod === 'password' && (
              <FormField
                control={control}
                name="connection_config.password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Private Key Authentication Fields */}
            {sftpAuthMethod === 'privateKey' && (
              <>
                <FormField
                  control={control}
                  name="connection_config.private_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Private Key</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                          className="font-mono text-xs min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Paste your private key in OpenSSH or PEM format
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload Alternative */}
                <FormItem>
                  <FormLabel>Or Upload Private Key File</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".pem,.key,.txt"
                      onChange={(e) => handlePrivateKeyFileUpload(e.target.files?.[0] || null)}
                    />
                  </FormControl>
                  <FormDescription>
                    {privateKeyFile ? `Selected: ${privateKeyFile.name}` : 'Upload a .pem, .key, or .txt file'}
                  </FormDescription>
                </FormItem>

                <FormField
                  control={control}
                  name="connection_config.passphrase"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passphrase (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter passphrase if key is encrypted"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Required only if your private key is encrypted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={control}
              name="connection_config.path_prefix"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path Prefix (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="/files/" {...field} />
                  </FormControl>
                  <FormDescription>
                    Restrict to a specific folder on the SFTP server
                  </FormDescription>
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
