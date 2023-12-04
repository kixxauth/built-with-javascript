import crypto from 'node:crypto'; // eslint-disable-line no-shadow


const SIGNATURE_ALGORITHM = 'AWS4-HMAC-SHA256';
const SERVICE = 's3';

// Follow along here:
//   https://docs.aws.amazon.com/IAM/latest/UserGuide/create-signed-request.html

export function hashSHA256HexDigest(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

export function signRequest(url, options) {
    const {
        method,
        headers,
        payloadHash,
        region,
        accessKey,
        secretKey,
    } = options;

    const date = new Date();
    const dateString = getDateString(date);
    const dateTimeString = getDateTimeString(date);

    // Header keys must be in lowercase.
    const returnedHeaders = {
        host: url.host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': dateTimeString,
    };

    if (headers) {
        // Header keys must be in lowercase.
        for (const headerName of Object.keys(headers)) {
            returnedHeaders[headerName.toLowerCase()] = headers[headerName];
        }
    }

    const scope = `${ dateString }/${ region }/${ SERVICE }/aws4_request`;
    const canonicalHeaders = createCanonicalHeadersString(returnedHeaders);
    const canonicalQueryString = createCanonicalQueryString(url.searchParams);
    const signedHeaders = getSignedHeadersList(returnedHeaders);

    const canonicalRequestString = [
        method,
        url.pathname,
        canonicalQueryString,
        canonicalHeaders + '\n',
        signedHeaders,
        payloadHash,
    ].join('\n');

    const requestHash = hashSHA256HexDigest(canonicalRequestString);

    const stringToSign = [
        SIGNATURE_ALGORITHM,
        dateTimeString,
        scope,
        requestHash,
    ].join('\n');

    const key = createSignatureKey(SERVICE, region, secretKey, dateString);
    const signature = signSHA256(key, stringToSign).toString('hex');

    returnedHeaders.authorization = [
        `${ SIGNATURE_ALGORITHM } Credential=${ accessKey }/${ scope }`,
        `SignedHeaders=${ signedHeaders }`,
        `Signature=${ signature }`,
    ].join(',');

    return returnedHeaders;
}

function createSignatureKey(service, region, secretKey, dateString) {
    // Work with buffers here, not strings.
    const dateKey = signSHA256('AWS4' + secretKey, dateString);
    const dateRegionKey = signSHA256(dateKey, region);
    const dateRegionServiceKey = signSHA256(dateRegionKey, service);
    return signSHA256(dateRegionServiceKey, 'aws4_request');
}

function signSHA256(key, data) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest();
}

function getSignedHeadersList(headers) {
    return getSortedHeaderKeys(headers).join(';');
}

function createCanonicalQueryString(searchParams) {
    const map = new Map();

    for (const [ key, val ] of searchParams.entries()) {
        const encKey = encodeURIComponent(key);
        const encVal = val === null ? '' : encodeURIComponent(val);
        map.set(encKey, encVal);
    }

    const keys = [];

    for (const key of map.keys()) {
        keys.push(key);
    }

    return keys
        .sort()
        .map((key) => {
            return `${ key }=${ map.get(key) }`;
        })
        .join('&');
}

function createCanonicalHeadersString(headers) {
    const keys = getSortedHeaderKeys(headers);

    return keys
        .map((key) => {
            return `${ key }:${ normalizeHeaderValue(headers[key]) }`;
        })
        .join('\n');
}

function getSortedHeaderKeys(headers) {
    const headerKeys = [];

    for (const key of Object.keys(headers)) {
        headerKeys.push(normalizeHeaderKey(key));
    }

    return headerKeys.sort();
}

function normalizeHeaderKey(key) {
    return key.trim().toLowerCase();
}

function normalizeHeaderValue(val) {
    // Remove extra whitespace, and replace new lines with spaces.
    return val.toString().trim().replace(/\s+/g, ' ');
}

function getDateString(date) {
    // Use the ISO string format as a starting point '2023-09-08T12:00:35.978Z'
    const dateString = date.toISOString().split('T')[0];
    return dateString.replace(/-/g, '');
}

function getDateTimeString(date) {
    return date.toISOString().split('.')[0].replace(/-|:/g, '') + 'Z';
}
