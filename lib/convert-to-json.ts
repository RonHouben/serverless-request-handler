import { StatusCodes } from 'http-status-codes';
import { HttpError } from './http-error';
import winston from 'winston';

export function convertToJson(value?: string | null, logger?: winston.Logger): any {
    try {
        return JSON.parse(value || '');
    } catch (error) {

        if (logger) {
            logger.error(error);
        }

        throw new HttpError(StatusCodes.BAD_REQUEST, 'Invalid json');
    }
}
