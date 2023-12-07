import https from 'node:https';
import { KixxAssert } from '../../dependencies.js';
import { signRequest, hashSHA256HexDigest } from './sign-request.js';

const { assert, isNonEmptyString } = KixxAssert;


const DYNAMODB_CONTENT_TYPE = 'application/x-amz-json-1.0';
const DYNAMODB_API_VERSION = 'DynamoDB_20120810';


export default class AwsDynamoDbClient {

    #logger = null;

    #environment = null;
    #awsAccessKey = null;
    #awsSecretKey = null;
    #awsRegion = null;
    #awsDynamoDbEndpoint = null;
    #entityTableName = null;

    constructor(options) {
        const {
            logger,
            environment,
            awsRegion,
            awsDynamoDbEndpoint,
            awsAccessKey,
            awsSecretKey,
        } = options;

        assert(isNonEmptyString(awsRegion), 'AWS region must be a non empty String');
        assert(isNonEmptyString(awsAccessKey), 'AWS accessKey must be a non empty String');
        assert(isNonEmptyString(awsSecretKey), 'AWS secretKey must be a non empty String');
        assert(isNonEmptyString(awsDynamoDbEndpoint), 'AWS DynamoDBEndpoint must be a non empty String');
        assert(isNonEmptyString(environment), 'environment must be a non empty String');

        this.#logger = logger.createChild({ name: 'DynamoDBClient' });

        this.#environment = environment;

        this.#awsAccessKey = awsAccessKey;
        this.#awsSecretKey = awsSecretKey;
        this.#awsRegion = awsRegion;
        this.#awsDynamoDbEndpoint = awsDynamoDbEndpoint;
        this.#entityTableName = `adkavy_${ environment }_entities`;
    }

    async getItem({ type, id }) {
        const command = {
            TableName: this.#entityTableName,
            Key: serializeObject({ type, id }),
        };

        // Returns { Item: {} }
        const res = await this.#makeDynamoDbRequest('GetItem', command);

        if (res.Item) {
            return deserializeObject(res.Item);
        }

        return null;
    }

    async putItem(item) {
        const command = {
            TableName: this.#entityTableName,
            Item: serializeObject(item),
        };

        // Returns an empty JSON object.
        await this.#makeDynamoDbRequest('PutItem', command);

        return true;
    }

    async query(options) {
        const {
            type,
            queryName,
            limit,
            exclusiveStartKey,
        } = options;

        const command = {
            TableName: this.#entityTableName,
            IndexName: `adkavy_${ this.#environment }_${ queryName }`,
            KeyConditionExpression: '#type_key = :type_value',
            ExpressionAttributeNames: { '#type_key': 'type' },
            ExpressionAttributeValues: { ':type_value': { S: type } },
            Limit: limit,
        };

        if (exclusiveStartKey) {
            command.ExclusiveStartKey = serializeObject(exclusiveStartKey);
        }

        await this.#makeDynamoDbRequest('Query', command);
    }

    /**
     * @private
     */
    async #makeDynamoDbRequest(target, params) {
        const method = 'POST';
        const url = new URL('/', this.#awsDynamoDbEndpoint);
        const data = Buffer.from(JSON.stringify(params), 'utf8');
        const payloadHash = hashSHA256HexDigest(data);

        const headers = signRequest(url, {
            method,
            payloadHash,
            region: this.#awsRegion,
            accessKey: this.#awsAccessKey,
            secretKey: this.#awsSecretKey,
            headers: {
                'content-type': DYNAMODB_CONTENT_TYPE,
                'content-length': data.length.toString(),
                'x-amz-target': `${ DYNAMODB_API_VERSION }.${ target }`,
            },
        });

        const [ res, buff ] = await this.makeHttpRequest(url, data, {
            method,
            headers,
        });

        /*
          Invalid content-type
          --------------------
          stausCode: 404,
          headers: {
            server: 'Server',
            date: 'Mon, 20 Nov 2023 15:31:14 GMT',
            'content-length': '272',
            connection: 'keep-alive',
            'x-amzn-requestid': 'N144PFDQJMPKJFHGJV7UQ68H5VVV4KQNSO5AEMVJF66Q9ASUAAJG',
            'x-amz-crc32': '2548615100'
          },
          utf8: '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">\n' +
            '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">\n' +
            '<head>\n' +
            '  <title>Page Not Found</title>\n' +
            '</head>\n' +
            '<body>Page Not Found</body>\n' +
            '</html>'


          statusCode: 400,
          headers: {
            server: 'Server',
            date: 'Mon, 20 Nov 2023 15:15:05 GMT',
            'content-type': 'application/x-amz-json-1.0',
            'content-length': '132',
            connection: 'keep-alive',
            'x-amzn-requestid': 'KOB6O4U8I29KH9PF9U3TKTG4INVV4KQNSO5AEMVJF66Q9ASUAAJG',
            'x-amz-crc32': '3880715766'
          },
          json: {
            __type: 'com.amazon.coral.service#UnrecognizedClientException',
            message: 'The security token included in the request is invalid.'
          }

          json: {
            __type: 'com.amazon.coral.service#InvalidSignatureException',
            message: 'The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method. Consult the service documentation for details.'
          }

        Missing the Item property
        -------------------------
          json: {
            __type: 'com.amazon.coral.validate#ValidationException',
            message: "1 validation error detected: Value null at 'item' failed to satisfy constraint: Member must not be null"
          }

          json: {
            __type: 'com.amazon.coral.service#AccessDeniedException',
            Message: 'User: arn:aws:iam::159720545559:user/adkavy-development-001 is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-2:159720545559:table/adkavy_production_entities because no identity-based policy allows the dynamodb:PutItem action'
          }

        Table does not exist
        --------------------
          json: {
            __type: 'com.amazonaws.dynamodb.v20120810#ResourceNotFoundException',
            message: 'Requested resource not found'
          }
        */

        let json = null;
        let utf8 = null;

        if (buff) {
            utf8 = buff.toString('utf8');

            try {
                json = JSON.parse(utf8);
            } catch (err) {
                json = null;
            }
        }

        // Uncomment for debugging
        // console.log('==>> status code', res.statusCode);
        // console.log('==>> UTF8', utf8);
        // console.log('==>> JSON', json);

        if (res.statusCode !== 200) {
            let code = 'UNKNOWN_DYNAMODB_ERROR';
            let message = `Unknown DynamoDB Error; HTTP status ${ res.statusCode }`;

            if (json) {
                if (json.__type) {
                    code = json.__type.split('#')[1];
                }
                message = json.Message || json.message || message;
            } else {
                this.#logger.error('unexpected dynamodb response', {
                    statusCode: res.statusCode,
                    contentType: res.headers['content-type'],
                    utf8,
                });
            }

