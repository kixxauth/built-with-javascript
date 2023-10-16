import crypto from 'node:crypto'; // eslint-disable-line no-shadow
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

async function main() {
    const rows = await readJSONFile(sourceFilepath);
    const records = rows.map(transformRecord);
    const utf8 = JSON.stringify(records, null, 4);
    process.stdout.write(utf8 + '\n');
}

function transformRecord(record) {
    try {
        const now = new Date();
        const recordTimestamp = getRecordTimestamp(record.created);
        const observationTimestamp = getObservationTimestamp(record.observationDate, record.observationTime);

        let triggeredAvalanche = mapBoolean(record.triggeredAvalanche);
        let observedAvalanche = mapBoolean(record.observedAvalanche);

        let triggeredAvalancheType = mapAvalancheType(record.triggeredAvalancheType);
        let triggeredAvalancheSize = mapAvalancheSize(record.triggeredAvalancheSize);
        let triggeredAvalancheComments = (record.triggeredAvalancheComments || '').trim();
        let observedAvalancheType = mapAvalancheType(record.observedAvalancheType);
        let observedAvalancheSize = mapAvalancheSize(record.observedAvalancheSize);
        let observedAvalancheElevation = (record.observedAvalancheElevation || '').trim();
        let observedAvalancheAspect = mapAspect(record.observedAvalancheAspect);
        let observedAvalancheComments = (record.observedAvalancheComments || '').trim();

        if (!triggeredAvalanche) {
            triggeredAvalanche = Boolean(triggeredAvalancheType || triggeredAvalancheSize || triggeredAvalancheComments);
        }
        if (!observedAvalanche) {
            observedAvalanche = Boolean(observedAvalancheType || observedAvalancheSize || observedAvalancheComments);
        }

        if (triggeredAvalanche) {
            observedAvalanche = false;
            triggeredAvalancheType = triggeredAvalancheType || observedAvalancheType;
            triggeredAvalancheSize = triggeredAvalancheSize || observedAvalancheSize;
            triggeredAvalancheComments = triggeredAvalancheComments || observedAvalancheComments;
            observedAvalancheType = null;
            observedAvalancheSize = null;
            observedAvalancheElevation = '';
            observedAvalancheAspect = null;
            observedAvalancheComments = '';
        } else if (observedAvalanche) {
            triggeredAvalanche = false;
            observedAvalancheType = observedAvalancheType || triggeredAvalancheType;
            observedAvalancheSize = observedAvalancheSize || triggeredAvalancheSize;
            observedAvalancheComments = observedAvalancheComments || triggeredAvalancheComments;
            triggeredAvalancheType = null;
            triggeredAvalancheSize = null;
            triggeredAvalancheComments = '';
        } else {
            triggeredAvalancheType = null;
            triggeredAvalancheSize = null;
            triggeredAvalancheComments = '';
            observedAvalancheType = null;
            observedAvalancheSize = null;
            observedAvalancheElevation = '';
            observedAvalancheAspect = null;
            observedAvalancheComments = '';
        }

        return {
            type: 'observation',
            id: crypto.randomUUID(),
            attributes: {
                csv: {
                    row: record.index,
                    hasPhotos: Boolean(record.photos_1 || record.photos_2 || record.photos_3 || record.photos_4),
                },
                name: (record.name || '').trim(),
                email: (record.email_1 || '').trim().toLowerCase(),
                title: (record.title || '').trim(),
                observationTimestamp: dateToISOTZString(observationTimestamp),
                reportedDate: dateToISOTZString(recordTimestamp),
                travelMode: mapTravelMode(record.travelMode),
                location: (record.location || '').trim(),
                elevation: (record.elevation || '').trim(),
                aspect: mapAspect(record.aspect),
                redFlags: mapRedFlags(record.redFlags),
                triggeredAvalanche,
                observedAvalanche,
                triggeredAvalancheType,
                triggeredAvalancheSize,
                triggeredAvalancheComments,
                observedAvalancheType,
                observedAvalancheSize,
                observedAvalancheElevation,
                observedAvalancheAspect,
                observedAvalancheComments,
                details: (record.details || '').trim(),
            },
            meta: {
                created: recordTimestamp.toISOString(),
                updated: now.toISOString(),
            },
        };
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(record);
        throw err;
    }
}

function mapBoolean(str) {
    switch ((str || '').toLowerCase()) {
        case 'yes':
            return true;
        case 'no':
            return false;
        default:
            throw new TypeError(`Boolean "${ str }" uknkown`);
    }
}

