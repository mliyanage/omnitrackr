import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Add JWT token when authentication is implemented
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

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

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.log('[API Response]', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    // Handle 401 errors (redirect to login when auth is implemented)
    if (error.response?.status === 401) {
      // TODO: Redirect to login page when authentication is implemented
      // window.location.href = '/login';
      console.warn('Unauthorized request:', error.config.url);
    }

    // Log errors in development
    if (import.meta.env.VITE_ENABLE_DEBUG === 'true') {
      console.error('[API Error]', error.response?.status, error.config.url, error.response?.data);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
