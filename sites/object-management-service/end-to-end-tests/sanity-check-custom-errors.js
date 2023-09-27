import fs from 'node:fs';
import { KixxAssert } from '../dependencies.js';
import { OperationalError, JSONParsingError, getFullStack } from '../lib/errors.js';

const { assertEqual } = KixxAssert;


function checkStandardProperties() {
    try {
        JSON.parse('<html>');
    } catch (cause) {
        const err = new JSONParsingError(`A custom error message: ${ cause.message }`, { cause });

        /* eslint-disable no-console */
        console.log(getFullStack(err));
        console.log('');
        console.log('Test checkStandardProperties() Pass! Expected output ^^');
        console.log('');
        /* eslint-enable no-console */

        assertEqual('JSONParsingError', err.name);
        assertEqual('JSON_PARSING_ERROR', err.code);
        assertEqual('A custom error message: Unexpected token < in JSON at position 0', err.message);
        assertEqual(false, err.fatal);
        assertEqual(cause, err.cause);
    }
}

function thisFunctionThrows() {
    try {
        fs.statSync('foo/bar/baz');
    } catch (cause) {
        throw new OperationalError('Could not read file', { code: cause.code, cause });
    }
}

function tryCaptureStackTrace() {
    try {
        thisFunctionThrows();
    } catch (err) {
        /* eslint-disable no-console */
        console.log(getFullStack(err));
        console.log('');
        console.log('Test thisFunctionThrows() Pass! Expected output ^^');
        console.log('');
        /* eslint-enable no-console */
    }
}

checkStandardProperties();
tryCaptureStackTrace();
