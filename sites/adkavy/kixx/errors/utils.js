import { EOL } from 'node:os';

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
