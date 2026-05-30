// 🔹 ВАЖНО: импортируем api как значение, а ApiResponse как тип
import { api } from './api';
import type { ApiResponse } from './api';

// 🔹 Services domain
export const servicesApi = {
  getList: (params?: { name?: string; category?: string; price_min?: number; price_max?: number }) =>
    api.get<ApiResponse<any[]>>('/services/', { params }),

  getById: (id: number) => api.get<ApiResponse<any>>(`/services/${id}/`),

  create: (data: FormData) =>
    api.post<ApiResponse<any>>('/services/create/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// 🔹 Orders domain
export const ordersApi = {
  getCartIcon: () => api.get<ApiResponse<{ order_id: number | null; items_count: number }>>('/orders/cart/'),

  getList: (params?: { status?: string; date_from?: string; date_to?: string }) =>
    api.get<ApiResponse<any[]>>('/orders/', { params }),

  getById: (id: number) => api.get<ApiResponse<any>>(`/orders/${id}/`),

  update: (id: number, data: { delivery_address?: string }) =>
    api.put<ApiResponse<any>>(`/orders/${id}/update/`, data),

  submit: (id: number) => api.put<ApiResponse<any>>(`/orders/${id}/submit/`),

  complete: (id: number) => api.put<ApiResponse<any>>(`/orders/${id}/complete/`),

  reject: (id: number) => api.put<ApiResponse<any>>(`/orders/${id}/reject/`),

  delete: (id: number) => api.delete<ApiResponse<any>>(`/orders/${id}/delete/`),
};

// 🔹 OrderItems domain
export const orderItemsApi = {
  add: (data: { service_id: number; quantity?: number }) =>
    api.post<ApiResponse<any>>('/order-items/add/', data),

  update: (orderId: number, serviceId: number, data: { quantity: number }) =>
    api.put<ApiResponse<any>>(`/order-items/${orderId}/${serviceId}/update/`, data),

  delete: (orderId: number, serviceId: number) =>
    api.delete<ApiResponse<any>>(`/order-items/${orderId}/${serviceId}/delete/`),
};

// 🔹 Auth domain
export const authApi = {
  register: (data: { username: string; password: string; email: string }) =>
    api.post<ApiResponse<any>>('/register/', data),

  login: (data: { username: string; password: string }) =>
    api.post<ApiResponse<{ username: string; role: string }>>('/login/', data),

  logout: () => api.post<ApiResponse<any>>('/logout/'),

  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post<ApiResponse<any>>('/change-password/', data),
};
