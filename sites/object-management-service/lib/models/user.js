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

    /**
     * @public
     */
    isAdminUser() {
        return this.groups.includes('admin');
    }

    /**
     * @public
     */
    setScope(scope) {
        // Clone this user first.
        const user = new User(this);

        // Then assign the scope property.
        return Object.defineProperty(user, 'scope', {
            enumerable: true,
            writable: false,
            value: scope,
        });
    }

    /**
     * @public
     */
    toJSON() {
        // Only serialize a subset of properties.
        return {
            type: this.type,
            id: this.id,
            groups: this.groups,
        };
    }
}
