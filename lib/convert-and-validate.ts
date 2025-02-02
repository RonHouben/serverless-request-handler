import { ValidateOptions, IErrorDetail } from './models';
import { plainToInstance } from 'class-transformer';
import { validate, ValidatorOptions, ValidationError } from 'class-validator';
import { StatusCodes } from 'http-status-codes';
import { HttpError } from './http-error';
import { Dictionary } from '.';

const defaultValidatorOptions: ValidatorOptions = {
    forbidNonWhitelisted: true,
    whitelist: true,
};

function extractErrorMessages(
    errors: ValidationError[],
    parentProperty?: string
): IErrorDetail[] {
    return errors.reduce((prev, error) => {
        const property = parentProperty
            ? `${parentProperty}.${error.property}`
            : error.property;
        const constraints = error.constraints
            ? [
                {
                    message: Object.values(error.constraints),
                    name: property,
                },
            ]
            : [];
        const childErrors = error.children
            ? extractErrorMessages(error.children, property)
            : [];

        return [...prev, ...constraints, ...childErrors];
    }, new Array<IErrorDetail>());
}

export async function convertAndValidate<T extends object>(
    plain: any,
    options: ValidateOptions<T>,
    errorMessage: string
): Promise<T> {
    const value = plainToInstance<T, any>(options.classType, plain);
    const errors = await validate(
        value,
        options.options || defaultValidatorOptions
    );

    if (errors.length > 0) {
        throw new HttpError(
            StatusCodes.BAD_REQUEST,
            errorMessage,
            ...extractErrorMessages(errors)
        );
    }

    return value as unknown as T;
}
