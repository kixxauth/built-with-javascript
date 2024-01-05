import { KixxAssert } from '../../dependencies.js';

const {
    assert,
    isNonEmptyString,
    isPlainObject,
} = KixxAssert;


export default class DataStore {

    constructor({ logger, eventBus, engine }) {
        Object.defineProperties(this, {
            logger: {
                value: logger,
            },
            eventBus: {
                value: eventBus,
            },
            engine: {
                value: engine,
            },
        });
    }

    async fetch(type, id) {
        assert(isNonEmptyString(type), 'fetch() type must by a non empty string');
        assert(isNonEmptyString(id), 'fetch() id must by a non empty string');
        this.logger.debug('fetch', { type, id });

        const record = await this.engine.fetch(type, id);

        return record || null;
    }

    async save(record) {
        assert(isNonEmptyString(record.type), 'save() record.type must by a non empty string');
        assert(isNonEmptyString(record.id), 'save() record.id must by a non empty string');
        assert(isPlainObject(record.attributes), 'save() record.attributes must be an object');

        record = structuredClone(record);

        record.meta = record.meta || {};
        record.relationships = record.relationships || {};

        const now = new Date();

        if (!record.meta.created) {
            record.meta.created = now.toISOString();
        }

        record.meta.updated = now.toISOString();

        await this.engine.save(record.type, record.id, record);

        const event = structuredClone(record);

        try {
            this.eventBus.emit('DataStore:updateItem', event);
        } catch (error) {
            this.logger.error('error while emitting DataStore:updateItem', { error });
            this.eventBus.emit('error', error);
        }

        return record;
    }
}