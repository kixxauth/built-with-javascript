import { KixxAssert } from '../../dependencies.js';
import CacheablePage from './cacheable-page.js';

const { assert, isNonEmptyString, isNumberNotNaN, isBoolean } = KixxAssert;


export default class ListEntitiesPage extends CacheablePage {

    #dataType = null;
    #viewName = null;
    #descending = false;
    #limit = 10;

    constructor(spec) {
        super(spec);

        const {
            dataType,
            viewName,
            descending,
            limit,
        } = spec;

        assert(isNonEmptyString(dataType));
        assert(isNonEmptyString(viewName));

        this.#dataType = dataType;
        this.#viewName = viewName;
        this.#descending = Boolean(descending);

        if (isNumberNotNaN(limit)) {
            this.#limit = limit;
        }
    }

    /**
     * @private
     * @param {String} args.startkey [description]
     * @param {Boolean} args.descending [description]
     * @param {Number} args.limit [description]
     */
    async getDynamicData(args) {
        const startKey = args.startkey ? { type: this.#dataType, id: args.startkey } : null;
        const descending = isBoolean(args.descending) ? args.descending : this.#descending;

        let limit;

        if (args.limit) {
            const limitInt = parseInt(args.limit, 10);
            if (isNumberNotNaN(limitInt)) {
                limit = limitInt;
            } else {
                limit = this.#limit;
            }
        } else {
            limit = this.#limit;
        }

        const result = await this.dataStore.queryViewIndex(this.#viewName, {
            descending,
            startKey,
            limit,
        });

        let items;

        if (Array.isArray(result.items)) {
            items = result.items.map(this.mapDataStoreRecordToView.bind(this));
        } else {
            items = [];
        }

        let newStartKey;

        if (result.lastKey) {
            newStartKey = result.lastKey.id;
        }

        return { items, startkey: newStartKey };
    }
}
