import crypto from 'node:crypto'; // eslint-disable-line no-shadow


const SIGNATURE_ALGORITHM = 'AWS4-HMAC-SHA256';


// Return HTTP headers for a signed AWS request
//
// - awsOptions - Object
// - requestOptions - Object
// - paylaod - Buffer
export function signRequest(awsOptions, requestOptions, payload) {
    const {
        accessKey,
        secretKey,
        region,
        service,
    } = awsOptions;

    const {
        method,
        url,
        contentType,
    } = requestOptions;

    const { host, pathname, searchParams } = url;
    payload = payload || '';

    const headers = new Headers();
    const date = new Date();
    const dateString = getDateString(date);
    const dateTimeString = getDateTimeString(date);
    const payloadHash = hashSHA256(payload);

    headers.set('host', host);
    headers.set('x-amz-content-sha256', payloadHash);
    headers.set('x-amz-date', dateTimeString);

    if (contentType) {
        headers.set('content-type', contentType);
    }

    const scope = `${ dateString }/${ region }/${ service }/aws4_request`;
    const canonicalHeaders = createCanonicalHeadersString(headers);
    const canonicalQueryString = createCanonicalQueryString(searchParams);
    const signedHeaders = getSignedHeadersList(headers);

    const canonicalRequestString = [
        method,
        pathname,
        canonicalQueryString,
        canonicalHeaders + '\n',
        signedHeaders,
        payloadHash,
    ].join('\n');

    const requestHash = hashSHA256(canonicalRequestString);

    const stringToSign = [
        SIGNATURE_ALGORITHM,
        dateTimeString,
        scope,
        requestHash,
    ].join('\n');

    // DateKey = HMAC-SHA256("AWS4"+"<SecretAccessKey>", "<YYYYMMDD>")
    // DateRegionKey = HMAC-SHA256(<DateKey>, "<aws-region>")
    // DateRegionServiceKey = HMAC-SHA256(<DateRegionKey>, "<aws-service>")
    // SigningKey = HMAC-SHA256(<DateRegionServiceKey>, "aws4_request")
    const key = createSignatureKey(service, region, secretKey, dateString);
    const signature = signSHA256(key, stringToSign);

    const authorizationHeader = [
        `${ SIGNATURE_ALGORITHM } Credential=${ accessKey }/${ scope }`,
        `SignedHeaders=${ signedHeaders }`,
        `Signature=${ signature }`,
    ].join(',');

    headers.set('Authorization', authorizationHeader);

    return headers;
}

function createSignatureKey(service, region, secretKey, dateString) {
    const dateKey = signSHA256('AWS4' + secretKey, dateString);
    const dateRegionKey = signSHA256(dateKey, region);
    const dateRegionServiceKey = signSHA256(dateRegionKey, service);
    return signSHA256(dateRegionServiceKey, 'aws4_request');
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
            return `${ key }:${ normalizeHeaderValue(headers.get(key)) }`;
        })
        .join('\n');
}

function getSortedHeaderKeys(headers) {
    const headerKeys = [];

    for (const key of headers.keys()) {
        headerKeys.push(normalizeHeaderKey(key));
    }

    return headerKeys.sort();
}

function normalizeHeaderKey(key) {
    return key.trim().toLowerCase();
}

function normalizeHeaderValue(val) {
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

function hashSHA256(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

function signSHA256(key, data) {
    const hmac = crypto.createHmac('sha256', key);
    hmac.update(data);
    return hmac.digest('hex');
}
