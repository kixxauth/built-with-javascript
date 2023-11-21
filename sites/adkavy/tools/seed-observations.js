// Use the HTTP interface of the adkavy site to seed the database.
// Takes the output of transform-raw-observation-json-to-records.js as input.
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';


if (!process.argv[2]) {
    throw new Error('A source file is required');
}

if (!process.argv[3]) {
    throw new Error('An endpoint is required');
}

// Should be something like:
// tmp/observations_records.json
const sourceFilepath = path.resolve(process.argv[2]);

// Something like:
// http://localhost:3033
const endpoint = process.argv[3];

const stats = fs.statSync(sourceFilepath);

if (!stats.isFile()) {
    throw new Error(`The file ${ sourceFilepath } does not exist.`);
}


async function main() {
    const records = await readJSONFile(sourceFilepath);
    await createObservation(records[1]);
    await updateObservation(records[1]);
}

async function createObservation(record) {
    const body = JSON.stringify({
        data: {
            type: 'observation',
            id: record.id,
            attributes: {
                csv: record.attributes.csv,
                reportedDateTime: record.attributes.reportedDate,
                observationDate: record.attributes.observationTimestamp.split('T')[0],
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
}

async function updateObservation(record) {
    const timeMatch = /T([\d]{2}:[\d]{2}):/.exec(record.attributes.observationTimestamp);
    const observationTime = timeMatch[1];

    const body = JSON.stringify({
        data: {
            type: 'observation',
            id: record.id,
            attributes: {
                name: record.attributes.name,
                email: record.attributes.email,
                title: record.attributes.title,
                observationTime,
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
