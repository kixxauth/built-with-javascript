import util from 'node:util';
import { KixxAssert } from '../../dependencies.js';
import { ConflictError, NotFoundError } from '../errors/mod.js';

const { assert, isNonEmptyString } = KixxAssert;


export default class DataStoreModel {

    /**
     * @public
     */
    mergeAttributes(attrs) {
        if (!isPlainObject(attrs)) {
            return this;
        }

        const Model = this.constructor;
        const { type } = Model;
        const { id, relationships, meta } = this;
        const attributes = Object.assign({}, this.attributes, attrs);

        return new Model({
            type,
            id,
            attributes,
            relationships,
            meta,
        });
    }

    /**
     * @public
     */
    mergeRelationships(rel) {
        if (!isPlainObject(rel)) {
            return this;
        }

        const Model = this.constructor;
        const { type } = Model;
        const { id, attributes, meta } = this;
        const relationships = Object.assign({}, this.relationships, rel);

        return new Model({
            type,
            id,
            attributes,
            relationships,
            meta,
        });
    }

    beforeSave() {
        // Override me.
        return this;
    }

    /**
     * @public
     */
    async save(dataStore) {
        const model = this.beforeSave();
        const record = await dataStore.save(model);
        return new Model(record);
    }

    /**
     * @public
     */
    static async create(dataStore, id, attributes, relationships) {
        const Model = this;
        const { type } = Model;

        if (id) {
            const existing = await Model.load(dataStore, id);

            if (existing) {
                throw new ConflictError(`DataStore create() ${ type }:${ id } already exists`);
            }
        } else {
            id = util.randomUUID();
        }

        let model = new Model({
            id,
            attributes: attributes || {},
            relationships: relationships || {},
        });

        model = model.beforeSave();

        const record = await dataStore.save(model);

        return new Model(record);
    }

    /**
     * @public
     */
    static async update(dataStore, id, attributes, relationships) {
        assert(isNonEmptyString(id), 'Model.update() must have an id');

        const Model = this.constructor;
        const { type } = Model;

        let model = await Model.load(dataStore, id);

        if (!model) {
            throw new NotFoundError(`DataStore update() ${ type }:${ id } does not exist`);
        }

        model = model
            .mergeAttributes(attributes)
            .mergeRelationships(relationships)
            .beforeSave();

        const record = await dataStore.save(model);

        return new Model(record);
    }

    static async createOrUpdate(dataStore, id, attributes, relationships) {
        assert(isNonEmptyString(id), 'Model.createOrUpdate() must have an id');

        const Model = this.constructor;
        const { type } = Model;

        let model = await Model.load(dataStore, id);

        if (model) {
            model = model.mergeAttributes(attributes).mergeRelationships(relationships);
        } else {
            model = new Model({
                id,
                attributes: attributes || {},
                relationships: relationships || {},
            });
        }

        model = model.beforeSave();

        const record = await dataStore.save(model);

        return new Model(record);
    }

    /**
     * @public
     */
    static async load(dataStore, id) {
        const Model = this;
        const type = Model.type;
        const record = await dataStore.fetch(type, id);

        if (!record) {
            return null;
        }

        return new Model(record);
    }
}
