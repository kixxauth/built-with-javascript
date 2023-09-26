export default class User {
    constructor(spec) {
        let groups = [];
        if (Array.isArray(spec.groups)) {
            groups = spec.groups.slice();
        }

        Object.defineProperties(this, {
            type: {
                enumerable: true,
                writable: false,
                value: 'user',
            },
            id: {
                enumerable: true,
                writable: false,
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
}
