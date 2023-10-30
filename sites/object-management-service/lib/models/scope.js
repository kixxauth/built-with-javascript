import { randomUUID } from 'node:crypto';


export default class Scope {

    static type = 'scope';

    constructor(spec) {
        let accessTokens = [];

        if (Array.isArray(spec.accessTokens)) {
            // Make a copy of the Array befeore we freeze it.
            accessTokens = spec.accessTokens.slice();
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
            accessTokens: {
                enumerable: true,
                value: Object.freeze(accessTokens),
            },
        });
    }

    /**
     * @public
     */
    generateAuthenticationToken() {
        // Make a copy of the existing tokens.
        const accessTokens = this.accessTokens.slice();

        // Add a new access token.
        accessTokens.push(randomUUID());

        const spec = Object.assign({}, this, { accessTokens });

        return new Scope(spec);
    }

    /**
     * @public
     */
    isUserAuthorized(user) {
        return this.accessTokens.includes(user.id);
    }

    /**
     * @public
     */
    toJSON() {
        // Only serialize a subset of properties.
        return {
            type: this.type,
            id: this.id,
            accessTokens: this.accessTokens,
        };
    }
}
