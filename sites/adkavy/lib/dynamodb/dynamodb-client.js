import https from 'node:https';
import { signRequest, headersToPlainObject } from '../sign-aws-request.js';
import { compact } from '../utils.js';


const API_VERSION = 'DynamoDB_20120810';


export default class DynamoDBClient {

    #logger = null;

    #awsService = 'dynamodb';
    #awsAccessKeyId = null;
    #awsSecretKey = null;
    #awsRegion = null;
    #awsDynamoDbEndpoint = null;
    #entityTableName = null;

    constructor(options) {
        this.#logger = options.logger.createChild({ name: 'DynamoDBClient' });

        this.#awsAccessKeyId = options.awsAccessKeyId;
        this.#awsSecretKey = options.awsSecretKey;
        this.#awsRegion = options.awsRegion;
        this.#awsDynamoDbEndpoint = options.awsDynamoDbEndpoint;
        this.#entityTableName = `${ options.applicationName }_${ options.environment }_entities`;
    }

    async getItem() {
        const command = {
            TableName: this.#entityTableName,
        };

        await this.#makeRequest('GetItem', command);

        return null;
    }

    async putItem(item) {
        const command = {
            TableName: this.#entityTableName,
            Item: serializeObject(item),
        };

        await this.#makeRequest('PutItem', command);

        return true;
    }

    /**
     * @private
     */
    async #makeRequest(target, body) {
        const method = 'POST';
        const url = new URL('/', this.#awsDynamoDbEndpoint);

        const awsOptions = {
            accessKey: this.#awsAccessKeyId,
            secretKey: this.#awsSecretKey,
            region: this.#awsRegion,
            service: this.#awsService,
        };

        const requestOptions = {
            method,
            url,
            contentType: 'application/x-amz-json-1.0',
            awsHeaders: {
                'x-amz-target': `${ API_VERSION }.${ target }`,
            },
        };

        body = JSON.stringify(body);

        const headers = signRequest(awsOptions, requestOptions, body);

        const options = {
            method,
            headers: headersToPlainObject(headers),
        };

        const result = await this.#makeHttpsRequest(url, options, body);

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

        if (result.statusCode !== 200) {
            let code = 'UNKNOWN_DYNAMODB_ERROR';
            let message = `Unknown DynamoDB Error; HTTP status ${ result.statusCode }`;

            if (result.json) {
                if (result.json.__type) {
                    code = result.json.__type.split('#')[1];
                }
                if (result.json.Message) {
                    message = result.json.Message;
                }
            } else {
                this.#logger.error('unexpected dynamodb response', {
                    statusCode: result.statusCode,
                    contentType: result.headers['content-type'],
                    utf8: result.utf8,
                });
            }

            const error = new Error(message);
            error.code = code;
            throw error;
        }

        return result.json;
    }

    /**
     * @private
     */
    #makeHttpsRequest(url, options, body) {
        return new Promise((resolve, reject) => {
            const req = https.request(url, options, (res) => {
                const chunks = [];

                res.once('error', reject);

                res.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                res.on('end', () => {
                    req.off('error', reject);
                    res.off('error', reject);

                    const utf8 = Buffer.concat(chunks).toString('utf8');

                    let json;
                    try {
                        json = JSON.parse(utf8);
                    } catch (e) {
                        resolve({
                            stausCode: res.statusCode,
                            headers: res.headers,
                            utf8,
                        });

                        return;
                    }

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        json,
                    });
                });
            });

            req.once('error', reject);

            if (typeof body === 'string' || body) {
                req.write(body);
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
