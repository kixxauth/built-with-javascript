import { EOL } from 'node:os';


const HTTP_ERROR_CODES = [
    'BAD_REQUEST_ERROR',
    'UNAUTHORIZED_ERROR',
    'FORBIDDEN_ERROR',
    'NOT_FOUND_ERROR',
    'CONFLICT_ERROR',
    'METHOD_NOT_ALLOWED_ERROR',
    'NOT_IMPLEMENTED_ERROR',
];

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

export function isHttpError(err) {
    return HTTP_ERROR_CODES.includes(err.code);
}
