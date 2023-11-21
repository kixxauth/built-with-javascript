import { randomUUID } from 'node:crypto';
import { KixxAssert } from '../../dependencies.js';
import { ConflictError } from '../errors.js';


const { assert, isNonEmptyString } = KixxAssert;


export default class BaseDataStoreModel {

    constructor({ id, meta, attributes, relationships }) {
        const type = this.constructor.type;

        assert(isNonEmptyString(type), `constructor.type should be a non empty string on ${ this.constructor.name }`);

        Object.defineProperties(this, {
            type: {
                enumerable: true,
                value: this.constructor.type,
            },
            id: {
                enumerable: true,
                value: id || null,
            },
            meta: {
                enumerable: true,
                value: Object.freeze(this.#mapMeta(meta)),
            },
            attributes: {
                enumerable: true,
                value: Object.freeze(this.mapAttributes(attributes)),
            },
            relationships: {
                enumerable: true,
                value: Object.freeze(relationships || {}),
            },
        });
    }

    ensureId() {
        if (isNonEmptyString(this.id)) {
            return this;
        }

        return this.generateId();
    }

    /**
     * @public
     */
    generateId() {
        const id = randomUUID();
        const Model = this.constructor;
        return new Model(Object.assign({}, this, { id }));
    }

    /**
     * @public
     */
    updateAttributes(patch) {
        const attributes = Object.assign({}, this.attributes, patch);
        const Model = this.constructor;
        return new Model(Object.assign({}, this, { attributes }));
    }

    /**
     * @public
     */
    addRelationship(key, type, id, attributes) {
        let relationships;

        if (this.relationships[key]) {
            relationships = this.relationships[key].slice();
        } else {
            relationships = [];
        }

        relationships.push({
            type,
            id,
            attributes,
        });

        const Model = this.constructor;

        return new Model(Object.assign({}, this, { relationships }));
    }

    /**
     * @public
     */
    updateRelationship(key, id, attributes) {
        // We want to know if we found the relationship by id.
        let foundTarget = false;

        let relationships = this.relationships[key];

        if (!Array.isArray(relationships)) {
            throw new ConflictError(`Unable to update relationship; No relationships for key ${ key }`);
        }

        relationships = relationships.map((item) => {
            if (item.id === id) {
                foundTarget = true;
                return item.updateAttributes(attributes);
            }

            return item;
        });

        if (!foundTarget) {
            throw new ConflictError(`Unable to update relationship; No relationship at ${ key }:${ id }`);
        }

        const Model = this.constructor;

        return new Model(Object.assign({}, this, { relationships }));
    }

    /**
     * @public
     */
    updateMeta() {
        const now = new Date();
        const created = isNonEmptyString(this.meta.created) ? this.meta.created : now.toISOString();
        const updated = now.toISOString();

        const meta = { created, updated };

        const Model = this.constructor;

        return new Model(Object.assign({}, this, { meta }));
    }

    /**
     * @public
     */
    validateBeforeSave() {
        // Override me.
    }

    /**
     * @public
     */
    toJsonAPI() {
        const relationships = Object.keys(this.relationships).reduce((mapping, key) => {
            const data = this.relationships[key];
            mapping[key] = { data };
            return mapping;
        }, {});

        return {
            type: this.type,
            id: this.id,
            meta: this.meta,
            attributes: this.attributes,
            relationships,
        };
    }

    /**
     * @private
     */
    mapAttributes(attrs) {
        // Override me.
        return attrs || {};
    }

    /**
     * @private
     */
    #mapMeta(meta) {
        meta = meta || {};
        return Object.freeze({
            created: meta.created || null,
            updated: meta.updated || null,
        });
    }

    static fromJsonAPI({ id, attributes, relationships }) {
        const mappedRelationships = Object.keys(relationships || {}).reduce((mapping, key) => {
            const { data } = relationships[key] || {};
            mapping[key] = data || [];
            return mapping;
        }, {});

        const Model = this;

        return new Model({
            id,
            attributes,
            relationships: mappedRelationships,
        });
    }
}
