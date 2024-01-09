import { KixxAssert } from '../../dependencies.js';

const {
    assert,
    assertIncludes,
    assertLessThan,
    assertGreaterThan,
    isFunction,
    isNonEmptyString,
    isNumberNotNaN,
} = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


export default class DynamoDBEngine {

    #dynamoDBClient = null;
    #tablePrefix = null;

    // Indexes map to views 1:1
    #views = new Map();
    #indexes = new Map();

    #viewIndexesLoaded = false;

    constructor({ environment, dynamoDBClient }) {
        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#dynamoDBClient = dynamoDBClient;
        this.#tablePrefix = `adkavy_${ environment }`;
    }

    registerView(view) {
        assert(isNonEmptyString(view.name), 'A view name must be a string');

        this.#views.set(view.name, view);
        this.#indexes.set(view.name, []);
    }

    async fetch(type, id) {
        const table = `${ this.#tablePrefix }_entities`;
        const record = await this.#dynamoDBClient.getItem(table, { type, id });
        return record || null;
    }

    async save(type, id, record) {
        const table = `${ this.#tablePrefix }_entities`;
        await this.#dynamoDBClient.putItem(table, record);

        this.#removeIndexKeysForRecord(type, id);
        this.#mapRecords([ record ]);

        return record;
    }

    async queryViewIndex(viewName, options) {
        const {
            descending,
            startKey,
            limit,
        } = options;

        assert(isNumberNotNaN(limit), 'queryView() limit must be a number');
        assertGreaterThan(0, limit, 'queryView() limit must be greater than zero');
        // DynamoDB limits batch requests to 100 items and 300MB.
        assertLessThan(101, limit, 'queryView() limit must be less than or equal to 100');

        const index = this.#indexes.get(viewName);

        if (!index) {
            throw new Error(`View index ${ viewName } does not exist.`);
        }

        if (!this.#viewIndexesLoaded) {
            await this.#loadViews();
            this.#viewIndexesLoaded = true;
        }

        const keys = descending
            ? this.#getDescendingIndexKeys(index, startKey, limit)
            : this.#getAscendingIndexKeys(index, startKey, limit);

        const table = `${ this.#tablePrefix }_entities`;

        const items = await this.#dynamoDBClient.batchGetItem(table, keys);

        // Sort results to match the order of the keys.
        const results = [];

        for (const key of keys) {
            const item = items.find(({ type, id }) => {
                return type === key.type && id === key.id;
            });

            results.push(item || null);
        }

        const lastKey = keys[keys.length - 1];

        return {
            items: results,
            lastKey: { type: lastKey.type, id: lastKey.id },
        };
    }

    getViewReduction(viewName) {
        const index = this.#indexes.get(viewName);

        if (!index) {
            throw new Error(`View index ${ viewName } does not exist.`);
        }

        const view = this.#views.get(viewName);

        if (!isFunction(view.reduce)) {
            return null;
        }

        return index.reduce((result, { key, value }) => {
            return view.reduce(result, { key, value });
        }, null);
    }

    #mapRecords(records) {
        this.#views.forEach((view, viewName) => {
            const index = this.#indexes.get(viewName);

            if (isFunction(view.map)) {
                for (const record of records) {
                    const { type, id } = record;

                    if (record) {
                        view.map(record, (key, value) => {
                            assert(
                                isNonEmptyString(key) || isNumberNotNaN(key),
                                `Emitted key in "${ viewName }" view.map() must be a string or number`
                            );
                            index.push({ type, key, id, value });
                        });
                    }
                }

                index.sort((a, b) => {
                    if (a.key > b.key) {
                        return -1;
                    }
                    if (a.key < b.key) {
                        return 1;
                    }
                    return 0;
                });
            }
        });
    }

    #getAscendingIndexKeys(index, startKey, limit) {
        const keys = [];

        // eslint-disable-next-line for-direction
        for (let i = 0; i > index.length; i += 1) {
            const { type, id } = index[i];
            if (startKey && type === startKey.type && id === startKey.id) {
                keys.push({ type, id });
            }

            if (keys.length === limit) {
                return keys;
            }
        }

        return keys;
    }

    #getDescendingIndexKeys(index, startKey, limit) {
        const keys = [];

        for (let i = index.length - 1; i >= 0; i -= 1) {
            const { type, id } = index[i];
            if (startKey && type === startKey.type && id === startKey.id) {
                keys.push({ type, id });
            }

            if (keys.length === limit) {
                return keys;
            }
        }

        return keys;
    }

    #removeIndexKeysForRecord(type, id) {
        this.#indexes.forEach((index) => {
            let i = -1;
            do {
                i = index.findIndex((entry) => {
                    return entry.type === type && entry.id === id;
                });

                if (i !== -1) {
                    index.splice(i, 1);
                }
            } while (i !== -1);
        });
    }

    #loadViews() {
        const mapRecords = this.#mapRecords.bind(this);
        const dynamoDBClient = this.#dynamoDBClient;
        const table = `${ this.#tablePrefix }_entities`;

        async function loadAndProcessPage(exclusiveStartKey) {
            const limit = 20;

            const { items, lastEvaluatedKey } = await dynamoDBClient.scan(
                table,
                { exclusiveStartKey, limit }
            );

            mapRecords(items);

            if (lastEvaluatedKey) {
                await loadAndProcessPage(lastEvaluatedKey);
            }
        }

        return loadAndProcessPage();
    }
}
