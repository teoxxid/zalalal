import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { fetchOrdersThunk } from '../thunks/orderThunks'; // 🔹 Импорт thunk

export interface Order {
  id: number;
  user: string | { id: number; username: string; email?: string };
  status: 'draft' | 'submitted' | 'completed' | 'rejected' | 'deleted';
  created_at: string;
  submitted_at?: string;
  completed_at?: string;
  total_amount: number | string;
  total_items?: number;
  items_count?: number;
  items?: any[];
}

interface OrdersState {
  list: Order[];
  currentOrder: Order | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    status: string;
    dateFrom: string;
    dateTo: string;
  };
}

const initialState: OrdersState = {
  list: [],
  currentOrder: null,
  isLoading: false,
  error: null,
  filters: {
    status: 'all',
    dateFrom: '',
    dateTo: '',
  },
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setOrders: (state, action: PayloadAction<Order[]>) => {
      state.list = action.payload;
    },
    setCurrentOrder: (state, action: PayloadAction<Order | null>) => {
      state.currentOrder = action.payload;
    },
    addOrder: (state, action: PayloadAction<Order>) => {
      state.list.unshift(action.payload);
    },
    updateOrder: (state, action: PayloadAction<Order>) => {
      const index = state.list.findIndex((o) => o.id === action.payload.id);
      if (index !== -1) {
        state.list[index] = action.payload;
      }
      if (state.currentOrder?.id === action.payload.id) {
        state.currentOrder = action.payload;
      }
    },
    removeOrder: (state, action: PayloadAction<number>) => {
      state.list = state.list.filter((o) => o.id !== action.payload);
      if (state.currentOrder?.id === action.payload) {
        state.currentOrder = null;
      }
    },
    setFilters: (state, action: PayloadAction<Partial<OrdersState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { status: 'all', dateFrom: '', dateTo: '' };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  // 🔹 Автоматическая обработка результата fetchOrdersThunk
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrdersThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrdersThunk.fulfilled, (state, action: PayloadAction<any[]>) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchOrdersThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = typeof action.payload === 'string' ? action.payload : 'Ошибка загрузки заявок';
      });
  },
});

export const {
  setOrders,
  setCurrentOrder,
  addOrder,
  updateOrder,
  removeOrder,
  setFilters,
  clearFilters,
  setLoading,
  setError,
} = ordersSlice.actions;

export default ordersSlice.reducer;
