const isDev = import.meta.env.DEV;
const BASE_URL = isDev ? 'http://localhost:4040' : 'https://api.homelytaste.com'; // Change this to your production API URL
const DJANGO_URL = isDev ? 'http://localhost:8000' : 'https://django.homelytaste.com'; // Change this to your production Django URL

export const API_ENDPOINTS = {
  PRODUCTS: `${BASE_URL}/api/products`,
  REVIEWS: `${BASE_URL}/api/reviews`,
  CART: `${BASE_URL}/api/cart`,
  DJANGO_PRESIGN: `${DJANGO_URL}/api/products`,
};

// Obfuscate the paths in production
export const getApiUrl = (key, params = {}) => {
  const base = API_ENDPOINTS[key];
  if (!base) return '';
  
  const url = new URL(base);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  
  return url.toString();
};