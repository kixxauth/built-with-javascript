/*
Use the JSON RPC API, the same one use by the client to create and update observations. We read
in a JSON file instead of importing data like the other seed tools. JSON data can be the merged
data including recently added observations from the existing v1 website (as of 2024-01).
 */

import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';


if (!process.argv[2]) {
    throw new Error('A source file is required');
}

// Should be something like:
// tmp/merged-observations.json
const sourceFilepath = path.resolve(process.argv[2]);

// Something like:
// http://localhost:3033
const endpoint = process.argv[3] || 'http://localhost:3033';


if (!fs.statSync(sourceFilepath).isFile()) {
    throw new Error(`The file ${ sourceFilepath } does not exist.`);
}

async function main() {
    const records = await readJSONFile(sourceFilepath);

    for (const record of records) {
        await createObservation(record);
        await addMedia(record);
    }
}

async function createObservation(record) {
    const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'updateOrCreateObservation',
        id: record.id,
        params: {
            id: record.id,
            attributes: {
                name: record.attributes.name,
                email: record.attributes.email,
                title: record.attributes.title,
                observationDateTime: record.attributes.observationTimestamp,
                reportedDateTime: record.attributes.reportedDate,
                location: record.attributes.location,
                elevation: record.attributes.elevation,
                aspect: record.attributes.aspect,
                redFlags: record.attributes.redFlags,
                triggeredAvalanche: record.attributes.triggeredAvalanche,
                observedAvalanche: record.attributes.observedAvalanche,
                triggeredAvalancheType: record.attributes.triggeredAvalancheType,
                triggeredAvalancheSize: record.attributes.triggeredAvalancheSize,
                triggeredAvalancheComments: record.attributes.triggeredAvalancheComments,
                observedAvalancheType: record.attributes.observedAvalancheType,
                observedAvalancheSize: record.attributes.observedAvalancheSize,
                observedAvalancheElevation: record.attributes.observedAvalancheElevation,
                observedAvalancheAspect: record.attributes.observedAvalancheAspect,
                observedAvalancheComments: record.attributes.observedAvalancheComments,
                details: record.attributes.details,
            },
        },
    });

    const method = 'POST';
    const url = new URL('/observations-rpc', endpoint);

    const headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };

    const res = await makeRequest(method, url, headers, body);

    if (res.error) {
        // eslint-disable-next-line no-console
        console.log(res);
        const error = new Error(`JSON RPC Error: ${ res.error.message }`);
        error.code = res.error.code;
        throw error;
    }

    // eslint-disable-next-line no-console
    console.log(res.result.id, 'updated observation');

    return res.result;
}

async function addMedia(record) {
    if (record.attributes.csv && record.attributes.csv.hasPhotos) {
        const { row } = record.attributes.csv;
        const dir = path.join(path.dirname(sourceFilepath), 'observation-media', row.toString());

        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
            const mediaItem = await uploadMedia(record, path.join(dir, entry));

            mediaItem.title = record.attributes.title;

            await updateMediaMetadata(record, mediaItem);
        }
    } else if (Array.isArray(record.attributes.photos)) {
        for (const photo of record.attributes.photos) {
            const { filename } = photo;
            const filepath = path.join(path.dirname(sourceFilepath), 'observation-media', filename);

            const mediaItem = await uploadMedia(record, filepath);

            mediaItem.title = photo.title;
            mediaItem.details = photo.details;

            await updateMediaMetadata(record, mediaItem);
        }
    }
}

async function uploadMedia(record, filepath) {
    const filename = path.basename(filepath);
    const stats = fs.statSync(filepath);
    const readStream = fs.createReadStream(filepath);

    const method = 'PUT';
    const url = new URL(`/media/${ filename }`, endpoint);

    const headers = {
        'content-type': contentTypeByFileExtension(filename),
        'content-length': stats.size,
    };

    const res = await makeRequest(method, url, headers, readStream);

    if (res.errors) {
        const msg = res.errors[0]?.detail || 'No server error message';
        // eslint-disable-next-line no-console
        console.log(record.id, 'error attaching observation media', res.errors);
        throw new Error(msg);
    }

    // Uncomment for debugging
    // console.log('### === >>', res.data);

    // eslint-disable-next-line no-console
    console.log(record.id, 'attached media', res.data.id);
    return res.data;
}

async function updateMediaMetadata(record, mediaItem) {
    const body = JSON.stringify({
        jsonrpc: '2.0',
        method: 'updateOrCreateMediaItem',
        id: record.id,
        params: [
            // The observationId
            record.id,
            // Media Item
            mediaItem,
        ],
    });

    const method = 'POST';
    const url = new URL('/observations-rpc', endpoint);

    const headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };

    const res = await makeRequest(method, url, headers, body);

    if (res.error) {
        // eslint-disable-next-line no-console
        console.log(res);
        const error = new Error(`JSON RPC Error: ${ res.error.message }`);
        error.code = res.error.code;
        throw error;
    }

    // eslint-disable-next-line no-console
    console.log(record.id, 'updated observation media', res.result.id);

    return res.result;
}

function makeRequest(method, url, headers, data) {
    return new Promise((resolve, reject) => {
        const options = { method, headers };

        const protocol = url.protocol === 'https:' ? https : http;

        const req = protocol.request(url, options, (res) => {
            const chunks = [];

            res.on('error', (cause) => {
                reject(new Error('HTTP request error event', { cause }));
            });

            res.on('data', (chunk) => {
                chunks.push(chunk);
            });

            res.on('end', () => {
                const utf8 = Buffer.concat(chunks).toString('utf8');

                try {
                    resolve(JSON.parse(utf8));
                } catch (cause) {
                    // eslint-disable-next-line no-console
                    console.log(utf8);
                    reject(new Error('JSON parsing error', { cause }));
                }

                // Destroy the request after getting a response. This avoids hanging onto
                // request streams which get stuck because of a server error.
                // req.destroy();
            });
        });

        req.on('error', (cause) => {
            reject(new Error('HTTP request error event', { cause }));
        });

        if (data && typeof data.pipe === 'function') {
            data.pipe(req);
        } else if (data) {
            req.end(data);
        } else {
            req.end();
        }
    });
}

function contentTypeByFileExtension(filename) {
    const extname = path.extname(filename);

    switch (extname.toLowerCase()) {
        case '.mov':
            return 'video/quicktime';
        case '.m4v':
            return 'video/mp4';
        case '.heif':
            return 'image/heif';
        case '.heic':
            return 'image/heic';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        default:
            throw new Error(`No content type registered for file extension "${ extname }"`);
    }
}

async function readJSONFile(filepath) {
    const utf8 = await readUtf8File(filepath);
    return JSON.parse(utf8);
}

function readUtf8File(filepath) {
    return fsp.readFile(filepath, { encoding: 'utf8' });
}


main().catch(function catchError(err) {
    /* eslint-disable no-console */
    console.error('Caught error:');
    console.error(err);
    /* eslint-enable no-console */
});
