import { Outlet, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { logout } from '@/api/auth.api';
import { showSuccess, showError } from '@/lib/toast';
import { User, LogOut, Settings, Shield } from 'lucide-react';

export function AppLayout() {
  const appName = import.meta.env.VITE_APP_NAME;
  const appEnv = import.meta.env.VITE_APP_ENV;
  const navigate = useNavigate();

  const { user, refreshToken, clearAuth } = useAuthStore();

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAuth();
      showSuccess('Logged out successfully');
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      // Still clear auth even if logout API fails
      clearAuth();
      showError(error);
      navigate('/login', { replace: true });
    },
  });

  const handleLogout = () => {
    if (refreshToken) {
      logoutMutation.mutate({ refreshToken });
    } else {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  // Format role for display
  const getRoleDisplay = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'owner':
        return 'default';
      case 'editor':
        return 'secondary';
      case 'viewer':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex items-center gap-2 flex-1">
            <h1 className="text-lg font-semibold">{appName}</h1>
            {appEnv !== 'production' && (
              <span className="rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                {appEnv.toUpperCase()}
              </span>
            )}
          </div>

          {/* User Menu */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline-block">
                    {user.first_name} {user.last_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Role</span>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
                    {getRoleDisplay(user.role)}
                  </Badge>
                </DropdownMenuItem>
                {user.two_fa_enabled && (
                  <DropdownMenuItem disabled className="flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    <span className="text-xs text-muted-foreground">2FA Enabled</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={logoutMutation.isPending}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{logoutMutation.isPending ? 'Logging out...' : 'Logout'}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
