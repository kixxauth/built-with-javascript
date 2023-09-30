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

    /*
    #### Design Decisions for generateAuthenticationToken()
    ```js
    // Create a single access token for the scoped user.
    scope.accessToken = "first access token"

    // Then, revoke that access token and create a new one simulaniously:
    scope.accessToken = "new access token"

    // The remote service which was using the first token will no longer be able
    // to access the object management service until we can update the token.
    // This would lead to unwanted down time in our remote service.

    // Instead, we use multiple access tokens:
    scope.accessTokens = [
        "first access token"
    ]

    // Then add the next one:
    scope.accessTokens = [
        "first access token",
        "new access token"
    ]

    // Now the remote service can continue using the first access token until we
    // can update it to tuse the new access token
    ```

    The *problem* is that we no longer have a way to revoke an access token without
    manually updating the database file. But, this is ok for our minimum viable product.
    We can be more sophisticated later.
    */
    generateAuthenticationToken() {
        // Make a copy of the existing tokens.
        const accessTokens = this.accessTokens.slice();

        // Add a new access token.
        accessTokens.push(randomUUID());

        const spec = Object.assign({}, this, { accessTokens });

        return new Scope(spec);
    }

    isUserAuthorized(user) {
        return this.accessTokens.includes(user.id);
    }

    toPlainObject() {
        return {
            type: this.type,
            id: this.id,
            accessTokens: this.accessTokens.slice(),
        };
    }
}
