import { getFullStack } from './utils.js';


class WrappedError extends Error {

    constructor(message, spec, sourceFunction) {
        spec = spec || {};
        const cause = spec.cause || null;

        super(message, { cause });

        Object.defineProperties(this, {
            name: {
                enumerable: true,
                value: this.constructor.name,
            },
            code: {
                enumerable: true,
                value: spec.code || this.constructor.CODE,
            },
            fatal: {
                enumerable: true,
                value: Boolean(spec.fatal),
            },
        });

        if (Error.captureStackTrace && sourceFunction) {
            Error.captureStackTrace(this, sourceFunction);
        }
    }
}

class OperationalError extends WrappedError {
    static CODE = 'OPERATIONAL_ERROR';
}

class ValidationError extends WrappedError {
    static CODE = 'VALIDATION_ERROR';

    errors = [];

    get length() {
        return this.errors.length;
    }

    push(message, source) {
        const err = new Error(message);
        err.source = source;
        this.errors.push(err);
    }

    forEach(callback) {
        for (let i = 0; i < this.errors.length; i += 1) {
            callback(this.errors[i], i);
        }
    }
}

class BadRequestError extends WrappedError {
    static CODE = 'BAD_REQUEST_ERROR';
}

class UnauthorizedError extends WrappedError {
    static CODE = 'UNAUTHORIZED_ERROR';
}

class ForbiddenError extends WrappedError {
    static CODE = 'FORBIDDEN_ERROR';
}

class NotFoundError extends WrappedError {
    static CODE = 'NOT_FOUND_ERROR';
}

class ConflictError extends WrappedError {
    static CODE = 'CONFLICT_ERROR';
}

class MethodNotAllowedError extends WrappedError {
    static CODE = 'METHOD_NOT_ALLOWED_ERROR';
}

class NotImplementedError extends WrappedError {
    static CODE = 'NOT_IMPLEMENTED_ERROR';
}

class JSONParsingError extends WrappedError {
    static CODE = 'JSON_PARSING_ERROR';
}

export default {
    WrappedError,
    OperationalError,
    ValidationError,
    BadRequestError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    MethodNotAllowedError,
    NotImplementedError,
    JSONParsingError,
    getFullStack,
};
