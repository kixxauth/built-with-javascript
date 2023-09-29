import { EOL } from 'node:os';


export class StackedError extends Error {

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

export class OperationalError extends StackedError {
}

export class UnauthorizedError extends StackedError {
    static CODE = 'UNAUTHORIZED_ERROR';
}

export class ForbiddenError extends StackedError {
    static CODE = 'FORBIDDEN_ERROR';
}

export class NotFoundError extends StackedError {
    static CODE = 'NOT_FOUND_ERROR';
}

export class JSONParsingError extends StackedError {
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
