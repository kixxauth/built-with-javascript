import https from 'node:https';

export function makeHttpsRequest(url, options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            const chunks = [];

            res.once('error', reject);

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                req.off('error', reject);
                res.off('error', reject);

                const utf8 = Buffer.concat(chunks).toString('utf8');

                let json;
                try {
                    json = JSON.parse(utf8);
                } catch (e) {
                    resolve({
                        stausCode: res.statusCode,
                        headers: res.headers,
                        utf8,
                    });

                    return;
                }

                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    json,
                });
            });
        });

        req.once('error', reject);

        if (typeof body === 'string' || body) {
            req.write(body);
        }

        req.end();
    });
}

export function headersToPlainObject(headers) {
    const obj = {};

    for (const [ key, val ] of headers.entries()) {
        obj[key] = val;
    }

    return obj;
}
