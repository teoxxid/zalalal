/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ServicesService {
    /**
     * Список услуг
     * @returns any
     * @throws ApiError
     */
    public static apiServicesRetrieve({
        category,
        name,
        priceMax,
        priceMin,
    }: {
        /**
         * Фильтр по категории
         */
        category?: string,
        /**
         * Поиск по названию
         */
        name?: string,
        /**
         * Максимальная цена
         */
        priceMax?: number,
        /**
         * Минимальная цена
         */
        priceMin?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/services/',
            query: {
                'category': category,
                'name': name,
                'price_max': priceMax,
                'price_min': priceMin,
            },
        });
    }
    /**
     * Детали услуги
     * @returns any
     * @throws ApiError
     */
    public static apiServicesRetrieve2({
        serviceId,
    }: {
        /**
         * ID услуги
         */
        serviceId: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/services/{service_id}/',
            path: {
                'service_id': serviceId,
            },
        });
    }
    /**
     * Создание услуги
     * @returns any
     * @throws ApiError
     */
    public static apiServicesCreateCreate({
        formData,
    }: {
        formData?: {
            name: string;
            price: number;
            description: string;
            category: string;
            brand: string;
            image?: Blob;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/services/create/',
            formData: formData,
            mediaType: 'multipart/form-data',
        });
    }
}