            const error = new Error(message);
            error.code = code;
            throw error;
        }

        return json;
    }

    /**
     * Allow private method override for testing.
     * @private
     */
    makeHttpRequest(url, data, options) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                res.on('error', (error) => {
                    this.#logger.error('https response error event', { error });
                    reject(error);
                });

                let buff = null;

                if (res.headers['content-length']) {
                    const chunks = [];

                    res.on('data', (chunk) => {
                        chunks.push(chunk);
                    });

                    res.on('end', (chunk) => {
                        if (chunk) {
                            chunks.push(chunk);
                        }

                        buff = Buffer.concat(chunks);
                        resolve([ res, buff ]);
                    });
                } else {
                    resolve([ res, buff ]);
                }
            });

            req.on('error', (error) => {
                this.#logger.error('https request error event', { error });
                reject(error);
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }
}

function serializeObject(obj) {
    return Object.keys(obj || {}).reduce((item, key) => {
        const val = serializeValue(obj[key]);
        if (val) {
            item[key] = val;
        }
        return item;
    }, {});
}

function deserializeObject(obj) {
    return Object.keys(obj || {}).reduce((rv, key) => {
        rv[key] = deserializeValue(obj[key]);
        return rv;
    }, {});
}

function serializeValue(val) {
    switch (typeof val) {
        case 'string':
            if (val.length === 0) {
                return { NULL: true };
            }
            return { S: val };
        case 'number':
            if (isNaN(val)) {
                return { NULL: true };
            }
            return { N: val.toString() };
        case 'boolean':
            return { BOOL: val };
        case 'function':
        case 'undefined':
            return null;
        case 'object':
            if (!val) {
                return { NULL: true };
            }
            return Array.isArray(val) ? serializeArray(val) : serializeMap(val);
        default:
            throw new Error(`Unsupported JavaScript type '${ typeof obj }' for DynamodDB serialization`);
    }
}

function serializeArray(obj) {
    return { L: compact(obj.map(serializeValue)) };
}

function serializeMap(obj) {
    const keys = Object.keys(obj);
    const rv = { M: {} };

    if (keys.length === 0) {
        return rv;
    }

    rv.M = keys.reduce((M, key) => {
        const val = serializeValue(obj[key]);
        if (val) {
            M[key] = val;
        }
        return M;
    }, rv.M);

    return rv;
}

function deserializeValue(val) {
    if (Object.hasOwn(val, 'S')) {
        return val.S.toString();
    } else if (Object.hasOwn(val, 'N')) {
        return parseFloat(val.N);
    } else if (val.SS || val.NS) {
        return val.SS || val.NS;
    } else if (Object.hasOwn(val, 'BOOL')) {
        return Boolean(val.BOOL);
    } else if (Object.hasOwn(val, 'M')) {
        return deserializeObject(val.M);
    } else if (Object.hasOwn(val, 'L')) {
        return val.L.map(deserializeValue);
    } else if (Object.hasOwn(val, 'NULL')) {
        return null;
    }
    return null;
}

export function compact(list) {
    return list.filter((x) => {
        return x;
    });
}
