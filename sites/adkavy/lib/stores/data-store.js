import { KixxAssert } from '../../dependencies.js';
import Page from '../models/page.js';
import Observation from '../models/observation.js';


const { assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];

const MODELS_BY_TYPE = new Map([
    [ 'page', Page ],
    [ 'observation', Observation ],
]);


export default class DataStore {

    #logger = null;
    #dynamoDbClient = null;
    #tablePrefix = null;

    constructor({ config, logger, dynamoDbClient }) {
        const environment = config.dataStore.getEnvironment();

        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#logger = logger.createChild({ name: 'DataStore' });
        this.#dynamoDbClient = dynamoDbClient;
        this.#tablePrefix = `adkavy_${ environment }`;
    }

    async fetch({ type, id }) {
        this.#logger.debug('fetch record', { type, id });

        const Model = MODELS_BY_TYPE.get(type);

        if (!Model) {
            throw new Error(`No DataStore Model registered for type "${ type }"`);
        }

        const table = `${ this.#tablePrefix }_entities`;
        const spec = await this.#dynamoDbClient.getItem(table, { type, id });

        if (spec) {
            return new Model(spec);
        }

        return null;
    }

    async save(obj) {
        this.#logger.debug('save record', { type: obj.type, id: obj.id });

        obj = obj.updateMeta();

        const item = {
            type: obj.type,
            id: obj.id,
            meta: obj.meta,
            attributes: obj.attributes,
            relationships: obj.relationships,
        };

        obj.assignDerivedDatastoreProperties(item);

        const table = `${ this.#tablePrefix }_entities`;
        await this.#dynamoDbClient.putItem(table, item);

        return obj;
    }

    async observationsByDateTime({ exclusiveStartKey, limit }) {
        this.#logger.debug('query observations_by_datetime', { limit, exclusiveStartKey });

        const table = `${ this.#tablePrefix }_entities`;
        const index = `${ this.#tablePrefix }_observations_by_datetime`;

        const res = await this.#dynamoDbClient.query(table, index, {
            type: 'observation',
            exclusiveStartKey,
            limit,
        });

        return res;
    }
}
