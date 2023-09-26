import { objectToHeaders } from './http-headers.js';
import { JSONParsingError } from '../errors.js';


export default class HTTPRequest {

    #nodeRequest = null;

    constructor(spec) {

        this.#nodeRequest = spec.req;

        const headers = objectToHeaders(this.#nodeRequest.headers);

        Object.defineProperties(this, {
            headers: {
                enumerable: true,
                writable: false,
                value: headers,
            },
            url: {
                enumerable: true,
                writable: false,
                value: spec.url,
            },
            params: {
                enumerable: true,
                writable: true,
                value: null,
            },
        });
    }

    get method() {
        return this.#nodeRequest.method;
    }

    json() {
        return new Promise((resolve, reject) => {
            const req = this.#nodeRequest;

            const chunks = [];

            req.once('error', reject);

            req.on('data', (chunk) => {
                chunks.push(chunk);
            });

            req.on('end', () => {
                req.off('error', reject);

                const utf8 = Buffer.concat(chunks).toString('utf8');

                let json;

                try {
                    json = JSON.parse(utf8);
                } catch (cause) {
                    reject(new JSONParsingError(`Error parsing HTTP JSON body: ${ cause.message }`, { cause }));
                }

                resolve(json);
            });
        });
    }
}
