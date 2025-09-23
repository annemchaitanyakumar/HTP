import axios from 'axios';

// API Base URLs
export const API_BASE = '/';
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
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );
};

// Apply interceptor to both instances
addAuthInterceptor(instance);
addAuthInterceptor(imageInstance);

export default instance;
