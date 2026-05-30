/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrderItemsService {
    /**
     * Удалить товар из заявки
     * @returns any
     * @throws ApiError
     */
    public static apiOrderItemsDeleteDestroy({
        orderId,
        serviceId,
    }: {
        orderId: number,
        serviceId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/order-items/{order_id}/{service_id}/delete/',
            path: {
                'order_id': orderId,
                'service_id': serviceId,
            },
        });
    }
    /**
     * Обновить товар в заявке
     * @returns any
     * @throws ApiError
     */
    public static apiOrderItemsUpdateUpdate({
        orderId,
        serviceId,
        requestBody,
    }: {
        orderId: number,
        serviceId: number,
        requestBody?: {
            quantity: number;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/order-items/{order_id}/{service_id}/update/',
            path: {
                'order_id': orderId,
                'service_id': serviceId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Добавить товар в заявку
     * @returns any
     * @throws ApiError
     */
    public static apiOrderItemsAddCreate({
        requestBody,
    }: {
        requestBody?: {
            service_id: number;
            quantity?: number;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/order-items/add/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
