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
