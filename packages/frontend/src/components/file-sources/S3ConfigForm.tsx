import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { FileSource, CreateFileSourceRequest, S3ConnectionConfig } from '@/types';

const s3ConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().optional(),
  department: z.string().min(1, 'Department is required'),
  type: z.literal('S3'),

  // S3 Connection Config
  bucket: z.string().min(1, 'Bucket is required'),
  region: z.string().min(1, 'Region is required'),
  path_prefix: z.string().optional(),
  access_key_id: z.string().min(1, 'Access Key ID is required'),
  secret_access_key: z.string().min(1, 'Secret Access Key is required'),

  // File matching
  match_rule: z.enum(['partial', 'exact', 'regex']),
  file_name_pattern: z.string().min(1, 'File name pattern is required'),
  direction: z.enum(['inward', 'outward', 'bidirectional']).default('inward'),

  // Scheduling
  schedule: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
  timezone: z.string().default('UTC'),
  sla_threshold: z.number().min(1, 'SLA threshold must be at least 1 minute'),
});

type S3ConfigFormData = z.infer<typeof s3ConfigSchema>;

interface S3ConfigFormProps {
  onSubmit: (data: CreateFileSourceRequest) => Promise<void>;
  initialData?: FileSource | null;
  isLoading?: boolean;
}

export function S3ConfigForm({ onSubmit, initialData, isLoading }: S3ConfigFormProps) {
  const form = useForm<S3ConfigFormData>({
    resolver: zodResolver(s3ConfigSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: '',
      department: initialData.department,
      type: 'S3',
      bucket: (initialData.connection_config as unknown as S3ConnectionConfig)?.bucket || '',
      region: (initialData.connection_config as unknown as S3ConnectionConfig)?.region || '',
      path_prefix: (initialData.connection_config as unknown as S3ConnectionConfig)?.path_prefix || '',
      access_key_id: '',
      secret_access_key: '',
      match_rule: initialData.match_rule,
      file_name_pattern: initialData.file_name_pattern,
      direction: initialData.direction,
      schedule: initialData.schedule,
      timezone: initialData.timezone,
      sla_threshold: initialData.sla_threshold,
    } : {
      name: '',
      description: '',
      department: '',
      type: 'S3',
      bucket: '',
      region: 'us-east-1',
      path_prefix: '',
      access_key_id: '',
      secret_access_key: '',
      match_rule: 'partial',
      file_name_pattern: '',
      direction: 'inward',
      schedule: '00:00',
      timezone: 'UTC',
      sla_threshold: 60,
    },
  });

  const handleSubmit = async (data: S3ConfigFormData) => {
    const payload: CreateFileSourceRequest = {
      name: data.name,
      description: data.description,
      department: data.department,
      type: 'S3',
      connection_config: {
        bucket: data.bucket,
        region: data.region,
        path_prefix: data.path_prefix,
      },
      credentials: {
        access_key_id: data.access_key_id,
        secret_access_key: data.secret_access_key,
      },
      match_rule: data.match_rule,
      file_name_pattern: data.file_name_pattern,
      direction: data.direction,
      schedule: data.schedule,
      timezone: data.timezone,
      sla_threshold: data.sla_threshold,
    };

    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Configure the basic details for this file source
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Production S3 Bucket" {...field} />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this file source
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Daily sales reports from vendor" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Department</FormLabel>
                  <FormControl>
                    <Input placeholder="Finance" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator />

          <CardContent className="space-y-6 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">S3 Configuration</h3>
              <p className="text-sm text-muted-foreground">
                Configure your AWS S3 bucket connection details
              </p>
            </div>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="bucket"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bucket Name</FormLabel>
                    <FormControl>
                      <Input placeholder="my-s3-bucket" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Region</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="US East (N. Virginia)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-east-2">US East (Ohio)</SelectItem>
                        <SelectItem value="us-west-1">US West (N. California)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                        <SelectItem value="eu-central-1">EU (Frankfurt)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                        <SelectItem value="ap-southeast-2">Asia Pacific (Sydney)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="path_prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Path Prefix (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="data/inbound/" {...field} />
                    </FormControl>
                    <FormDescription>
                      Only monitor files within this path
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Access Credentials</h4>
                <p className="text-sm text-muted-foreground">
                  Provide AWS credentials to access your S3 bucket
                </p>
              </div>

              <FormField
                control={form.control}
                name="access_key_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Access Key ID</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secret_access_key"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Secret Access Key</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <Separator />

          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">File Matching</h3>
              <p className="text-sm text-muted-foreground">
                Define which files to monitor and track
              </p>
            </div>
            <FormField
              control={form.control}
              name="file_name_pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>File Name Pattern</FormLabel>
                  <FormControl>
                    <Input placeholder="customer_*.csv" {...field} />
                  </FormControl>
                  <FormDescription>
                    Files matching this pattern will be tracked
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="match_rule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Rule</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select match rule" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="partial">Partial Match</SelectItem>
                        <SelectItem value="exact">Exact Match</SelectItem>
                        <SelectItem value="regex">Regular Expression</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="direction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Direction</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select direction" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="inward">Inward (Receiving)</SelectItem>
                        <SelectItem value="outward">Outward (Sending)</SelectItem>
                        <SelectItem value="bidirectional">Bidirectional</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>

          <Separator />

          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Scheduling & SLA</h3>
              <p className="text-sm text-muted-foreground">
                Configure when to check for files and set SLA thresholds
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schedule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Check Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormDescription>
                      Daily time to check for new files
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Europe/London">London</SelectItem>
                        <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sla_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SLA Threshold (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="60"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Alert if file is not received within this timeframe
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <Separator />

          <CardFooter className="flex justify-start gap-2">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : initialData ? 'Update' : 'Submit'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
