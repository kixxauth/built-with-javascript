import { statusMessagesByCode } from './status-messages-by-code.js';


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

    respondWithJSON(statusCode, obj) {
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.body = JSON.stringify(obj);

        this.headers.set('content-type', 'application/json');
        this.headers.set('content-length', Buffer.byteLength(this.body));

        return this;
    }

    respondWithPlainText(statusCode, utf8) {
        this.status = statusCode;
        this.statusMessage = statusMessagesByCode.get(statusCode);

        this.body = utf8;

        this.headers.set('content-type', 'text/plain');
        this.headers.set('content-length', Buffer.byteLength(this.body));

        return this;
    }
}
