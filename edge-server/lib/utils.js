import fsp from 'node:fs/promises';


export function isNonEmptyString(x) {
    return x && typeof x === 'string';
}

export function readBufferFile(filepath) {
    return fsp.readFile(filepath, { encoding: null });
}

export async function readJsonFile(filepath) {
    const utf8 = await fsp.readFile(filepath, { encoding: 'utf8' });
    return JSON.parse(utf8);
}
