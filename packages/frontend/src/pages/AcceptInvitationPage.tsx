import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Mail, User, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { acceptInvitation } from '@/api/users.api';
import { getInvitationByToken } from '@/api/invitations.api';
import { useAuthStore } from '@/stores/authStore';
import { showSuccess, showError } from '@/lib/toast';

const acceptInvitationSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type AcceptInvitationFormValues = z.infer<typeof acceptInvitationSchema>;

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [token, setToken] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteeEmail, setInviteeEmail] = useState<string>('');
  const [inviteeFirstName, setInviteeFirstName] = useState<string>('');
  const [inviteeLastName, setInviteeLastName] = useState<string>('');

  const form = useForm<AcceptInvitationFormValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const inviteToken = searchParams.get('token');
    if (!inviteToken) {
      setError('Invalid invitation link. Please check your email for the correct link.');
      setIsLoading(false);
    } else {
      setToken(inviteToken);
      // Fetch invitation details
      getInvitationByToken(inviteToken)
        .then((invitation) => {
          setInviteeEmail(invitation.email || '');
          setInviteeFirstName(invitation.first_name || '');
          setInviteeLastName(invitation.last_name || '');
          setIsLoading(false);
        })
        .catch((err: any) => {
          const errorMessage = err.response?.data?.error?.message || 'Failed to load invitation';
          setError(errorMessage);
          setIsLoading(false);
        });
    }
  }, [searchParams]);

  const onSubmit = async (values: AcceptInvitationFormValues) => {
    if (!token) {
      setError('Invalid invitation link');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await acceptInvitation({
        token,
        password: values.password,
        firstName: inviteeFirstName,
        lastName: inviteeLastName,
      });

      if (!response.data) {
        throw new Error('Invalid response from server');
      }

      // Auto-login with returned tokens
      setAuth(
        response.data.user,
        response.data.accessToken,
        response.data.refreshToken
      );

      showSuccess('Welcome to OmniTrackr! Your account has been created.');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to accept invitation';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <Mail className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Accept Invitation
          </CardTitle>
          <CardDescription className="text-center">
            {inviteeFirstName && inviteeLastName ? (
              <>Welcome {inviteeFirstName} {inviteeLastName}! Set your password to get started.</>
            ) : (
              <>Create your account to join your organization on OmniTrackr</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Show email and name (read-only) */}
                {inviteeEmail && (
                  <div className="space-y-2 mb-4 p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-700">{inviteeEmail}</span>
                    </div>
                    {inviteeFirstName && inviteeLastName && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-700">
                          {inviteeFirstName} {inviteeLastName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Password */}
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm Password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            className="pl-10 pr-10"
                            disabled={isSubmitting}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>

                <div className="text-center text-sm text-gray-600 mt-4">
                  <p className="text-xs">
                    Password must be at least 8 characters and include uppercase, lowercase, and
                    numbers
                  </p>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
