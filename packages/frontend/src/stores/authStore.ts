import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/auth.types';

/**
 * Authentication Store State
 */
interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;

  // Helper getters
  getUserRole: () => string | null;
  getUserOrganizationId: () => number | null;
  isSuperAdmin: () => boolean;
  isOwner: () => boolean;
  isEditor: () => boolean;
  isViewer: () => boolean;
}

/**
 * Initial state
 */
const initialState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

/**
 * Auth Store with persistence
 * Stores user info and tokens in localStorage
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,

      /**
       * Set authentication data after successful login
       */
      setAuth: (user: User, accessToken: string, refreshToken: string) => {
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },

      /**
       * Update user data (e.g., after profile update)
       */
      setUser: (user: User) => {
        set({ user });
      },

      /**
       * Update tokens after refresh
       */
      setTokens: (accessToken: string, refreshToken: string) => {
        set({ accessToken, refreshToken });
      },

      /**
       * Clear authentication data on logout
       */
      clearAuth: () => {
        set(initialState);
      },

      /**
       * Get current user role
       */
      getUserRole: () => {
        return get().user?.role || null;
      },

      /**
       * Get current user's organization ID
       */
      getUserOrganizationId: () => {
        return get().user?.organization_id || null;
      },

      /**
       * Check if user is super admin
       */
      isSuperAdmin: () => {
        return get().user?.role === 'super_admin';
      },

      /**
       * Check if user is owner
       */
      isOwner: () => {
        return get().user?.role === 'owner';
      },

      /**
       * Check if user is editor
       */
      isEditor: () => {
        return get().user?.role === 'editor';
      },

      /**
       * Check if user is viewer
       */
      isViewer: () => {
        return get().user?.role === 'viewer';
      },
    }),
    {
      name: 'omnitrackr-auth-storage', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

/**
 * Helper hook to check if user has specific role(s)
 */
export const useHasRole = (...roles: string[]) => {
  const userRole = useAuthStore((state) => state.user?.role);
  return userRole ? roles.includes(userRole) : false;
};

/**
 * Helper hook to check if user can access a specific department
 * TODO: Implement after department assignments are loaded
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const useCanAccessDepartment = (_departmentId: number) => {
  const user = useAuthStore((state) => state.user);

  // Super admin and owner can access all departments
  if (user?.role === 'super_admin' || user?.role === 'owner') {
    return true;
  }

  // For editor/viewer, check department assignments
  // This would require loading user departments from the API
  // For now, return true (will be implemented later)
  return true;
};
