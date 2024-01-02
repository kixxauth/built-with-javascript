import { KixxAssert } from '../../dependencies.js';

const { assertIncludes } = KixxAssert;


const ALLOWED_ENVIRONMENTS = [
    'development',
    'production',
];


export default class DynamoDBEngine {

    #dynamoDBClient = null;
    #tablePrefix = null;

    constructor({ environment, dynamoDBClient }) {
        assertIncludes(
            environment,
            ALLOWED_ENVIRONMENTS,
            `DataStore environment must be one of "${ ALLOWED_ENVIRONMENTS.join('","') }"`
        );

        this.#dynamoDBClient = dynamoDBClient;
        this.#tablePrefix = `adkavy_${ environment }`;
    }

    async fetch(type, id) {
        const table = `${ this.#tablePrefix }_entities`;
        const record = await this.#dynamoDBClient.getItem(table, { type, id });
        return record || null;
    }

    async save(type, id, record) {
        const table = `${ this.#tablePrefix }_entities`;
        await this.#dynamoDBClient.putItem(table, record);
        return record;
    }
}
