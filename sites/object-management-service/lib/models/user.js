export default class User {

    static type = 'user';

    constructor(spec) {
        let groups = [];

        if (Array.isArray(spec.groups)) {
            // Make a copy of the Array befeore we freeze it.
            groups = spec.groups.slice();
        }

        Object.defineProperties(this, {
            type: {
                enumerable: true,
                value: this.constructor.type,
            },
            id: {
                enumerable: true,
                value: spec.id,
            },
            groups: {
                enumerable: true,
                writable: false,
                value: Object.freeze(groups),
            },
        });
    }

    isAdminUser() {
        return this.groups.includes('admin');
    }

    static async fetch(dataStore, id) {
        const sourceData = await dataStore.fetch(this.type, id);
        return sourceData ? new User(sourceData) : null;
    }
}
