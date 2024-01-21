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

    #logger = null;
    #dynamoDBClient = null;
    #tablePrefix = null;

    // Indexes map to views 1:1
    #views = new Map();
    #indexes = new Map();

    #viewIndexesLoaded = false;

    constructor({ environment, logger, dynamoDBClient }) {
        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#logger = logger;
        this.#dynamoDBClient = dynamoDBClient;
        this.#tablePrefix = `adkavy_${ environment }`;
    }

    registerView(view) {
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

    async queryViewIndex(viewName, query, options) {
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
            ? this.#getDescendingIndexKeys(index, startKey, query, limit)
            : this.#getAscendingIndexKeys(index, startKey, query, limit);

        let hasNextPage = false;

        // If there are more items, then the number of keys will be limit + 1.
        if (keys.length > limit) {
            hasNextPage = true;
            // Pop off the last key if the length is over the limit.
            keys.pop();
        }

        const table = `${ this.#tablePrefix }_entities`;

        const items = await this.#dynamoDBClient.batchGetItem(table, keys);

        // Sort the results of the batch fetch to match the order of the keys.
        const results = [];

        for (const key of keys) {
            const item = items.find(({ type, id }) => {
                return type === key.type && id === key.id;
            });

            results.push(item || null);
        }

        const res = { items: results };

        if (hasNextPage) {
            const lastKey = keys[keys.length - 1];
            res.lastKey = { type: lastKey.type, id: lastKey.id };
        }

        return res;
    }

    getViewReduction(viewName) {
        const logger = this.#logger;
        const index = this.#indexes.get(viewName);

        if (!index) {
            throw new Error(`View index ${ viewName } does not exist.`);
        }

        const view = this.#views.get(viewName);

        if (!isFunction(view.reduce)) {
            return null;
        }

        return index.reduce((result, { key, value }) => {
            try {
                return view.reduce(result, { key, value });
            } catch (error) {
                logger.error('error in view.reduce()', { view: viewName, error });
                return result;
            }
        }, null);
    }

    #mapRecords(records) {
        const logger = this.#logger;

        this.#views.forEach((view, viewName) => {
            const index = this.#indexes.get(viewName);

            if (isFunction(view.map)) {
                for (const record of records) {
                    const { type, id } = record;

                    if (record) {
                        try {
                            view.map(record, (key, value) => {
                                assert(
                                    isNonEmptyString(key) || isNumberNotNaN(key),
                                    `Emitted key in "${ viewName }" view.map() must be a string or number`
                                );
                                index.push({ type, key, id, value });
                            });
                        } catch (error) {
                            logger.error('error in view.map()', {
                                view: viewName,
                                type,
                                id,
                                error,
                            });
                        }
                    }
                }

                index.sort((a, b) => {
                    if (a.key > b.key) {
                        return 1;
                    }
                    if (a.key < b.key) {
                        return -1;
                    }
                    return 0;
                });
            }
        });
    }

    #getAscendingIndexKeys(index, startKey, query, limit) {
        const keys = [];
        let startScan = !startKey;

        for (let i = 0; i < index.length; i += 1) {
            const { type, id, key } = index[i];

            if (!startScan && startKey.type && id === startKey.id) {
                startScan = true;
            }

            if (startScan && this.#evaluateViewKey(query, key)) {
                keys.push({ type, id });
            }

            if (keys.length === limit) {
                return keys;
            }
        }

        return keys;
    }

    #getDescendingIndexKeys(index, startKey, query, limit) {
        const keys = [];
        let startScan = !startKey;

        for (let i = index.length - 1; i >= 0; i -= 1) {
            const { type, id, key } = index[i];

            if (!startScan && startKey.type && id === startKey.id) {
                startScan = true;
            }

            if (startScan && this.#evaluateViewKey(query, key)) {
                keys.push({ type, id });
            }

            if (keys.length === limit) {
                return keys;
            }
        }

        return keys;
    }

    #evaluateViewKey(query, key) {
        if (!query) {
            return true;
        }

        const { condition, params } = query;

        switch (condition) {
            // Less than
            case '<':
                throw new Error('Query condition "<" is not supported');
            // Less than or equal to
            case '<=':
                throw new Error('Query condition "<=" is not supported');
            // Greater than
            case '>':
                throw new Error('Query condition ">" is not supported');
            // Greater than or equal to
            case '>=':
                throw new Error('Query condition ">=" is not supported');
            // Equal to
            case '==':
                throw new Error('Query condition "==" is not supported');

            // Between
            case 'between':
                if (!isNonEmptyString(params?.start) && !isNumberNotNaN(params?.start)) {
                    throw new Error('Query params.start must be a string or number');
                }
                if (!isNonEmptyString(params?.end) && !isNumberNotNaN(params?.end)) {
                    throw new Error('Query params.end must be a string or number');
                }
                return key >= params.start && key <= params.end;

            // Begins with
            case 'begins_with':
                throw new Error('Query condition "begins_with" is not supported');
            default:
                throw new Error(`Query condition "${ query.condition }" is not supported`);
        }
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
