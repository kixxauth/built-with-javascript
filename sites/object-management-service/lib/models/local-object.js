export default class LocalObject {

    static type = 'local-object';

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
            filepath: {
                enumerable: true,
                value: spec.filepath,
            },
            contentLength: {
                enumerable: true,
                value: spec.contentLength,
            },
            md5Hash: {
                enumerable: true,
                value: spec.md5Hash,
            },
            sha256Hash: {
                enumerable: true,
                value: spec.sha256Hash,
            },
        });
    }

    /**
     * @public
     */
    getEtag() {
        return this.md5Hash;
    }
}
