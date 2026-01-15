import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, verify2FA } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { showError, showSuccess } from '../lib/toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Lock, Mail, Shield, Loader2 } from 'lucide-react';

/**
 * Login form schema
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * 2FA verification form schema
 */
const verify2FASchema = z.object({
  totpCode: z.string().length(6, '2FA code must be 6 digits'),
});

type Verify2FAFormValues = z.infer<typeof verify2FASchema>;

/**
 * LoginPage Component
 * Handles email/password login with optional 2FA verification
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();

  // Check if redirected due to session expiry
  const searchParams = new URLSearchParams(location.search);
  const isSessionExpired = searchParams.get('expired') === 'true';

  // Track if 2FA is required
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [userEmail, setUserEmail] = useState('');

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // 2FA verification form
  const verify2FAForm = useForm<Verify2FAFormValues>({
    resolver: zodResolver(verify2FASchema),
    defaultValues: {
      totpCode: '',
    },
  });

  /**
   * Login mutation
   */
  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      if (response.success && response.data) {
        if (response.data.requires2FA) {
          // Require 2FA verification
          setRequires2FA(true);
          setTempToken(response.data.tempToken || '');
          setUserEmail(loginForm.getValues('email'));
          showSuccess('Please enter your 2FA code');
        } else if (response.data.user && response.data.accessToken && response.data.refreshToken) {
          // Login successful without 2FA
          setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
          showSuccess('Welcome back!');

          // Redirect to intended page or dashboard
          const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
          navigate(from, { replace: true });
        }
      }
    },
    onError: (error) => {
      showError(error);
      loginForm.setError('password', {
        type: 'manual',
        message: 'Invalid email or password',
      });
    },
  });

  /**
   * 2FA verification mutation
   */
  const verify2FAMutation = useMutation({
    mutationFn: verify2FA,
    onSuccess: (response) => {
      if (response.success && response.data) {
        setAuth(response.data.user, response.data.accessToken, response.data.refreshToken);
        showSuccess('Welcome back!');

        // Redirect to intended page or dashboard
        const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    },
    onError: (error) => {
      showError(error);
      verify2FAForm.setError('totpCode', {
        type: 'manual',
        message: 'Invalid 2FA code',
      });
    },
  });

  /**
   * Handle login form submission
   */
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
      deviceName: navigator.userAgent,
    });
  };

  /**
   * Handle 2FA verification form submission
   */
  const onVerify2FASubmit = (values: Verify2FAFormValues) => {
    verify2FAMutation.mutate({
      email: userEmail,
      totpCode: values.totpCode,
      tempToken,
      deviceName: navigator.userAgent,
    });
  };

  /**
   * Go back to login form from 2FA
   */
  const handleBackToLogin = () => {
    setRequires2FA(false);
    setTempToken('');
    setUserEmail('');
    verify2FAForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            {requires2FA ? 'Two-Factor Authentication' : 'Welcome to OmniTrackr'}
          </CardTitle>
          <CardDescription className="text-center">
            {requires2FA
              ? 'Enter the 6-digit code from your authenticator app'
              : 'Sign in to your account to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Session Expiry Alert */}
          {isSessionExpired && !requires2FA && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                Your session has expired. Please sign in again to continue.
              </AlertDescription>
            </Alert>
          )}

          {!requires2FA ? (
            // Login Form
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    {...loginForm.register('email')}
                    disabled={loginMutation.isPending}
                  />
                </div>
                {loginForm.formState.errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {loginForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    {...loginForm.register('password')}
                    disabled={loginMutation.isPending}
                  />
                </div>
                {loginForm.formState.errors.password && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {loginForm.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Button variant="link" type="button" className="px-0 text-sm">
                  Forgot password?
                </Button>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          ) : (
            // 2FA Verification Form
            <form onSubmit={verify2FAForm.handleSubmit(onVerify2FASubmit)} className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Your account has 2FA enabled. Please enter the 6-digit code from your authenticator app.
                </AlertDescription>
              </Alert>

              {/* 2FA Code Field */}
              <div className="space-y-2">
                <Label htmlFor="totpCode">Authentication Code</Label>
                <Input
                  id="totpCode"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  {...verify2FAForm.register('totpCode')}
                  disabled={verify2FAMutation.isPending}
                  autoFocus
                />
                {verify2FAForm.formState.errors.totpCode && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {verify2FAForm.formState.errors.totpCode.message}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verify2FAMutation.isPending}
                >
                  {verify2FAMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackToLogin}
                  disabled={verify2FAMutation.isPending}
                >
                  Back to login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
