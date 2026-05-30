import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface CartItem {
  serviceId: number;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

export interface CartState {
  orderId: number | null;
  items: CartItem[];
  totalAmount: number;
}

const calculateTotal = (items: CartItem[]) => 
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const initialState: CartState = {
  orderId: null,
  items: [],
  totalAmount: 0,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCart: (state, action: PayloadAction<{ orderId: number | null; items?: CartItem[]; preserveItems?: boolean }>) => {
      state.orderId = action.payload.orderId;
      if (!action.payload.preserveItems && action.payload.items) {
        state.items = action.payload.items;
      }
      state.totalAmount = calculateTotal(state.items);
    },
    addItem: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.serviceId === action.payload.serviceId);
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      state.totalAmount = calculateTotal(state.items);
    },
    removeItem: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(i => i.serviceId !== action.payload);
      state.totalAmount = calculateTotal(state.items);
    },
    updateQuantity: (state, action: PayloadAction<{ serviceId: number; quantity: number }>) => {
      const item = state.items.find(i => i.serviceId === action.payload.serviceId);
      if (item) {
        item.quantity = Math.max(1, action.payload.quantity);
      }
      state.totalAmount = calculateTotal(state.items);
    },
    clearCart: (state) => {
      state.items = [];
      state.orderId = null;
      state.totalAmount = 0;
    },
  },
});

export const { setCart, addItem, removeItem, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
