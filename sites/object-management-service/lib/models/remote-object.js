import { KixxAssert } from '../../dependencies.js';
import { ValidationError } from '../errors.js';

const { isNonEmptyString } = KixxAssert;


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
            etag: {
                enumerable: true,
                value: spec.etag,
            },
            version: {
                enumerable: true,
                value: spec.version,
            },
            lastModifiedDate: {
                enumerable: true,
                value: spec.lastModifiedDate,
            },
        });
    }

    getEtag() {
        return this.etag;
    }

    updateFromS3Head(result) {
        const id = result.Metadata.id;
        const version = result.VersionId;
        // Remove the double quotes if they exist.
        const etag = result.ETag.replace(/^"|"$/g, '');
        const lastModifiedDate = result.LastModified.toISOString();

        const spec = Object.assign({}, this, {
            id,
            etag,
            version,
            lastModifiedDate,
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
}
