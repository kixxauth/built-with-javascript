import { KixxAssert } from '../../dependencies.js';
import { statusMessagesByCode } from './http-utils.js';


const { assert, isNonEmptyString, isNumberNotNaN } = KixxAssert;


export default class NodeHTTPResponse {

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

    respondWithStream(statusCode, readStream, options) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        const { head } = options || {};

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        if (!head) {
            this.body = readStream;
        }

        return this;
    }

    respondWithJSON(statusCode, obj, options) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');

        const { head, whiteSpace } = options || {};

        const utf8 = whiteSpace
            ? JSON.stringify(obj, null, 4) + '\n'
            : JSON.stringify(obj) + '\n';

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('content-type', 'application/json');
        this.headers.set('content-length', Buffer.byteLength(utf8));

        if (!head) {
            this.body = utf8;
        }

        return this;
    }

    respondWithPlainText(statusCode, utf8, options) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        assert(isNonEmptyString(utf8), ': response body must be a string');

        const { head } = options || {};

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('content-type', 'text/plain');
        this.headers.set('content-length', Buffer.byteLength(utf8));

        if (!head) {
            this.body = utf8;
        }

        return this;
    }

    respondWithHTML(statusCode, utf8, options) {
        assert(isNumberNotNaN(statusCode), ': statusCode must be a number');
        assert(isNonEmptyString(utf8), ': response body must be a string');

        const { head } = options || {};

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('content-type', 'text/html');
        this.headers.set('content-length', Buffer.byteLength(utf8));

        if (!head) {
            this.body = utf8;
        }

        return this;
    }

    respondNotModified() {
        const statusCode = 304;

        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.headers.set('content-length', '0');
        this.body = null;

        return this;
    }
}
