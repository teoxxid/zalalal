import { createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_TARGET || 'https://192.168.0.103:8443';

export interface UserData {
  id?: number;
  username: string;
  role: 'USER' | 'ADMIN';
  email?: string;
}

export interface AuthResponse {
  user: UserData;
  token?: string | null;
}

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔹 Интерцептор для CSRF-токена (Django)
const getCSRFToken = (): string | null => {
  const name = 'csrftoken';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return cookieValue ? decodeURIComponent(cookieValue) : null;
};

apiClient.interceptors.request.use((config) => {
  const method = config.method?.toLowerCase();
  if (method && ['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCSRFToken();
    if (csrfToken && config.headers) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
});

export const loginThunk = createAsyncThunk<
  AuthResponse,
  { username: string; password: string },
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      // 🔹 Отправляем данные ПЛОСКО: { username, password }
      const res = await apiClient.post('/api/login/', {
        username: credentials.username,
        password: credentials.password,
      });
      
      const responseData = res.data?.data || res.data;
      
      return {
        user: {
          username: responseData.username,
          role: responseData.role || 'USER',
          email: responseData.email,
          id: responseData.id,
        },
        token: null,
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.errors || 'Ошибка входа';
      return rejectWithValue(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }
);

export const registerThunk = createAsyncThunk<
  AuthResponse,
  { username: string; email: string; password: string },
  { rejectValue: string }
>(
  'auth/register',
  async (data, { rejectWithValue }) => {
    try {
      const res = await apiClient.post('/api/register/', {
        username: data.username,
        email: data.email,
        password: data.password,
      });
      
      const responseData = res.data?.data || res.data;
      
      return {
        user: {
          username: responseData.username,
          role: responseData.role || 'USER',
          email: responseData.email,
          id: responseData.id,
        },
        token: null,
      };
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.errors || 'Ошибка регистрации';
      return rejectWithValue(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }
);

export const logoutThunk = createAsyncThunk<
  boolean,
  void,
  { rejectValue: string }
>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await apiClient.post('/api/logout/');
      return true;
    } catch (err) {
      return rejectWithValue('Ошибка выхода');
    }
  }
);

export const checkAuthStatusThunk = createAsyncThunk<
  AuthResponse | null,
  void,
  { rejectValue: string }
>(
  'auth/checkStatus',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/api/auth/me/');
      if (res.data?.status === 'success' && res.data.data) {
        return {
          user: {
            id: res.data.data.id,
            username: res.data.data.username,
            role: res.data.data.role,
            email: res.data.data.email,
          },
          token: null,
        };
      }
      return rejectWithValue('Not authenticated');
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        return rejectWithValue('Not authenticated');
      }
      return rejectWithValue('Ошибка проверки авторизации');
    }
  }
);

export const setAuthFromStorage = createAsyncThunk<
  AuthResponse | null,
  void,
  { rejectValue: string }
>(
  'auth/setFromStorage',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiClient.get('/api/auth/me/');
      if (res.data?.status === 'success' && res.data.data) {
        return {
          user: {
            id: res.data.data.id,
            username: res.data.data.username,
            role: res.data.data.role,
            email: res.data.data.email,
          },
          token: null,
        };
      }
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return rejectWithValue('Session expired');
    } catch (err) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      return rejectWithValue('No valid session');
    }
  }
);
