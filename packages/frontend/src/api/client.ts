import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../stores/authStore';
import type { ApiResponse, RefreshTokenResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Main API client with JWT authentication
 */
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
  withCredentials: true, // Required for CORS with credentials
});

/**
 * Track if we're currently refreshing the token to avoid multiple refresh requests
 */
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/**
 * Process queued requests after token refresh
 */
const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });

  failedQueue = [];
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (): Promise<string> => {
  const { refreshToken } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  try {
    // Create a separate axios instance to avoid interceptor loops
    const refreshClient = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    const response = await refreshClient.post<ApiResponse<RefreshTokenResponse>>(
      '/auth/refresh',
      { refreshToken }
    );

    if (response.data.success && response.data.data) {
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;

      // Update tokens in store
      useAuthStore.getState().setTokens(accessToken, newRefreshToken);

      return accessToken;
    }

    throw new Error('Failed to refresh token');
  } catch (error) {
    // Clear auth state and React Query cache, then redirect to login
    // clearAuth() will also clear the queryClient cache
    useAuthStore.getState().clearAuth();
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Request interceptor - Add JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    // Add Authorization header if token exists
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Log requests in development
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log('[API Request]', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - Handle 401 errors with token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log('[API Response]', response.status, response.config.url);
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized errors
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      // Skip token refresh for login and refresh endpoints
      if (
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/refresh')
      ) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const newAccessToken = await refreshAccessToken();
        processQueue(null, newAccessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);

        // Clear auth state and redirect to login
        // This handles cases where refreshAccessToken didn't redirect
        useAuthStore.getState().clearAuth();

        // Show notification to user
        if (typeof window !== 'undefined') {
          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?expired=true';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle 403 Forbidden errors
    if (error.response?.status === 403) {
      console.warn('Forbidden request:', originalRequest?.url);
      // Could redirect to an unauthorized page or show a toast
    }

    // Log errors in development
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.error(
        '[API Error]',
        error.response?.status,
        originalRequest?.url,
        error.response?.data
      );
    }

    return Promise.reject(error);
  }
);

export default apiClient;
