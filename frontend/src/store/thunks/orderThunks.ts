import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../services/api';
import { setCart, addItem, removeItem, updateQuantity } from '../slices/cartSlice';
import { showNotification } from '../slices/uiSlice';

type FetchOrdersParams = {
  status?: string;
  date_from?: string;
  date_to?: string;
};

export const fetchCartIconThunk = createAsyncThunk(
  'cart/fetchIcon',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.get('/orders/cart/');
      
      if (response.data?.status === 'success' && response.data.data) {
        const { order_id, items_count } = response.data.data;
        
        if (order_id !== null && order_id !== undefined) {
          dispatch(setCart({ orderId: order_id, preserveItems: true }));
        }
        return { order_id, items_count };
      }
      return { order_id: null, items_count: 0 };
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        return { order_id: null, items_count: 0 };
      }
      return rejectWithValue('Ошибка получения корзины');
    }
  }
);

export const addToCartThunk = createAsyncThunk(
  'cart/add',
  async (serviceId: number, { dispatch, rejectWithValue, getState }) => {
    try {
      const serviceRes = await api.get(`/services/${serviceId}/`);
      const serviceData: any = serviceRes.data?.data || serviceRes.data;
      
      const response = await api.post('/order-items/add/', {
        service_id: serviceId,
        quantity: 1
      });
      
      if (response.data?.status === 'success' && response.data.data) {
        const { order_id, service_name, service_price, quantity } = response.data.data;
        
        dispatch(addItem({
          serviceId,
          name: service_name || serviceData?.name || 'Товар',
          price: service_price || serviceData?.price || 0,
          quantity,
          image_url: serviceData?.image_url,
        }));
        
        const state: any = getState();
        if (state.cart.orderId !== order_id && order_id) {
          dispatch(setCart({ orderId: order_id, items: state.cart.items || [], preserveItems: true }));
        }
        
        return response.data.data;
      }
      return rejectWithValue('Не удалось добавить товар');
    } catch (err: any) {
      console.error('addToCartThunk error:', err);
      
      try {
        const serviceRes = await api.get(`/services/${serviceId}/`);
        const serviceData: any = serviceRes.data?.data || serviceRes.data;
        
        dispatch(addItem({
          serviceId,
          name: serviceData?.name || `Товар #${serviceId}`,
          price: serviceData?.price || 0,
          quantity: 1,
          image_url: serviceData?.image_url,
        }));
        
        dispatch(showNotification({
          type: 'info',
          message: 'Товар добавлен локально (ошибка синхронизации)'
        }));
        
        return { isFallback: true, serviceId };
      } catch {
        // Игнорируем
      }
      return rejectWithValue(err.response?.data?.message || 'Ошибка добавления');
    }
  }
);

export const updateCartItemThunk = createAsyncThunk(
  'cart/update',
  async ({ orderId, serviceId, quantity }: { orderId: number; serviceId: number; quantity: number }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.put(`/order-items/${orderId}/${serviceId}/update/`, { quantity });
      
      if (response.data?.status === 'success') {
        dispatch(updateQuantity({ serviceId, quantity }));
        return response.data.data;
      }
      return rejectWithValue('Не удалось обновить');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка');
    }
  }
);

export const removeFromCartThunk = createAsyncThunk(
  'cart/remove',
  async ({ orderId, serviceId }: { orderId: number; serviceId: number }, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.delete(`/order-items/${orderId}/${serviceId}/delete/`);
      
      if (response.data?.status === 'success') {
        dispatch(removeItem(serviceId));
        dispatch(showNotification({ type: 'success', message: 'Товар удалён' }));
        return true;
      }
      return rejectWithValue('Не удалось удалить');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка');
    }
  }
);

export const submitOrderThunk = createAsyncThunk(
  'orders/submit',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${orderId}/submit/`);
      
      if (response.data?.status === 'success') {
        dispatch(setCart({ orderId: null, items: [] }));
        dispatch(showNotification({ type: 'success', message: 'Заказ оформлен!' }));
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Ошибка');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);

export const fetchOrdersThunk = createAsyncThunk(
  'orders/fetchList',
  async (params: FetchOrdersParams | undefined, { rejectWithValue }) => {
    try {
      const response = await api.get('/orders/', { params });
      
      if (response.data?.status === 'success' && response.data.data) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Ошибка получения заказов');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);

export const fetchOrderThunk = createAsyncThunk(
  'orders/fetchDetail',
  async (orderId: number, { rejectWithValue }) => {
    try {
      const response = await api.get(`/orders/${orderId}/`);
      
      if (response.data?.status === 'success' && response.data.data) {
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Ошибка получения заказа');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);

export const completeOrderThunk = createAsyncThunk(
  'orders/complete',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${orderId}/complete/`);
      if (response.data?.status === 'success') {
        dispatch(showNotification({ type: 'success', message: 'Заявка завершена' }));
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Ошибка');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);

export const rejectOrderThunk = createAsyncThunk(
  'orders/reject',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.put(`/orders/${orderId}/reject/`);
      if (response.data?.status === 'success') {
        dispatch(showNotification({ type: 'success', message: 'Заявка отклонена' }));
        return response.data.data;
      }
      return rejectWithValue(response.data.message || 'Ошибка');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);

export const deleteOrderThunk = createAsyncThunk(
  'orders/delete',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const response = await api.delete(`/orders/${orderId}/delete/`);
      if (response.data?.status === 'success') {
        dispatch(showNotification({ type: 'success', message: 'Заявка удалена' }));
        return true;
      }
      return rejectWithValue(response.data.message || 'Ошибка');
    } catch (err: any) {
      return rejectWithValue(err.response?.data?.message || 'Ошибка сети');
    }
  }
);
