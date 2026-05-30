import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const normalizeBaseUrl = (value?: string): string => (value || '').replace(/["']/g, '').replace(/\/+$/, '');

export const API_ORIGIN = import.meta.env.DEV
  ? ''
  : normalizeBaseUrl(import.meta.env.VITE_API_TARGET || window.location.origin);

export const API_BASE_URL = `${API_ORIGIN}/api`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status >= 200 && status < 500,
});

/**
 * Получает CSRF-токен из cookies
 */
const getCSRFToken = (): string | null => {
  const cookie = document.cookie
    .split('; ')
    .find((row) => row.startsWith('csrftoken='));
  
  if (!cookie) return null;
  return decodeURIComponent(cookie.split('=')[1]);
};

/**
 * Interceptor: добавляет CSRF-токен к изменяющим запросам
 */
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase();
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      config.headers.set('X-CSRFToken', csrfToken);
    }
  }
  return config;
});

/**
 * Interceptor: обработка 401 ошибок (редирект на логин)
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// === API методы ===

export const getServices = (params?: Record<string, unknown>) => 
  api.get('/services/', { params });

export const getService = (id: number) => 
  api.get(`/services/${id}/`);

export const addToCart = (serviceId: number, quantity = 1) => 
  api.post('/order-items/add/', { service_id: serviceId, quantity });

export const getCart = () => 
  api.get('/orders/cart/');

export const getOrder = (orderId: number) => 
  api.get(`/orders/${orderId}/`);

export default api;
