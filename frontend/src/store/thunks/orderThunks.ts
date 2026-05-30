import { createAsyncThunk } from '@reduxjs/toolkit';
import { ServicesService } from '../../api/services/ServicesService';
import { OrdersService } from '../../api/services/OrdersService';
import { OrderItemsService } from '../../api/services/OrderItemsService';
import { setCart, addItem, removeItem, updateQuantity, clearCart } from '../slices/cartSlice';
import { updateOrder } from '../slices/ordersSlice';
import { showNotification } from '../slices/uiSlice';

type FetchOrdersParams = {
  status?: string;
  date_from?: string;
  date_to?: string;
};

const readPayload = (response: any) => response?.data ?? response;

const getErrorMessage = (error: any, fallback: string): string => {
  const body = error?.body || error?.response?.data || error;
  const message = body?.message || body?.error || body?.errors || fallback;
  return typeof message === 'string' ? message : JSON.stringify(message);
};

const toCartItems = (items: any[] = []) => items.map((item) => ({
  serviceId: Number(item.serviceId ?? item.service_id ?? item.service?.id ?? item.service),
  name: item.name ?? item.service_name ?? item.service?.name ?? 'Товар',
  price: Number(item.price ?? item.service_price ?? item.price_at_time ?? item.service?.price ?? 0),
  quantity: Number(item.quantity ?? 1),
  image_url: item.image_url ?? item.service?.image_url,
}));

export const fetchCartIconThunk = createAsyncThunk(
  'cart/fetchIcon',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const data = readPayload(await OrdersService.apiOrdersCartRetrieve());
      const orderId = data.order_id ?? null;
      const items = toCartItems(data.items || []);
      dispatch(setCart({ orderId, items }));
      return { order_id: orderId, items_count: data.items_count ?? items.length };
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        dispatch(clearCart());
        return { order_id: null, items_count: 0 };
      }
      return rejectWithValue(getErrorMessage(err, 'Ошибка получения корзины'));
    }
  }
);

export const addToCartThunk = createAsyncThunk(
  'cart/add',
  async (serviceId: number, { dispatch, rejectWithValue }) => {
    try {
      const servicePayload = readPayload(await ServicesService.apiServicesRetrieve2({ serviceId }));
      const responsePayload = readPayload(await OrderItemsService.apiOrderItemsAddCreate({
        requestBody: { service_id: serviceId, quantity: 1 },
      }));

      dispatch(addItem({
        serviceId,
        name: responsePayload.service_name || servicePayload?.name || 'Товар',
        price: Number(responsePayload.service_price || servicePayload?.price || 0),
        quantity: Number(responsePayload.quantity || 1),
        image_url: servicePayload?.image_url,
      }));
      dispatch(setCart({ orderId: responsePayload.order_id ?? null, preserveItems: true }));

      return responsePayload;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка добавления'));
    }
  }
);

export const updateCartItemThunk = createAsyncThunk(
  'cart/update',
  async (
    { orderId, serviceId, quantity }: { orderId: number; serviceId: number; quantity: number },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const responsePayload = readPayload(await OrderItemsService.apiOrderItemsUpdateUpdate({
        orderId,
        serviceId,
        requestBody: { quantity },
      }));
      dispatch(updateQuantity({ serviceId, quantity }));
      return responsePayload;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка обновления'));
    }
  }
);

export const removeFromCartThunk = createAsyncThunk(
  'cart/remove',
  async ({ orderId, serviceId }: { orderId: number; serviceId: number }, { dispatch, rejectWithValue }) => {
    try {
      await OrderItemsService.apiOrderItemsDeleteDestroy({ orderId, serviceId });
      dispatch(removeItem(serviceId));
      dispatch(showNotification({ type: 'success', message: 'Товар удалён' }));
      return true;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка удаления'));
    }
  }
);

export const submitOrderThunk = createAsyncThunk(
  'orders/submit',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const responsePayload = readPayload(await OrdersService.apiOrdersSubmitUpdate({ orderId }));
      dispatch(clearCart());
      dispatch(updateOrder(responsePayload));
      dispatch(showNotification({ type: 'success', message: 'Заявка оформлена' }));
      return responsePayload;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка оформления'));
    }
  }
);

export const fetchOrdersThunk = createAsyncThunk(
  'orders/fetchList',
  async (params: FetchOrdersParams | undefined, { rejectWithValue }) => {
    try {
      return readPayload(await OrdersService.apiOrdersRetrieve({
        status: params?.status,
        dateFrom: params?.date_from,
        dateTo: params?.date_to,
      }));
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка получения заявок'));
    }
  }
);

export const fetchOrderThunk = createAsyncThunk(
  'orders/fetchDetail',
  async (orderId: number, { rejectWithValue }) => {
    try {
      return readPayload(await OrdersService.apiOrdersRetrieve2({ orderId }));
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка получения заявки'));
    }
  }
);

export const completeOrderThunk = createAsyncThunk(
  'orders/complete',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const responsePayload = readPayload(await OrdersService.apiOrdersCompleteUpdate({ orderId }));
      dispatch(updateOrder(responsePayload));
      dispatch(showNotification({ type: 'success', message: 'Заявка завершена' }));
      return responsePayload;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка завершения'));
    }
  }
);

export const rejectOrderThunk = createAsyncThunk(
  'orders/reject',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      const responsePayload = readPayload(await OrdersService.apiOrdersRejectUpdate({ orderId }));
      dispatch(updateOrder(responsePayload));
      dispatch(showNotification({ type: 'success', message: 'Заявка отклонена' }));
      return responsePayload;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка отклонения'));
    }
  }
);

export const deleteOrderThunk = createAsyncThunk(
  'orders/delete',
  async (orderId: number, { dispatch, rejectWithValue }) => {
    try {
      await OrdersService.apiOrdersDeleteDestroy({ orderId });
      dispatch(showNotification({ type: 'success', message: 'Заявка удалена' }));
      return true;
    } catch (err: any) {
      return rejectWithValue(getErrorMessage(err, 'Ошибка удаления'));
    }
  }
);
