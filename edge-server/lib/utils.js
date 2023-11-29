import fsp from 'node:fs/promises';


export function isNonEmptyString(x) {
    return x && typeof x === 'string';
}

export async function readBufferFile(filepath) {
    let result;
    try {
        result = await fsp.readFile(filepath, { encoding: null });
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null;
        }
        throw err;
    }
    return result;
}

export async function readJsonFile(filepath) {
    const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
    return JSON.parse(utf8);
}

export function createCounter(start) {
    return function incrementCounter() {
        const rval = start;
        start += 1;
        return rval;
    };
}
