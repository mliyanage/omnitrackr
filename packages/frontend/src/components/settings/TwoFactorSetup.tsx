import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Shield, ShieldCheck, ShieldOff, Copy, CheckCircle2 } from 'lucide-react';
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
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { setup2FA, enable2FA, disable2FA, regenerateBackupCodes } from '@/api/auth.api';
import type { User } from '@/types';
import { showSuccess, showError } from '@/lib/toast';
import { useAuthStore } from '@/stores/authStore';

interface TwoFactorSetupProps {
  user: User;
}

const enable2FASchema = z.object({
  totpCode: z.string().length(6, 'Code must be 6 digits'),
});

const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

const regenerateCodesSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

type Enable2FAFormValues = z.infer<typeof enable2FASchema>;
type Disable2FAFormValues = z.infer<typeof disable2FASchema>;
type RegenerateCodesFormValues = z.infer<typeof regenerateCodesSchema>;

export function TwoFactorSetup({ user }: TwoFactorSetupProps) {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore();

  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  } | null>(null);

  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: setup2FA,
    onSuccess: (response) => {
      if (response.data) {
        setSetupData(response.data);
      }
    },
    onError: showError,
  });

  // Enable 2FA form
  const enableForm = useForm<Enable2FAFormValues>({
    resolver: zodResolver(enable2FASchema),
    defaultValues: { totpCode: '' },
  });

  const enableMutation = useMutation({
    mutationFn: enable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showSuccess('Two-factor authentication enabled successfully');
      const updatedUser = { ...user, two_fa_enabled: true };
      setUser(updatedUser);
      setSetupData(null);
      enableForm.reset();
    },
    onError: showError,
  });

  // Disable 2FA form
  const disableForm = useForm<Disable2FAFormValues>({
    resolver: zodResolver(disable2FASchema),
    defaultValues: { password: '' },
  });

  const disableMutation = useMutation({
    mutationFn: disable2FA,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      showSuccess('Two-factor authentication disabled');
      const updatedUser = { ...user, two_fa_enabled: false };
      setUser(updatedUser);
      setShowDisableDialog(false);
      disableForm.reset();
    },
    onError: showError,
  });

  // Regenerate backup codes form
  const regenerateForm = useForm<RegenerateCodesFormValues>({
    resolver: zodResolver(regenerateCodesSchema),
    defaultValues: { password: '' },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateBackupCodes,
    onSuccess: (response) => {
      if (response.data?.backupCodes) {
        setNewBackupCodes(response.data.backupCodes);
        showSuccess('Backup codes regenerated successfully');
        regenerateForm.reset();
      }
    },
    onError: showError,
  });

  const handleSetup = async () => {
    await setupMutation.mutateAsync();
  };

  const handleEnable = async (values: Enable2FAFormValues) => {
    await enableMutation.mutateAsync({ totpCode: values.totpCode });
  };

  const handleDisable = async (values: Disable2FAFormValues) => {
    await disableMutation.mutateAsync({ password: values.password });
  };

  const handleRegenerate = async (values: RegenerateCodesFormValues) => {
    await regenerateMutation.mutateAsync({ password: values.password });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadBackupCodes = (codes: string[]) => {
    const content = `OmniTrackr 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${codes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'omnitrackr-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // If 2FA is not enabled and not setting up
  if (!user.two_fa_enabled && !setupData) {
    return (
      <div className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Two-Factor Authentication is Disabled</AlertTitle>
          <AlertDescription>
            Enable 2FA to add an extra layer of security to your account. You'll need to enter a
            code from your authenticator app when you log in.
          </AlertDescription>
        </Alert>

        <Button onClick={handleSetup} disabled={setupMutation.isPending}>
          {setupMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Shield className="mr-2 h-4 w-4" />
          Enable Two-Factor Authentication
        </Button>
      </div>
    );
  }

  // If setting up 2FA (showing QR code)
  if (setupData) {
    return (
      <div className="space-y-6">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>Setup Two-Factor Authentication</AlertTitle>
          <AlertDescription>
            Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.),
            then enter the 6-digit code to complete setup.
          </AlertDescription>
        </Alert>

        {/* QR Code */}
        <div className="flex justify-center p-6 bg-white rounded-lg border">
          <img src={setupData.qrCode} alt="2FA QR Code" className="w-64 h-64" />
        </div>

        {/* Manual Entry */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Can't scan? Enter this code manually:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
              {setupData.secret}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(setupData.secret)}
            >
              {copiedCode === setupData.secret ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Backup Codes */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Backup Codes</p>
          <p className="text-sm text-muted-foreground">
            Save these codes in a safe place. You can use them to access your account if you lose
            your authenticator device.
          </p>
          <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
            {setupData.backupCodes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono">{code}</code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(code)}
                >
                  {copiedCode === code ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => downloadBackupCodes(setupData.backupCodes)}
          >
            Download Backup Codes
          </Button>
        </div>

        {/* Verification Form */}
        <Form {...enableForm}>
          <form onSubmit={enableForm.handleSubmit(handleEnable)} className="space-y-4">
            <FormField
              control={enableForm.control}
              name="totpCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="000000"
                      maxLength={6}
                      {...field}
                      disabled={enableMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the 6-digit code from your authenticator app
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSetupData(null);
                  enableForm.reset();
                }}
                disabled={enableMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={enableMutation.isPending}>
                {enableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify and Enable
              </Button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  // If 2FA is enabled
  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4 text-green-600" />
        <AlertTitle>Two-Factor Authentication is Enabled</AlertTitle>
        <AlertDescription>
          Your account is protected with two-factor authentication. You'll need to enter a code
          from your authenticator app when you log in.
        </AlertDescription>
      </Alert>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={() => setShowRegenerateDialog(true)}
        >
          Regenerate Backup Codes
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowDisableDialog(true)}
        >
          <ShieldOff className="mr-2 h-4 w-4" />
          Disable 2FA
        </Button>
      </div>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable 2FA? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>

          <Form {...disableForm}>
            <form onSubmit={disableForm.handleSubmit(handleDisable)} className="space-y-4">
              <FormField
                control={disableForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your password"
                        {...field}
                        disabled={disableMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter your password to confirm
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDisableDialog(false);
                    disableForm.reset();
                  }}
                  disabled={disableMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={disableMutation.isPending}
                >
                  {disableMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Disable 2FA
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Regenerate Backup Codes Dialog */}
      <Dialog
        open={showRegenerateDialog}
        onOpenChange={(open) => {
          setShowRegenerateDialog(open);
          if (!open) {
            setNewBackupCodes(null);
            regenerateForm.reset();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate Backup Codes</DialogTitle>
            <DialogDescription>
              {newBackupCodes
                ? 'Save these new backup codes. Your old codes will no longer work.'
                : 'Generate new backup codes. This will invalidate your existing codes.'}
            </DialogDescription>
          </DialogHeader>

          {newBackupCodes ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {newBackupCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <code className="flex-1 text-sm font-mono">{code}</code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                    >
                      {copiedCode === code ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => downloadBackupCodes(newBackupCodes)}
              >
                Download Backup Codes
              </Button>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setShowRegenerateDialog(false);
                    setNewBackupCodes(null);
                  }}
                >
                  Done
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <Form {...regenerateForm}>
              <form onSubmit={regenerateForm.handleSubmit(handleRegenerate)} className="space-y-4">
                <FormField
                  control={regenerateForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter your password"
                          {...field}
                          disabled={regenerateMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter your password to confirm
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowRegenerateDialog(false);
                      regenerateForm.reset();
                    }}
                    disabled={regenerateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={regenerateMutation.isPending}>
                    {regenerateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Regenerate Codes
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
