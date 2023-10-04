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

    getEtag() {
        return this.md5Hash;
    }

    updateFromS3Head(result) {
        const id = result.Metadata.id;
        const version = result.VersionId;
        // Remove the double quotes if they exist.
        const md5Hash = result.ETag.replace(/^"|"$/g, '');
        const lastModifiedDate = result.LastModified.toISOString();

        const spec = Object.assign({}, this, {
            id,
            md5Hash,
            version,
            lastModifiedDate,
        });

        return new RemoteObject(spec);
    }

    updateFromS3Put(result) {
        const version = result.VersionId;
        return new RemoteObject(Object.assign({}, this, { version }));
    }

    incorporateLocalObject(localObject) {
        const spec = Object.assign({}, this);

        spec.id = spec.id || localObject.id;
        spec.md5Hash = localObject.md5Hash;
        spec.filepath = localObject.filepath;

        return new RemoteObject(spec);
    }

    createReadStream() {
        assert(
            isNonEmptyString(this.filepath),
            ': RemoteObject.filepath must be a non empty string'
        );

        return fs.createReadStream(this.filepath);
    }

    setStorageClass(storageClass) {
        const spec = Object.assign({}, this, {
            storageClass: storageClass || ALLOWED_STORAGE_CLASSES[0],
        });
        return new RemoteObject(spec);
    }

    validateForFetchHead() {
        const vError = new ValidationError('Invalid RemoteObject');
        this.validateKey(vError);

        if (vError.length > 0) {
            throw vError;
        }
    }

    validateForPut() {
        const vError = new ValidationError('Invalid RemoteObject');
        this.validateId(vError);
        this.validateKey(vError);
        this.validateStorageClass(vError);

        if (vError.length > 0) {
            throw vError;
        }
    }

    validateId(vError) {
        vError = vError || new ValidationError('Invalid RemoteObject.id');
        if (!isNonEmptyString(this.id)) {
            vError.push('The RemoteObject id must be a non empty string', {
                pointer: 'id',
            });
        }
        return vError;
    }

    validateKey(vError) {
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

    validateStorageClass(vError) {
        vError = vError || new ValidationError('Invalid RemoteObject.storageClass');

        if (!ALLOWED_STORAGE_CLASSES.includes(this.storageClass)) {
            vError.push(`Invalid storageClass "${ this.storageClass }"`, {
                pointer: 'storageClass',
            });
        }
        return vError;
    }

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
