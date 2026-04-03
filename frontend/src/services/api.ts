import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getServices = () => api.get('/services/');
export const getService = (id: number) => api.get(`/services/${id}/`);
export const addToOrder = (serviceId: number) => api.post(`/order/add/${serviceId}/`);