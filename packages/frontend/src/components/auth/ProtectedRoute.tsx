import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Required roles to access this route
   * If empty, any authenticated user can access
   */
  requiredRoles?: UserRole[];
  /**
   * Redirect path if unauthorized (defaults to /login)
   */
  redirectTo?: string;
}

/**
 * ProtectedRoute Component
 * Protects routes by checking authentication and optionally role-based access
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 *
 * // With role-based access:
 * <ProtectedRoute requiredRoles={['owner', 'super_admin']}>
 *   <UsersPage />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  requiredRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    // Redirect to login, preserving the intended destination
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access if roles are specified
  if (requiredRoles && requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
      // User doesn't have required role, redirect to unauthorized page
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}
