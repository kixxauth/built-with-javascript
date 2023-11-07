import fs from 'node:fs';
import { KixxAssert } from '../../dependencies.js';
import { ValidationError } from '../errors.js';

const { assert, isNonEmptyString } = KixxAssert;


// Only allow word characters and "-" in key "filenames".
// eslint-disable-next-line no-useless-escape
const ALLOWED_KEY_PATH_RX = /^[\w\-\.]+$/;

const ALLOWED_STORAGE_CLASSES = [
    'STANDARD',
    'INFREQUENT_ACCESS',
];


export default class RemoteObject {

    static type = 'remote-object';

    constructor(spec) {
        Object.defineProperties(this, {
            type: {
                enumerable: true,
                value: this.constructor.type,
            },
            id: {
                enumerable: true,
                value: spec.id,
            },
            scopeId: {
                enumerable: true,
                value: spec.scopeId,
            },
            key: {
                enumerable: true,
                value: spec.key,
            },
            contentType: {
                enumerable: true,
                value: spec.contentType,
            },
            contentLength: {
                enumerable: true,
                value: spec.contentLength,
            },
            storageClass: {
                enumerable: true,
                value: spec.storageClass,
            },
            md5Hash: {
                enumerable: true,
                value: spec.md5Hash,
            },
            version: {
                enumerable: true,
                value: spec.version,
            },
            lastModifiedDate: {
                enumerable: true,
                value: spec.lastModifiedDate,
            },
            filepath: {
                enumerable: true,
                value: spec.filepath,
            },
        });
    }

    /**
     * @public
     */
    getEtag() {
        return this.md5Hash;
    }

    /**
     * @public
     */
    isVideoSource() {
        switch (this.contentType.toLowerCase()) {
            case 'video/mp4':
            case 'video/quicktime':
            case 'video/3gpp':
                return true;
        }

        return false;
    }

    /**
     * @public
     */
    updateFromS3Head(result) {
        const id = result.Metadata.id;
        const version = result.VersionId;
        // Remove the double quotes if they exist.
        const md5Hash = result.ETag.replace(/^"|"$/g, '');
        const lastModifiedDate = result.LastModified.toISOString();
        const contentType = result.ContentType;
        const contentLength = result.ContentLength;

        const spec = Object.assign({}, this, {
            id,
            md5Hash,
            version,
            lastModifiedDate,
            contentType,
            contentLength,
        });

        return new RemoteObject(spec);
    }

    /**
     * @public
     */
    updateFromS3Object(result) {
        return this.updateFromS3Head(result);
    }

    /**
     * @public
     */
    updateFromS3Put(result) {
        const version = result.VersionId;
        const contentType = result.ContentType;
        const contentLength = result.ContentLength;

        const date = result.LastModified || new Date();
        const lastModifiedDate = date.toISOString();

        return new RemoteObject(Object.assign({}, this, {
            version,
            contentType,
            contentLength,
            lastModifiedDate,
        }));
    }

    /**
     * @public
     */
    incorporateLocalObject(localObject) {
        const spec = Object.assign({}, this);

        spec.id = spec.id || localObject.id;
        spec.md5Hash = localObject.md5Hash;
        spec.filepath = localObject.filepath;

        return new RemoteObject(spec);
    }

    /**
     * @public
     */
    createReadStream() {
        assert(
            isNonEmptyString(this.filepath),
            ': RemoteObject.filepath must be a non empty string'
        );

        return fs.createReadStream(this.filepath);
    }

    /**
     * @public
     */
    setStorageClass(storageClass) {
        const spec = Object.assign({}, this, {
            storageClass: storageClass || ALLOWED_STORAGE_CLASSES[0],
        });
        return new RemoteObject(spec);
    }

    /**
     * @public
     */
    validateForFetchHead() {
        const vError = new ValidationError('Invalid RemoteObject');
        this.#validateKey(vError);

        if (vError.length > 0) {
            throw vError;
        }
    }

    /**
     * @public
     */
    validateForPut() {
        const vError = new ValidationError('Invalid RemoteObject');
        this.#validateId(vError);
        this.#validateKey(vError);
        this.#validateStorageClass(vError);

        if (vError.length > 0) {
            throw vError;
        }
    }

    /**
     * @public
     */
    validateForFetch() {
        const vError = new ValidationError('Invalid RemoteObject');
        this.#validateKey(vError);

        if (vError.length > 0) {
            throw vError;
        }
    }

    /**
     * @private
     */
    #validateId(vError) {
        vError = vError || new ValidationError('Invalid RemoteObject.id');
        if (!isNonEmptyString(this.id)) {
            vError.push('The RemoteObject id must be a non empty string', {
                pointer: 'id',
            });
        }
        return vError;
    }

    /**
     * @private
     */
    #validateKey(vError) {
        vError = vError || new ValidationError('Invalid RemoteObject.key');

        if (!isNonEmptyString(this.key)) {
            vError.push('The RemoteObject key must be a non empty string', {
                pointer: 'key',
            });
            return vError;
        }

        // Split the "/foo/bar/baz" key into parts and filter out the empty strings. This will
        // remove the leading slash, trailing slash and multiple slashes like "/foo//bar///baz".
        const parts = this.key.split('/').filter((p) => Boolean(p));

        for (const part of parts) {
            if (!ALLOWED_KEY_PATH_RX.test(part) || part.startsWith('.') || part.endsWith('.')) {
                vError.push(`Invalid key path part "${ part }"`, {
                    pointer: 'key',
                });
            }
        }

        return vError;
    }

    /**
     * @private
     */
    #validateStorageClass(vError) {
        vError = vError || new ValidationError('Invalid RemoteObject.storageClass');

        if (!ALLOWED_STORAGE_CLASSES.includes(this.storageClass)) {
            vError.push(`Invalid storageClass "${ this.storageClass }"`, {
                pointer: 'storageClass',
            });
        }
        return vError;
    }

    /**
     * @public
     */
    toJSON() {
        return {
            type: this.type,
            id: this.id,
            scopeId: this.scopeId,
            key: this.key,
            contentType: this.contentType,
            storageClass: this.storageClass,
            md5Hash: this.md5Hash,
            version: this.version,
            lastModifiedDate: this.lastModifiedDate,
            // Ignore the filepath property for better security.
        };
    }
}