function mapTravelMode(value) {
    switch (value.toLowerCase()) {
        case 'skiing/snowboarding':
            return 'skiing_or_snowboarding';
        case 'xc skiing/snowshoeing':
            return 'xc_skiing_or_snowshoeing';
        case 'walking/hiking':
            return 'walking_hiking';
        case 'snowmobiling':
            return 'snowmobiling';
        case 'driving':
            return 'driving';
        case 'other':
            return 'other';
        default:
            throw new TypeError(`Travel Mode "${ value }" uknkown`);
    }
}

function mapAvalancheType(str) {
    switch (str.toLowerCase()) {
        case '':
            return null;
        case 'slab':
            return 'slab';
        case 'wet loose':
            return 'wet_loose';
        case 'dry loose (sluff)':
            return 'sluff';
        case 'other':
            return 'other';
        default:
            throw new TypeError(`AvalancheType "${ str }" uknkown`);
    }
}

function mapAvalancheSize(str) {
    switch (str.toLowerCase()) {
        case '':
            return null;
        case 'd1: relatively harmless to people':
            return 'd1';
        case 'd2: could bury, injure, or kill a person':
            return 'd2';
        case 'd3: could bury and destroy a car, damage a truck, destroy a wood frame house, or break a few trees':
            return 'd3';
        case 'd4: could destroy a railway car, large truck, several buildings, or a substantial amount of forest':
            return 'd4';
        default:
            throw new TypeError(`AvalancheSize "${ str }" uknkown`);
    }
}

function mapAspect(value) {
    switch (value.toUpperCase()) {
        case 'N':
        case 'NE':
        case 'E':
        case 'SE':
        case 'S':
        case 'SW':
        case 'W':
        case 'NW':
            return value.toUpperCase();
        case '':
            return null;
        default:
            throw new TypeError(`Aspect "${ value }" uknkown`);
    }
}

function mapRedFlags(value) {
    if (!value) {
        return [];
    }

    const str = value.replace(/whumpfing,/i, 'whumpfing/');

    const parts = str.split(',').map((part) => {
        return part.trim().replace(/[\s]+/g, '').toLowerCase();
    });

    return parts.map((part) => {
        switch (part) {
            case 'recentavalanches':
                return 'recent_avalanches';
            case 'shootingcracks':
                return 'shooting_cracks';
            case 'whumpfing/collapsing':
                return 'whumpfing_collapsing';
            case 'heavysnowfall(orotherprecipitation)':
                return 'heavy_precipitation';
            case 'rapidwarming':
                return 'rapid_warming';
            case 'driftingsnow(windloading)':
                return 'drifting_snow';
            default:
                throw new TypeError(`Red Flag "${ part }" uknkown`);
        }
    });
}

function getObservationTimestamp(dateString, timeString) {
    // The dateString is something like "3/10/2023"
    // The timeString is something like "11:00:00 AM"
    if (typeof dateString !== 'string') {
        throw new TypeError(`Invalid dateString: ${ dateString }`);
    }
    if (typeof timeString !== 'string') {
        throw new TypeError(`Invalid timeString: ${ timeString }`);
    }
    if (!/^[\d]+\/[\d]+\/[\d]{4}$/.test(dateString)) {
        throw new TypeError(`Invalid dateString: "${ dateString }"`);
    }
    if (!/^[\d]+:[\d]{2}:[\d]{2} (AM|PM)$/.test(timeString)) {
        throw new TypeError(`Invalid timeString: "${ dateString }"`);
    }

    // WARNING: This only works because the machine I'm processing dates on is in the
    //          same timezone as the date string.
    return new Date(`${ dateString } ${ timeString }`);
}

function getRecordTimestamp(datetimeString) {
    // The datetimeString is something like "3/15/2023 20:59:15".
    if (typeof datetimeString !== 'string') {
        throw new TypeError(`Invalid datetimeString: ${ datetimeString }`);
    }
    if (!/^[\d]+\/[\d]+\/[\d]{4} [\d]+:[\d]{2}:[\d]{2}$/.test(datetimeString)) {
        throw new TypeError(`Invalid datetimeString: "${ datetimeString }"`);
    }

    // WARNING: This only works because the machine I'm processing dates on is in the
    //          same timezone as the date string.
    return new Date(datetimeString);
}

function dateToISOTZString(date) {
    const tzo = -date.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';

    function pad(num) {
        return (num < 10 ? '0' : '') + num;
    }

    return date.getFullYear()
        + '-' + pad(date.getMonth() + 1)
        + '-' + pad(date.getDate())
        + 'T' + pad(date.getHours())
        + ':' + pad(date.getMinutes())
        + ':' + pad(date.getSeconds())
        + dif + pad(Math.floor(Math.abs(tzo) / 60))
        + ':' + pad(Math.abs(tzo) % 60);
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
