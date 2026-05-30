/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthService {
    /**
     * Аутентификация пользователя
     * @returns any
     * @throws ApiError
     */
    public static apiLoginCreate({
        requestBody,
    }: {
        requestBody?: {
            username: string;
            password: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/login/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Выход из системы
     * @returns any
     * @throws ApiError
     */
    public static apiLogoutCreate(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/logout/',
        });
    }
    /**
     * Регистрация пользователя
     * @returns any
     * @throws ApiError
     */
    public static apiRegisterCreate({
        requestBody,
    }: {
        requestBody?: {
            username: string;
            password: string;
            email: string;
        },
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/register/',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
