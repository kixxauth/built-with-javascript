// Use the HTTP interface of the adkavy site to seed the database.
// Takes the output of transform-raw-observation-json-to-records.js as input.
// Reads media files from tmp/observation-media/**

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
        await updateObservation(record);
        await uploadAllMedia(record);
    }
}

async function createObservation(record) {
    const body = JSON.stringify({
        data: {
            type: 'observation',
            id: record.id,
            attributes: {
                csv: record.attributes.csv,
                reportedDateTime: record.attributes.reportedDate,
                observationDateTime: record.attributes.observationTimestamp,
                travelMode: record.attributes.travelMode,
                triggeredAvalanche: record.attributes.triggeredAvalanche,
                observedAvalanche: record.attributes.observedAvalanche,
                location: record.attributes.location,
                title: record.attributes.title,
            },
        },
    });

    const method = 'POST';
    const url = new URL('/observations/', endpoint);

    const headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };

    const result = await makeRequest(method, url, headers, body);

    // eslint-disable-next-line no-console
    console.log(result.data.id, 'created observation');

    return result.data;
}

async function updateObservation(record) {
    const body = JSON.stringify({
        data: {
            type: 'observation',
            id: record.id,
            attributes: {
                name: record.attributes.name,
                email: record.attributes.email,
                title: record.attributes.title,
                elevation: record.attributes.elevation,
                aspect: record.attributes.aspect,
                redFlags: record.attributes.redFlags,
                details: record.attributes.details,
                triggeredAvalancheType: record.attributes.triggeredAvalancheType,
                triggeredAvalancheSize: record.attributes.triggeredAvalancheSize,
                triggeredAvalancheComments: record.attributes.triggeredAvalancheComments,
                observedAvalancheType: record.attributes.observedAvalancheType,
                observedAvalancheSize: record.attributes.observedAvalancheSize,
                observedAvalancheElevation: record.attributes.observedAvalancheElevation,
                observedAvalancheAspect: record.attributes.observedAvalancheAspect,
                observedAvalancheComments: record.attributes.observedAvalancheComments,
            },
        },
    });

    const method = 'PATCH';
    const url = new URL(`/observations/${ record.id }`, endpoint);

    const headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };

    const result = await makeRequest(method, url, headers, body);

    // eslint-disable-next-line no-console
    console.log(result.data.id, 'updated observation');

    return result.data;
}

async function uploadAllMedia(record) {
    if (record.attributes.csv && record.attributes.csv.hasPhotos) {
        const { row } = record.attributes.csv;
        const dir = path.join(path.dirname(sourceFilepath), 'observation-media', row.toString());

        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
            const mediaId = await attachMedia(record, path.join(dir, entry));
            if (mediaId) {
                await updateMediaMetadata(record, { title: record.attributes.title }, mediaId);
            }
        }
    } else if (record.attributes.photos && record.attributes.photos.length > 0) {
        for (const { filename, title, details } of record.attributes.photos) {
            const filepath = path.join(path.dirname(sourceFilepath), 'observation-media', filename);
            const mediaId = await attachMedia(record, filepath);
            if (mediaId) {
                await updateMediaMetadata(record, { title, details }, mediaId);
            }
        }
    }
}

async function attachMedia(record, filepath) {
    const filename = slugify(path.basename(filepath));
    const stats = fs.statSync(filepath);
    const readStream = fs.createReadStream(filepath);

    const method = 'PUT';
    const url = new URL(`/observations/${ record.id }/media/${ filename }`, endpoint);

    const headers = {
        'content-type': contentTypeByFileExtension(filename),
        'content-length': stats.size,
    };

    const { errors, data } = await makeRequest(method, url, headers, readStream);

    if (errors) {
        const msg = errors[0]?.detail || 'No server error message';
        // eslint-disable-next-line no-console
        console.log(record.id, 'error attaching observation media', errors);
        throw new Error(msg);
    }
    if (data) {
        // eslint-disable-next-line no-console
        console.log(record.id, 'attached observation media', data.id, data.attributes.contentType);
        return data.id;
    }

    // eslint-disable-next-line no-console
    console.log(record.id, 'observation media already exists', filepath);
    return null;
}

async function updateMediaMetadata(record, attributes, mediaId) {
    const { title, details } = attributes;

    const method = 'PATCH';
    const url = new URL(`/observations/${ record.id }/media/${ mediaId }`, endpoint);

    const body = JSON.stringify({
        data: {
            type: 'media',
            attributes: { title, details },
        },
    });

    const headers = {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
    };

    const { errors, data } = await makeRequest(method, url, headers, body);

    if (errors) {
        const msg = errors[0]?.detail || 'No server error message';
        // eslint-disable-next-line no-console
        console.log(record.id, 'error attaching observation media', errors);
        throw new Error(msg);
    }

    // eslint-disable-next-line no-console
    console.log(record.id, 'updated observation media', data.id);

    return data;
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

function slugify(text) {
    /* eslint-disable no-multi-spaces,no-useless-escape */
    return text
        .toString()                      // Cast to string (optional)
        .normalize('NFKD')               // The normalize() using NFKD method returns the Unicode Normalization Form of a given string.
        .replace(/[\u0300-\u036f]/g, '') // Deletes all the accents, which happen to be all in the \u03xx UNICODE block
        .toLowerCase()                   // Convert the string to lowercase letters
        .trim()                          // Remove whitespace from both sides of a string (optional)
        .replace(/\s+/g, '-')            // Replace spaces with -
        .replace(/[^\w\-\.]+/g, '')        // Remove all non-word chars
        // .replace(/\_/g, '-')             // Replace _ with -
        .replace(/\-\-+/g, '-')          // Replace multiple - with single -
        .replace(/\-$/g, '');            // Remove trailing -
    /* eslint-enable no-multi-spaces,no-useless-escape */
}

function contentTypeByFileExtension(filename) {
    const extname = path.extname(filename);

    switch (extname) {
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
