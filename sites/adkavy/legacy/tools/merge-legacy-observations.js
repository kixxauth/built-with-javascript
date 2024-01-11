import path from 'node:path';
import fsp from 'node:fs/promises';
import util from 'node:util';


// Command line options.
const Options = {
    // The new format records JSON file.
    recordsfile: { type: 'string' },
    // The archive directory where legacy records are located.
    legacydir: { type: 'string' },
    // The desired output directory where the new merged-observations.json file will be located.
    outdir: { type: 'string' },
};


async function main() {
    const {
        newFormatRecordsFilepath,
        legacyFilesPath,
        outputPath,
    } = parseArgs(Options);

    const outputFilepath = path.join(outputPath, 'merged-observations.json');

    const newFormatRecords = await readJSONFile(newFormatRecordsFilepath);
    const legacyFiles = await getLegacyRecordFiles(legacyFilesPath);
    const legacyRecords = [];

    for (const [ filename, filepath ] of legacyFiles) {
        const legacyRecord = await readJSONFile(filepath);
        legacyRecords.push(legacyRecord);

        if (filename.startsWith('observation_original')) {
            const newFormatRecord = findNewFormatRecord(newFormatRecords, legacyRecord);

            if (!newFormatRecord) {
                throw new Error(`Could not find matching new format record for legacy record ${ filename }`);
            }

            newFormatRecord.id = legacyRecord.id;
        } else {
            const newFormatRecord = findNewFormatRecord(newFormatRecords, legacyRecord);

            if (newFormatRecord) {
                newFormatRecord.id = legacyRecord.id;
            } else {
                newFormatRecords.unshift(transformLegacyRecord(legacyRecord));
            }
        }
    }

    for (const record of newFormatRecords) {
        const legacyRecord = findLegacyRecord(legacyRecords, record);

        if (!legacyRecord) {
            throw new Error(`Could not find matching legacy record for new format record ${ record.id }`);
        }
    }

    await writeJSONFile(outputFilepath, newFormatRecords);
}

function transformLegacyRecord(record) {
    const recordTimestamp = new Date(record.created);
    const observationTimestamp = getObservationTimestamp(record.date, record.time);

    return {
        type: 'observation',
        id: record.id,
        attributes: {
            name: (record.name || '').trim(),
            email: (record.email || '').trim().toLowerCase(),
            title: (record.title || '').trim(),
            observationTimestamp: dateToISOTZString(observationTimestamp),
            reportedDate: dateToISOTZString(recordTimestamp),
            travelMode: record.travelMode,
            location: (record.location || '').trim(),
            elevation: (record.elevation || '').trim(),
            aspect: record.aspect,
            redFlags: record.redFlags,
            triggeredAvalanche: Boolean(record.triggeredAvalanche),
            observedAvalanche: Boolean(record.observedAvalanche),
            triggeredAvalancheType: record.triggeredAvalancheType,
            triggeredAvalancheSize: record.triggeredAvalancheSize,
            triggeredAvalancheComments: record.triggeredAvalancheComments,
            observedAvalancheType: record.observedAvalancheType,
            observedAvalancheSize: record.observedAvalancheSize,
            observedAvalancheElevation: record.observedAvalancheElevation,
            observedAvalancheAspect: record.observedAvalancheAspect,
            observedAvalancheComments: record.observedAvalancheComments,
            details: (record.details || '').trim(),
            photos: record.photos,
        },
        meta: {
            created: record.created,
            updated: record.updated,
        },
    };
}

function findNewFormatRecord(records, legacyRecord) {
    return records.find(({ attributes }) => {
        const { name, email, title, location } = attributes;
        const hasName = legacyRecord.name.trim().toLowerCase() === name.trim().toLowerCase();
        const hasEmail = legacyRecord.email.trim().toLowerCase() === email.trim().toLowerCase();
        const hasTitle = legacyRecord.title.trim().toLowerCase() === title.trim().toLowerCase();
        const hasLocation = legacyRecord.location.trim().toLowerCase() === location.trim().toLowerCase();

        return hasName && hasEmail && hasTitle && hasLocation;
    });
}

function findLegacyRecord(records, newFormatRecord) {
    return records.find((legacyRecord) => {
        const { name, email, title, location } = newFormatRecord.attributes;
        const hasName = legacyRecord.name.trim().toLowerCase() === name.trim().toLowerCase();
        const hasEmail = legacyRecord.email.trim().toLowerCase() === email.trim().toLowerCase();
        const hasTitle = legacyRecord.title.trim().toLowerCase() === title.trim().toLowerCase();
        const hasLocation = legacyRecord.location.trim().toLowerCase() === location.trim().toLowerCase();

        return hasName && hasEmail && hasTitle && hasLocation;
    });
}

async function getLegacyRecordFiles(directory) {
    const entries = await fsp.readdir(directory);

    return entries
        .filter((entry) => {
            return entry.startsWith('observation_');
        })
        .map((filename) => {
            return [ filename, path.join(directory, filename) ];
        });
}

function parseArgs(options) {
    const { values } = util.parseArgs({ options });

    if (!values.recordsfile) {
        throw new Error('The recordsfile option is required');
    }
    if (!values.legacydir) {
        throw new Error('The legacydir option is required');
    }
    if (!values.outdir) {
        throw new Error('The outdir option is required');
    }

    return {
        newFormatRecordsFilepath: path.resolve(values.recordsfile),
        legacyFilesPath: path.resolve(values.legacydir),
        outputPath: path.resolve(values.outdir),
    };
}

function getObservationTimestamp(dateString, timeString) {
    // The dateString is something like "2023-10-03"
    // The timeString is something like "11:00:00 AM"
    if (typeof dateString !== 'string') {
        throw new TypeError(`Invalid dateString: ${ dateString }`);
    }
    if (typeof timeString !== 'string') {
        throw new TypeError(`Invalid timeString: ${ timeString }`);
    }
    if (!/^[\d]{4}-[\d]{2}-[\d]{2}$/.test(dateString)) {
        throw new TypeError(`Invalid dateString: "${ dateString }"`);
    }
    if (!/^[\d]+:[\d]{2}:[\d]{2} (AM|PM)$/.test(timeString)) {
        throw new TypeError(`Invalid timeString: "${ dateString }"`);
    }

    // WARNING: This only works because the machine I'm processing dates on is in the
    //          same timezone as the date string.
    return new Date(`${ dateString } ${ timeString }`);
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

async function writeJSONFile(filepath, obj) {
    const utf8 = JSON.stringify(obj, null, 4);
    await writeUtf8File(filepath, utf8);
}

function readUtf8File(filepath) {
    return fsp.readFile(filepath, { encoding: 'utf8' });
}

function writeUtf8File(filepath, utf8) {
    return fsp.writeFile(filepath, utf8, { encoding: 'utf8' });
}

main().catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
});
