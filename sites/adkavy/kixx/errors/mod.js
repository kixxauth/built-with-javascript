import { EOL } from 'node:os';


export class WrappedError extends Error {

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

export class OperationalError extends WrappedError {
}

export class BadRequestError extends WrappedError {
    static CODE = 'BAD_REQUEST_ERROR';
}

export class UnauthorizedError extends WrappedError {
    static CODE = 'UNAUTHORIZED_ERROR';
}

export class ForbiddenError extends WrappedError {
    static CODE = 'FORBIDDEN_ERROR';
}

export class NotFoundError extends WrappedError {
    static CODE = 'NOT_FOUND_ERROR';
}

export class ConflictError extends WrappedError {
    static CODE = 'CONFLICT_ERROR';
}

export class MethodNotAllowedError extends WrappedError {
    static CODE = 'METHOD_NOT_ALLOWED_ERROR';
}

export class NotImplementedError extends WrappedError {
    static CODE = 'NOT_IMPLEMENTED_ERROR';
}

export class ValidationError extends WrappedError {
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

export class JSONParsingError extends WrappedError {
    static CODE = 'JSON_PARSING_ERROR';
}

export function getFullStack(err) {
    if (!err) {
        return 'Null or undefined error';
    }

    const stack = [];

    function recursivelyConcat(cause) {
        if (cause && cause.stack) {
            stack.push(cause.stack);
        } else if (typeof cause === 'string') {
            stack.push(cause);
        } else {
            stack.push('No stack trace');
        }

        if (cause && cause.cause) {
            recursivelyConcat(cause.cause);
        }
    }

    recursivelyConcat(err);

    return stack.join(`${ EOL }caused by:${ EOL }`);
}
