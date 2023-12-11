import { KixxAssert } from '../../dependencies.js';
import Observation from '../models/observation.js';


const { assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];

const MODELS_BY_TYPE = new Map([
    [ 'observation', Observation ],
]);


export default class DataStore {

    #logger = null;
    #dynamoDbClient = null;
    #entityTable = null;

    constructor({ config, logger, dynamoDbClient }) {
        const environment = config.dataStore.getEnvironment();

        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#logger = logger.createChild({ name: 'DataStore' });
        this.#dynamoDbClient = dynamoDbClient;
        this.#entityTable = `adkavy_${ environment }_entities`;
    }

    async fetch({ type, id }) {
        this.#logger.log('fetch record', { type, id });

        const Model = MODELS_BY_TYPE.get(type);
        const spec = await this.#dynamoDbClient.getItem(this.#entityTable, { type, id });

        if (spec) {
            return new Model(spec);
        }

        return null;
    }

    async save(obj) {
        this.#logger.log('save record', { type: obj.type, id: obj.id });

        obj = obj.updateMeta();

        const item = {
            type: obj.type,
            id: obj.id,
            meta: obj.meta,
            attributes: obj.attributes,
            relationships: obj.relationships,
        };

        obj.assignDerivedDatastoreProperties(item);

        await this.#dynamoDbClient.putItem(this.#entityTable, item);

        return obj;
    }
}
