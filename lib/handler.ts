import { defaultLogger } from './console-logger';
import {
    HandlerOptions,
    ProxyEvent,
    ResultResponse,
    Dictionary,
} from './models';
import {
    APIGatewayProxyHandler,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from 'aws-lambda';
import { convertAndValidate } from './convert-and-validate';
import { StatusCodes } from 'http-status-codes';
import { convertToJson } from './convert-to-json';
import { defaultErrorTransformer } from './default-error-transformer';
import { HttpError } from './http-error';
import { isHttpError, ValidateOptions } from '.';

const ERROR_MESSAGES = {
    invalidBody: 'Invalid body',
    invalidQueryParameters: 'Invalid query parameters',
    invalidPathParameters: 'Invalid path parameters',
    invalidHeaders: 'Invalid headers',
    invalidResponse: 'Invalid response',
};

export function handler<
    T1 = string | null,
    T2 = Dictionary | null,
    T3 = Dictionary | null,
    T4 = Dictionary | null,
    TResponse = unknown
>(
    options: HandlerOptions<T1, T2, T3, T4, TResponse>,
    eventHandler: (event: ProxyEvent<T1, T2, T3, T4>) => ResultResponse<TResponse>
): APIGatewayProxyHandler {
    const errorTransformer = options.errorTransformer || defaultErrorTransformer;
    const logger = options.logger || defaultLogger;

    return async (
        proxyEvent: APIGatewayProxyEvent
    ): Promise<APIGatewayProxyResult> => {
        try {
            const pathParameters = options.pathParameters
                ? await convertAndValidate(
                    proxyEvent.pathParameters || {},
                    options.pathParameters as unknown as ValidateOptions<typeof options.pathParameters>,
                    ERROR_MESSAGES.invalidPathParameters
                )
                : proxyEvent.pathParameters;

            const queryParameters = options.queryParameters
                ? await convertAndValidate(
                    proxyEvent.queryStringParameters || {},
                    options.queryParameters as unknown as ValidateOptions<typeof options.queryParameters>,
                    ERROR_MESSAGES.invalidQueryParameters
                )
                : proxyEvent.queryStringParameters;

            const headers = options.headers
                ? await convertAndValidate(
                    proxyEvent.headers,
                    options.headers as unknown as ValidateOptions<typeof options.headers>,
                    ERROR_MESSAGES.invalidHeaders
                )
                : proxyEvent.headers;

            const body = options.body
                ? await convertAndValidate(
                    convertToJson(proxyEvent.body, logger),
                    options.body as unknown as ValidateOptions<typeof options.body>,
                    ERROR_MESSAGES.invalidBody
                )
                : proxyEvent.body;

            const result = await eventHandler({
                body: body as unknown as T1,
                queryParameters: queryParameters as unknown as T2,
                pathParameters: pathParameters as unknown as T3,
                headers: headers as unknown as T4,
                httpMethod: proxyEvent.httpMethod,
                path: proxyEvent.path,
                context: proxyEvent.requestContext,
            });

            if (result.success) {
                const validatedBody = options.response
                    ? await convertAndValidate(
                        result.body,
                        options.response as unknown as ValidateOptions<typeof options.response>,
                        ERROR_MESSAGES.invalidResponse
                    )
                    : result.body;

                return {
                    statusCode: result.statusCode,
                    body: validatedBody ? JSON.stringify(validatedBody) : '',
                    headers: result.headers,
                };
            }

            return errorTransformer(result, options);
        } catch (err) {
            const error = err as Error | HttpError;

            if (isHttpError(error)) {
                return errorTransformer(error, options);
            }

            // Log unexpected errors
            logger.error(error);

            return errorTransformer(
                new HttpError(
                    StatusCodes.INTERNAL_SERVER_ERROR,
                    (error ).message
                ),
                options
            );
        }
    };
}
