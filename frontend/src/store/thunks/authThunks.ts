import { createAsyncThunk } from '@reduxjs/toolkit';
import { AuthService } from '../../api/services/AuthService';
import { api } from '../../services/api';
import {
  getCurrentMockUser,
  isStaticMockMode,
  mockLogin,
  mockLogout,
  mockRegister,
} from '../../services/mockBackend';

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

const normalizeUser = (payload: any): UserData => {
  const data = payload?.data || payload || {};
  return {
    id: data.id,
    username: data.username,
    role: data.role || 'USER',
    email: data.email,
  };
};

const getErrorMessage = (error: any, fallback: string): string => {
  const body = error?.body || error?.response?.data || error;
  const message = body?.message || body?.error || body?.errors || fallback;
  return typeof message === 'string' ? message : JSON.stringify(message);
};

export const loginThunk = createAsyncThunk<
  AuthResponse,
  { username: string; password: string },
  { rejectValue: string }
>(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    if (isStaticMockMode()) {
      try {
        const user = mockLogin(credentials.username, credentials.password);
        return { user, token: null };
      } catch (err: any) {
        return rejectWithValue(err?.message || 'Ошибка входа');
      }
    }

    try {
      const result = await AuthService.apiLoginCreate({
        requestBody: credentials,
      });
      return { user: normalizeUser(result), token: null };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка входа'));
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
    if (isStaticMockMode()) {
      try {
        const user = mockRegister(data.username, data.email, data.password);
        return { user, token: null };
      } catch (err: any) {
        return rejectWithValue(err?.message || 'Ошибка регистрации');
      }
    }

    try {
      await AuthService.apiRegisterCreate({
        requestBody: {
          username: data.username,
          email: data.email,
          password: data.password,
        },
      });
      const loginResult = await AuthService.apiLoginCreate({
        requestBody: {
          username: data.username,
          password: data.password,
        },
      });
      return { user: normalizeUser(loginResult), token: null };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка регистрации'));
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
    if (isStaticMockMode()) {
      mockLogout();
      return true;
    }

    try {
      await AuthService.apiLogoutCreate();
      return true;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка выхода'));
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
    if (isStaticMockMode()) {
      const user = getCurrentMockUser();
      if (user) return { user, token: null };
      return rejectWithValue('Not authenticated');
    }

    try {
      const res = await api.get('/auth/me/');
      return { user: normalizeUser(res.data), token: null };
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Not authenticated'));
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
    if (isStaticMockMode()) {
      const user = getCurrentMockUser();
      if (user) return { user, token: null };
      return rejectWithValue('No valid session');
    }

    try {
      const res = await api.get('/auth/me/');
      return { user: normalizeUser(res.data), token: null };
    } catch (err: any) {
      localStorage.removeItem('user');
      return rejectWithValue(getErrorMessage(err, 'No valid session'));
    }
  }
);
