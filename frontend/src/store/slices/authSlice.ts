import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { 
  loginThunk, 
  registerThunk, 
  logoutThunk, 
  setAuthFromStorage 
} from '../thunks/authThunks';

export interface UserData {
  id?: number;
  username: string;
  role: 'USER' | 'ADMIN';
  email?: string;
}

interface AuthResponse {
  user: UserData;
}

export interface AuthState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthChecked: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isAuthChecked: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    
    resetAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isAuthChecked = true;
      state.error = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
    },
    
    setUser: (state, action: PayloadAction<UserData>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isAuthChecked = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(action.payload));
      }
    },
  },
  
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isAuthChecked = true;
        state.error = null;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('user', JSON.stringify(action.payload.user));
          } catch (e) {
            console.warn('Failed to save user to localStorage:', e);
          }
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthChecked = true;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : 'Ошибка входа';
      })
      
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action: PayloadAction<AuthResponse>) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.isAuthChecked = true;
        state.error = null;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('user', JSON.stringify(action.payload.user));
          } catch (e) {
            console.warn('Failed to save user to localStorage:', e);
          }
        }
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthChecked = true;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : 'Ошибка регистрации';
      })
      
      .addCase(logoutThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.isAuthChecked = true;
        state.error = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
      })
      .addCase(logoutThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' 
          ? action.payload 
          : 'Ошибка выхода';
        state.isAuthenticated = false;
        state.user = null;
        state.isAuthChecked = true;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
        }
      })
      
      .addCase(setAuthFromStorage.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(setAuthFromStorage.fulfilled, (state, action: PayloadAction<AuthResponse | null>) => {
        state.isLoading = false;
        state.isAuthChecked = true;
        
        if (action.payload?.user) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.error = null;
        } else {
          state.isAuthenticated = false;
          state.user = null;
          state.error = null;
        }
      })
      .addCase(setAuthFromStorage.rejected, (state) => {
        state.isLoading = false;
        state.isAuthChecked = true;
        state.isAuthenticated = false;
        state.user = null;
        state.error = null;
      });
  },
});

export const { clearError, resetAuth, setUser } = authSlice.actions;

export default authSlice.reducer;
