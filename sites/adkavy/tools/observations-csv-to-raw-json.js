import { parse as csvParse } from 'csv-parse';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

if (!process.argv[2]) {
    throw new Error('A source file is required');
}

// Should be something like:
// tmp/observations.csv
const sourceFilepath = path.resolve(process.argv[2]);

const stats = fs.statSync(sourceFilepath);

if (!stats.isFile()) {
    throw new Error(`The file ${ sourceFilepath } does not exist.`);
}

const targetDirectory = path.dirname(sourceFilepath);


const columns = [
    // 00 - Timestamp,
    'created',
    // 01 - Name,
    'name',
    // 02 - Email (will not share publicly),
    'email_1',
    // 03 - Brief title (eg. Snow Observations on Wright Peak),
    'title',
    // 04 - Observation Date,
    'observationDate',
    // 05 - Time of Observation,
    'observationTime',
    // 06 - Mode of travel,
    'travelMode',
    // 07 - "Location (eg. Johns Brook Valley) (GPS coordinates, or mountain name)",
    'location',
    // 08 - Elevation (feet above sea level) ,
    'elevation',
    // 09 - Aspect,
    'aspect',
    // 10 - What Red Flags did you observe?,
    'redFlags',
    // 11 - Did you trigger any avalanches?,
    'triggeredAvalanche',
    // 12 - Did you see any avalanches? (Not including an avalanche you triggered) ,
    'observedAvalanche',
    // 13 - "What did you observe? Enter any other pertinent information below. You can include snowpack test results, riding conditions, weather observations, red flags observed, and anything else you think helps frame the observation. This may also include more detailed information about where you traveled; aspects, elevations, routes, etc. Did you seek out or avoid specific terrain?  You can provide a link to your Snowpilot pit here if you completed one! ",
    'details',
    // 14 - Type,
    'triggeredAvalancheType',
    // 15 - Size (destructive potential),
    'triggeredAvalancheSize',
    // 16 - "Comments (Location, avalanche depth/width/length, etc)",
    'triggeredAvalancheComments',
    // 17 - Type,
    'observedAvalancheType',
    // 18 - Size (destructive potential),
    'observedAvalancheSize',
    // 19 - Elevation (feet above sea level) ,
    'observedAvalancheElevation',
    // 20 - Aspect,
    'observedAvalancheAspect',
    // 21 - "Comments (Location, avalanche depth/width/length, etc)",
    'observedAvalancheComments',
    // 22 - Email Address,
    'email_2',
    // 23 - Photos,
    'photos_1',
    // 24 - ,
    'photos_2',
    // 25 - ,
    'photos_3',
    // 26 -
    'photos_4',
];

async function main() {
    const rows = await readCSVFile(sourceFilepath);
    const utf8 = JSON.stringify(rows, null, 4);
    await writeUtf8File(path.join(targetDirectory, 'observations.json'), utf8);
}

async function readCSVFile(filepath) {
    const utf8 = await readUtf8File(filepath);
    const rows = await parseCSV(utf8);

    const records = rows.slice(1).map(function appendRowNumber(row, index) {
        row.index = index + 1;
        return row;
    });

    return records;
}

function parseCSV(utf8) {
    return new Promise(function parseCSVPromise(resolve, reject) {
        csvParse(utf8, { columns }, (err, records) => {
            if (err) {
                reject(err);
            } else {
                resolve(records);
            }
        });
    });
}

function readUtf8File(filepath) {
    return fsp.readFile(filepath, { encoding: 'utf8' });
}

function writeUtf8File(filepath, utf8) {
    return fsp.writeFile(filepath, utf8, { encoding: 'utf8' });
}

main().catch(function catchError(err) {
    /* eslint-disable no-console */
    console.error('Caught error:');
    console.error(err);
    /* eslint-enable no-console */
});
