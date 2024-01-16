import util from 'node:util';
import { KixxAssert } from '../../dependencies.js';
import Errors from '../errors/mod.js';

const { ConflictError, NotFoundError } = Errors;
const { assert, isNonEmptyString, isPlainObject } = KixxAssert;


export default class DataStoreModel {

    constructor(spec) {
        const { id, attributes, meta } = spec || {};

        assert(
            isNonEmptyString(this.constructor.type),
            `The DataStoreModel "${ this.constructor.name }" does not have a type`
        );

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
                value: Object.freeze(meta || {}),
            },
            attributes: {
                enumerable: true,
                value: Object.freeze(this.mapAttributes(attributes || {})),
            },
        });
    }

    /**
     * @private
     */
    mapAttributes(attrs) {
        // Override me.
        return attrs;
    }

    /**
     * @public
     */
    updateAttributes(attrs) {
        assert(isPlainObject(attrs), 'update() attributes must be a plain object');

        const Model = this.constructor;
        const { id, meta } = this;
        const attributes = this.mergeAttributes(attrs);

        return new Model({
            id,
            attributes,
            meta,
        });
    }

    /**
     * Intended to override.
     * @private
     */
    mergeAttributes(attrs) {
        return Object.assign({}, this.attributes, attrs);
    }

    /**
     * @public
     */
    async save(dataStore) {
        const Model = this.constructor;
        const record = await dataStore.save(this);
        return new Model(record);
    }

    /**
     * @public
     */
    static async create(dataStore, id, attributes) {
        const Model = this;

        if (id) {
            const existing = await Model.load(dataStore, id);

            if (existing) {
                const { type } = Model;
                throw new ConflictError(`DataStore create() ${ type }:${ id } already exists`);
            }
        } else {
            id = util.randomUUID();
        }

        const model = new Model({
            id,
            attributes: attributes || {},
        });

        const record = await dataStore.save(model);

        return new Model(record);
    }

    /**
     * @public
     */
    static async update(dataStore, id, attributes) {
        assert(isNonEmptyString(id), 'Model.update() must have an id');

        const Model = this;

        let model = await Model.load(dataStore, id);

        if (!model) {
            const { type } = Model;
            throw new NotFoundError(`DataStore update() ${ type }:${ id } does not exist`);
        }

        model = model.updateAttributes(attributes);

        const record = await dataStore.save(model);

        return new Model(record);
    }

    static async createOrUpdate(dataStore, id, attributes) {
        const Model = this;
        let model;

        if (id) {
            model = await Model.load(dataStore, id);

            if (model) {
                model = model.updateAttributes(attributes);
            }
        }

        if (!model) {
            model = new Model({
                id: isNonEmptyString(id) ? id : util.randomUUID(),
                attributes: attributes || {},
            });
        }

        const record = await dataStore.save(model);

        return new Model(record);
    }

    /**
     * @public
     */
    static async load(dataStore, id) {
        const Model = this;
        const { type } = Model;

        assert(
            isNonEmptyString(type),
            `The DataStoreModel "${ this.name }" does not have a type`
        );

        const record = await dataStore.fetch(type, id);

        if (!record) {
            return null;
        }

        return new Model(record);
    }
}
