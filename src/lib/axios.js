import axios from 'axios';
import { tokenService } from '@/services/tokenService';

// API Base URLs
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const IMAGE_API_BASE = 'http://localhost:8000';

// Main API instance for auth, products, cart, etc.
const instance = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to prevent caching for specific endpoints
instance.interceptors.request.use(config => {
  // Add cache-busting for critical data endpoints
  if (config.url?.includes('/api/get-all-products') || 
      config.url?.includes('/api/products/') ||
      config.url?.includes('/api/get-product')) {
    const timestamp = new Date().getTime();
    config.params = {
      ...config.params,
      _t: timestamp
    };
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }
  return config;
});

// Image service instance
export const imageInstance = axios.create({
  baseURL: IMAGE_API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor to both instances
const addAuthInterceptor = (axiosInstance) => {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    async (config) => {
      // Always include credentials to send cookies
      config.withCredentials = true;
      
      let token = tokenService.getAccessToken();
      
      // Check if token will expire in next minute
      if (token && tokenService.willTokenExpireSoon()) {
        try {
          // Try to refresh the token using the refresh token in cookies
          const newToken = await tokenService.refreshToken();
          if (newToken) {
            token = newToken;
          }
        } catch (error) {
          console.error('[Axios] Token refresh failed:', error);
        }
      }
      
      if (token) {
        config.headers.Authorization = token;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for handling 401 errors
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Only attempt refresh if:
      // 1. It's a 401 error
      // 2. We haven't tried to refresh for this request yet
      // 3. We're not already trying to refresh the token
      // 4. We're not trying to refresh the token (prevent infinite loop)
      if (
        error.response?.status === 401 && 
        !originalRequest._retry &&
        !originalRequest.url?.includes('refresh-token')
      ) {
        originalRequest._retry = true;
        
        try {
          console.log('[Axios] Attempting token refresh on 401');
          const newToken = await tokenService.refreshToken();
          
          if (newToken) {
            console.log('[Axios] Token refresh successful, retrying request');
            originalRequest.headers.Authorization = newToken;
            return axiosInstance(originalRequest);
          } else {
            console.log('[Axios] Token refresh failed, request will fail');
          }
        } catch (refreshError) {
          console.error('[Axios] Token refresh error:', refreshError);
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// Apply interceptor to both instances
addAuthInterceptor(instance);
addAuthInterceptor(imageInstance);

export default instance;
