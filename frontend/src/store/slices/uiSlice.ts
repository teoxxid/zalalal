import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  loading: boolean;
  notification: {
    type: 'success' | 'error' | 'info' | null;
    message: string | null;
  };
}

const initialState: UIState = {
  loading: false,
  notification: {
    type: null,
    message: null,
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    showNotification: (
      state,
      action: PayloadAction<{ type: 'success' | 'error' | 'info'; message: string }>
    ) => {
      state.notification = {
        type: action.payload.type,
        message: action.payload.message,
      };
    },
    clearNotification: (state) => {
      state.notification = { type: null, message: null };
    },
  },
});

export const { setLoading, showNotification, clearNotification } = uiSlice.actions;
export default uiSlice.reducer;
