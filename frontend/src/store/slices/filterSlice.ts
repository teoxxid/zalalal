import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit'; // 🔹 Добавлено 'type'

export interface FilterState {
  search: string;
  category: string;
  priceFrom: number | null;
  priceTo: number | null;
}

const initialState: FilterState = {
  search: '',
  category: '',
  priceFrom: null,
  priceTo: null,
};

export const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<FilterState>>) => {
      Object.assign(state, action.payload);
    },
    clearFilters: () => initialState,
  },
});

export const { setFilters, clearFilters } = filterSlice.actions;
export default filterSlice.reducer;
