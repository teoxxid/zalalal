import axios from 'axios';
import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// 🔹 Создаём и экспортируем api instance
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true, // 🔹 Обязательно для отправки куки сессии
});

export default api;

// 🔹 Функция получения CSRF-токена из cookie (Django формат)
const getCSRFToken = (): string | null => {
  const name = 'csrftoken';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return cookieValue ? decodeURIComponent(cookieValue) : null;
};

// 🔹 Интерцептор запросов: добавляем CSRF-токен
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toLowerCase();
    // CSRF нужен только для "небезопасных" методов
    if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
      const csrfToken = getCSRFToken();
      if (csrfToken && config.headers) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 🔹 Интерцептор ответов: обработка 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 🔹 Очищаем локальное состояние при 401
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // 🔹 Редирект на логин, если не на странице входа
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// 🔹 Тип ответа API
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
  warning?: string; // 🔹 Для предупреждений (например, сессия не сохранена)
}
