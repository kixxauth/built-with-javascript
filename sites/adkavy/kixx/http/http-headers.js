
const SINGLULAR_HEADERS = [
    'age',
    'authorization',
    'content-length',
    'content-type',
    'etag',
    'expires',
    'from',
    'host',
    'if-modified-since',
    'if-unmodified-since',
    'last-modified',
    'location',
    'max-forwards',
    'proxy-authorization',
    'referer',
    'retry-after',
    'server',
    'user-agent',
];


export function headersToObject(headers) {
    if (headers instanceof Headers) {
        const obj = {};

        for (const [ key, val ] of headers.entries()) {
            obj[key] = val;
        }

        return obj;
    }

    return headers;
}

export function objectToHeaders(obj) {
    const headers = new Headers();

    for (const key of Object.keys(obj)) {
        let values;

        if (SINGLULAR_HEADERS.includes(key)) {
            headers.set(key, obj[key]);
        } else if (key === 'cookie') {
            values = obj[key].split(';').map((s) => s.trim());
        } else {
            values = obj[key].split(',').map((s) => s.trim());
        }

        if (values) {
            for (const val of values) {
                headers.append(key, val);
            }
        }
    }

    return headers;
}
