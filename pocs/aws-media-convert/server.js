import http from 'node:http';
import fsp from 'node:fs/promises';
// The `crypto` name is global in ES2022
// eslint-disable-next-line no-shadow
import crypto from 'node:crypto';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';


const AWS_ACCESS_KEY_ID = process.argv[2];
const AWS_SECRET_KEY = process.argv[3];

const DIR_URL = new URL('./', import.meta.url);


const server = http.createServer(handleHttpRequest);


const s3client = new S3Client({
    region: 'us-east-2',
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_KEY,
    },
});


function handleHttpRequest(req, res) {
    const url = new URL(`http://localhost:3000${ req.url }`);
    logRequest(req, url);
    routeRequest(req, res, url);
}

function routeRequest(req, res, url) {
    const matchString = `${ req.method } ${ url.pathname }`;

    switch (matchString) {
        case 'GET /':
            sendIndexPage(req, res);
            break;
        default:
            if (matchString.startsWith('PUT /upload-new-file/')) {
                acceptFile(req, res, url);
            } else {
                sendNotFound(req, res);
            }
    }
}

async function sendIndexPage(req, res) {
    const fileUrl = new URL('./index.html', DIR_URL);
    const body = await fsp.readFile(fileUrl, { encoding: 'utf8' });
    sendHtml(res, body);
}

function acceptFile(req, res, url) {
    const fileName = url.pathname.split('/').pop();
    const contentType = req.headers['content-type'];
    const contentLength = parseInt(req.headers['content-length'], 10);
    const md5Hasher = crypto.createHash('md5');

    const chunks = [];

    req.on('data', (chunk) => {
        md5Hasher.update(chunk);
        chunks.push(chunk);
    });

    req.on('end', () => {
        const hash = md5Hasher.digest('hex');

        const command = new PutObjectCommand({
            Bucket: 'poc-2023-08-28-media-convert',
            Key: `source-files/${ fileName }/${ hash }`,
            ContentType: contentType,
            ContentLength: contentLength,
            Body: Buffer.concat(chunks),
            // We could set StorageClass to S3 STANDARD_IA or S3 ONEZONE_IA to save money
            // https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
            // StorageClass: "",
        });

        s3client.send(command).then((s3Response) => {
            // eslint-disable-next-line no-console
            console.log('S3 Response:', s3Response);

            const body = JSON.stringify({
                fileName,
                contentType,
                contentLength,
                hash,
            });

            // eslint-disable-next-line no-console
            console.log('Server Response:', body);

            res.writeHead(201, {
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(body),
            });

            res.write(body);
            res.end();
        }).catch((err) => {
            // eslint-disable-next-line no-console
            console.log(err);
            res.writeHead(500, 'Internal Server Error');
            res.end();
        });
    });
}

function sendNotFound(req, res) {
    const body = `${ req.method } URL "${ req.url }" not found on this server\n`;

    res.writeHead(404, {
        'content-type': 'text/plain',
        'content-length': Buffer.byteLength(body),
    });

    res.write(body);
    res.end();
}

function sendHtml(res, body) {
    res.writeHead(200, {
        'content-type': 'text/html',
        'content-length': Buffer.byteLength(body),
    });

    res.write(body);
    res.end();
}

function logRequest(req, url) {
    const message = `request - ${ req.method } - ${ url.pathname } - ${ url.search }`;

    // eslint-disable-next-line no-console
    console.log(message);
}

server.on('error', (error) => {
    /* eslint-disable no-console */
    console.error('Error event from HTTP server:');
    console.error(error);
    /* eslint-enable no-console */
});

server.listen(3000, () => {
    const { port } = server.address();
    // eslint-disable-next-line no-console
    console.log('Server running on port:', port);
});
