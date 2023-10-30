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

    /**
     * @public
     */
    write(obj, sourceStream) {
        return new Promise((resolve, reject) => {
            const { scopeId } = obj;
            const id = this.#generateObjectId();
            const filepath = path.join(this.#directory, scopeId, id);

            this.#ensureDirectoryFor(filepath);

            const destStream = this.createFileWriteStream(filepath);
            const hasher = crypto.createHash('md5');
            let md5Hash;

            this.#logger.log('saving object', { scopeId, id });

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

                this.#logger.log('object saved', { scopeId, id, md5Hash });

                resolve(new LocalObject(spec));
            };

            sourceStream.on('finish', onComplete);
            sourceStream.on('close', onComplete);

            sourceStream.pipe(destStream);
        });
    }

    /**
     * @public
     */
    getObjectReadStream(obj) {
        const { id, scopeId } = obj;
        assert(isNonEmptyString(id));
        assert(isNonEmptyString(scopeId));
        const filepath = path.join(this.#directory, scopeId, id);
        return this.createFileReadStream(filepath);
    }

    /**
     * @public
     */
    removeStoredObject(obj) {
        const { id, scopeId, filepath } = obj;

        this.#logger.log('removing object', { scopeId, id });

        return this.rmfile(filepath);
    }

    /**
     * @private
     */
    createFileWriteStream(filepath) {
        return fs.createWriteStream(filepath);
    }

    /**
     * @private
     */
    createFileReadStream(filepath) {
        return fs.createReadStream(filepath);
    }

    /**
     * @private
     */
    rmfile(filepath) {
        return fsp.rm(filepath);
    }

    /**
     * @private
     */
    #ensureDirectoryFor(filepath) {
        const dirpath = path.dirname(filepath);
        fs.mkdirSync(dirpath, { recursive: true });
    }

    /**
     * @private
     */
    #generateObjectId() {
        return crypto.randomUUID();
    }
}
