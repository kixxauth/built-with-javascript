import { KixxAssert } from '../../dependencies.js';
import { statusMessagesByCode } from './status-messages-by-code.js';


const { assert, isNonEmptyString, isNumberNotNaN } = KixxAssert;


export default class HTTPResponse {

    constructor() {
        Object.defineProperties(this, {
            status: {
                enumerable: true,
                writable: true,
                value: 200,
            },
            statusMessage: {
                enumerable: true,
                writable: true,
                value: 'OK',
            },
            headers: {
                enumerable: true,
                writable: false,
                value: new Headers(),
            },
            body: {
                enumerable: true,
                writable: true,
                value: null,
            },
        });
    }

    respondWithRedirect(statusCode, newLocation) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('location', newLocation);

        return this;
    }

    respondWithJSON(statusCode, obj) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.body = JSON.stringify(obj);

        this.headers.set('content-type', 'application/json');
        this.headers.set('content-length', Buffer.byteLength(this.body));

        return this;
    }

    respondWithPlainText(statusCode, utf8) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        assert(isNonEmptyString(utf8), ': response body must be a string');
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.body = utf8;

        this.headers.set('content-type', 'text/plain');
        this.headers.set('content-length', Buffer.byteLength(this.body));

        return this;
    }

    respondWithHTML(statusCode, utf8) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        assert(isNonEmptyString(utf8), ': response body must be a string');
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.body = utf8;

        this.headers.set('content-type', 'text/html');
        this.headers.set('content-length', Buffer.byteLength(this.body));

        return this;
    }

    respondNotModified() {
        const statusCode = 304;

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('content-length', '0');

        return this;
    }
}
