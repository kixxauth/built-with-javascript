import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto'; // eslint-disable-line no-shadow
import LocalObject from './models/local-object.js';
import { KixxAssert } from '../dependencies.js';

const { assert, isNonEmptyString } = KixxAssert;


export default class LocalObjectStore {

    #logger = null;
    #directory = null;

    constructor({ logger, config }) {
        this.#logger = logger.createChild({ name: 'LocalObjectStore' });
        this.#directory = config.localObjectStore.getDirectory();
    }

    write(obj, sourceStream) {
        return new Promise((resolve, reject) => {
            const { scopeId } = obj;
            const id = this.#generateObjectId();
            const filepath = path.join(this.#directory, scopeId, id);

            this.#ensureDirectoryFor(filepath);

            const destStream = this.private_createFileWriteStream(filepath);
            const hasher = crypto.createHash('md5');
            let md5Hash;

            this.#logger.log('saving object', { id, filepath });

            sourceStream.on('error', reject);
            destStream.on('error', reject);

            sourceStream.on('data', (chunk) => {
                hasher.update(chunk);
            });

            sourceStream.on('end', () => {
                md5Hash = hasher.digest('hex');
            });

            const onComplete = () => {
                sourceStream.off('error', reject);
                destStream.off('error', reject);
                destStream.off('finish', onComplete);
                destStream.off('close', onComplete);

                const spec = Object.assign({}, obj, {
                    id,
                    filepath,
                    md5Hash,
                });

                this.#logger.log('object saved', { id, filepath, md5Hash });

                resolve(new LocalObject(spec));
            };

            sourceStream.on('finish', onComplete);
            sourceStream.on('close', onComplete);

            sourceStream.pipe(destStream);
        });
    }

    getObjectReadStream(obj) {
        const { id, scopeId } = obj;
        assert(isNonEmptyString(id));
        assert(isNonEmptyString(scopeId));
        const filepath = path.join(this.#directory, scopeId, id);
        return this.private_createFileReadStream(filepath);
    }

    removeStoredObject(obj) {
        const { filepath } = obj;
        return this.private_rmfile(filepath);
    }

    // Private - Use public notation for testing.
    private_createFileWriteStream(filepath) {
        return fs.createWriteStream(filepath);
    }

    // Private - Use public notation for testing.
    private_createFileReadStream(filepath) {
        return fs.createReadStream(filepath);
    }

    // Private - Use public notation for testing.
    private_rmfile(filepath) {
        return fsp.rm(filepath);
    }

    #ensureDirectoryFor(filepath) {
        const dirpath = path.dirname(filepath);
        fs.mkdirSync(dirpath, { recursive: true });
    }

    #generateObjectId() {
        return crypto.randomUUID();
    }
}
