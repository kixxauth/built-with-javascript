/**
 * This script requires:
 * - A file in `./tmp/video.mov` to be uploaded to S3.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import { SignAWSRequest } from '../dependencies.js';


const AWS_ACCESS_KEY_ID = process.argv[2];
const AWS_SECRET_KEY = process.argv[3];

const PATH_TO_LOCAL_FILE = path.resolve('./tmp/video.mov');
const ENDPOINT = 'https://object-management-service-objects.s3.us-east-2.amazonaws.com';
const S3_URL = new URL('/development/testing-123/tmp/video.mov', ENDPOINT);

if (!AWS_ACCESS_KEY_ID) {
    throw new Error('Missing AWS access key id');
}
if (!AWS_SECRET_KEY) {
    throw new Error('Missing AWS secret key');
}


function main() {
    // eslint-disable-next-line no-console
    console.log('Reading the test file.');
    readFile((buff) => {
        // eslint-disable-next-line no-console
        console.log('Uploading the test file.');
        uploadObject(buff, (res, utf8) => {
            /* eslint-disable no-console */
            console.log('==>> STATUS', res.statusCode);
            console.log('==>> HEADERS');
            console.log(res.headers);
            console.log('==>> BODY', Boolean(utf8));
            if (utf8) {
                console.log(utf8);
            }
            /* eslint-enable no-console */
        });
    });
}

function readFile(callback) {
    fs.readFile(PATH_TO_LOCAL_FILE, { encoding: null }, (error, buff) => {
        if (error) {
            printErrorAndExit('file read error', error);
        } else {
            callback(buff);
        }
    });
}

function uploadObject(buff, callback) {
    // Not used:
    // const stats = fs.statSync(PATH_TO_LOCAL_FILE);
    // const sourceStream = fs.createReadStream(PATH_TO_LOCAL_FILE);
    const method = 'PUT';
    const url = S3_URL;

    const awsOptions = {
        accessKey: AWS_ACCESS_KEY_ID,
        secretKey: AWS_SECRET_KEY,
        region: 'us-east-2',
        service: 's3',
    };

    const requestOptions = {
        method,
        url,
        contentType: 'video/quicktime',
        awsHeaders: {
            'x-amz-storage-class': 'STANDARD_IA',
            'x-amz-meta-id': 'foo-bar-baz-123',
        },
    };

    const headers = SignAWSRequest.signRequest(awsOptions, requestOptions, buff);

    headers.set('content-length', buff.length);

    const options = {
        method,
        headers: SignAWSRequest.headersToPlainObject(headers),
    };

    const proto = url.protocol === 'https:' ? https : http;

    const req = proto.request(url, options, (res) => {
        const chunks = [];

        res.on('error', (error) => {
            printErrorAndExit('response error event', error);
        });

        res.on('data', (chunk) => {
            chunks.push(chunk);
        });

        res.on('end', (chunk) => {
            if (chunk) {
                chunks.push(chunk);
            }

            const utf8 = Buffer.concat(chunks).toString('utf8');
            callback(res, utf8);
        });
    });

    req.on('error', (error) => {
        if (error.code === 'EPIPE') {
            // The EPIPE error is emitted if the remote end of the connection is closed before
            // we finish streaming the object.
            // eslint-disable-next-line no-console
            console.log('Remote connection closed');
        } else {
            printErrorAndExit('request error event', error);
        }
    });

    // Not used.
    // sourceStream.pipe(req);
    req.write(buff);
    req.end();
}

function printErrorAndExit(message, error) {
    /* eslint-disable no-console */
    console.error(message);
    console.error(error);
    process.exit(1);
    /* eslint-enable no-console */
}

main();
