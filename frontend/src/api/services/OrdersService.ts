/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class OrdersService {
    /**
     * Список заявок
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersRetrieve({
        dateFrom,
        dateTo,
        status,
    }: {
        dateFrom?: string,
        dateTo?: string,
        status?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/orders/',
            query: {
                'date_from': dateFrom,
                'date_to': dateTo,
                'status': status,
            },
        });
    }
    /**
     * Детали заявки
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersRetrieve2({
        orderId,
    }: {
        orderId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/orders/{order_id}/',
            path: {
                'order_id': orderId,
            },
        });
    }
    /**
     * Завершить заявку (модератор)
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersCompleteUpdate({
        orderId,
    }: {
        orderId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/orders/{order_id}/complete/',
            path: {
                'order_id': orderId,
            },
        });
    }
    /**
     * Удалить заявку
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersDeleteDestroy({
        orderId,
    }: {
        orderId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/orders/{order_id}/delete/',
            path: {
                'order_id': orderId,
            },
        });
    }
    /**
     * Отклонить заявку (модератор)
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersRejectUpdate({
        orderId,
    }: {
        orderId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/orders/{order_id}/reject/',
            path: {
                'order_id': orderId,
            },
        });
    }
    /**
     * Сформировать заявку
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersSubmitUpdate({
        orderId,
    }: {
        orderId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/orders/{order_id}/submit/',
            path: {
                'order_id': orderId,
            },
        });
    }
    /**
     * Обновить заявку
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersUpdateUpdate({
        orderId,
        requestBody,
    }: {
        orderId: number,
        requestBody?: {
            delivery_address?: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/orders/{order_id}/update/',
            path: {
                'order_id': orderId,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Иконка корзины
     * @returns any
     * @throws ApiError
     */
    public static apiOrdersCartRetrieve(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/orders/cart/',
        });
    }
}
