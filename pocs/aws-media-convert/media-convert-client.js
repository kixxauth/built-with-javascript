import https from 'node:https';
import { signRequest, headersToPlainObject } from './sign-aws-request.js';


export default class MediaConvertClient {

    #awsAccessKeyId = '';
    #awsSecretKey = '';
    #region = 'us-east-2';
    #service = 'mediaconvert';
    #serviceVersion = '2017-08-29';
    #endpoint = { url: 'https://wa11sy9gb.mediaconvert.us-east-2.amazonaws.com' };

    constructor(options) {
        this.#awsAccessKeyId = options.awsAccessKeyId;
        this.#awsSecretKey = options.awsSecretKey;
    }

    async getJob(id) {
        const pathname = `/${ this.#serviceVersion }/jobs/${ id }`;
        const result = await this.#makeRequest('GET', pathname, '');
        return result.json.job;
    }

    async createJob(spec) {
        const pathname = `/${ this.#serviceVersion }/jobs`;
        const result = await this.#makeRequest('POST', pathname, JSON.stringify(spec));
        return result.json.job;
    }

    async #makeRequest(method, pathname, body) {
        const url = new URL(pathname, this.#endpoint.url);

        const awsOptions = {
            accessKey: this.#awsAccessKeyId,
            secretKey: this.#awsSecretKey,
            region: this.#region,
            service: this.#service,
        };

        const requestOptions = { method, url };

        const headers = signRequest(awsOptions, requestOptions, body);

        const options = {
            method,
            headers: headersToPlainObject(headers),
        };

        const result = await this.#makeHttpsRequest(url, options, body);

        return result;
    }

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

// TODO: Remove this!
const client = new MediaConvertClient({
    awsAccessKeyId: '',
    awsSecretKey: '',
});


// Test for createJob()
// const jobSpec = {
//     role: 'arn:aws:iam::159720545559:role/service-role/MediaConvert_POC_Role',
//     settings: {
//         timecodeConfig: { source: 'ZEROBASED' },
//         inputs: [{
//             fileInput: `s3://poc-2023-08-28-media-convert/source-files/71508755986__18A9DC31-81C9-4E57-9FFE-21E06CB06B90.MOV/4898b6c6ac76a4c9040d5aabf6aa380f`,
//             timecodeSource: 'ZEROBASED',
//             videoSelector: {},
//             audioSelectors: {},
//         }],
//         outputGroups: [
//             {
//                 name: 'MP4 File',
//                 outputGroupSettings: {
//                     type: 'FILE_GROUP_SETTINGS',
//                     fileGroupSettings: {
//                         destination: `s3://poc-2023-08-28-media-convert/output/api-test-01/`,
//                     },
//                 },
//                 outputs: {
//                     nameModifier: '-mp4-file',
//                     containerSettings: {
//                         container: 'MP4',
//                         mp4Settings: {},
//                     },
//                     videoDescription: {
//                         width: 1280,
//                         height: 720,
//                         codecSettings: {
//                             codec: 'H_264',
//                             h264Settings: {
//                                 maxBitrate: 2000000,
//                                 rateControlMode: 'QVBR',
//                                 qvbrSettings: { qvbrQualityLevel: 7 },
//                                 sceneChangeDetect: 'TRANSITION_DETECTION',
//                             },
//                         },
//                     },
//                     audioDescriptions: [{
//                         audioSourceName: 'Audio Selector 1',
//                         codecSettings: {
//                             codec: 'AAC',
//                             aacSettings: {
//                                 bitrate: 96000,
//                                 codingMode: 'CODING_MODE_2_0',
//                                 sampleRate: 48000,
//                             },
//                         },
//                     }],
//                 },
//             },
//         ],
//     },
// };

/* eslint-disable indent, quotes, quote-props, comma-dangle */
const jobSpec = {
  "Queue": "arn:aws:mediaconvert:us-east-2:159720545559:queues/Default",
  "UserMetadata": {},
  "Role": "arn:aws:iam::159720545559:role/service-role/MediaConvert_POC_Role",
  "Settings": {
    "TimecodeConfig": {
      "Source": "ZEROBASED"
    },
    "OutputGroups": [
      {
        "Name": "File Group",
        "Outputs": [
          {
            "ContainerSettings": {
              "Container": "MP4",
              "Mp4Settings": {}
            },
            "VideoDescription": {
              "Width": 1280,
              "Height": 720,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "MaxBitrate": 5000000,
                  "RateControlMode": "QVBR",
                  "QvbrSettings": {
                    "QvbrQualityLevel": 9
                  },
                  "SceneChangeDetect": "TRANSITION_DETECTION"
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 96000,
                    "CodingMode": "CODING_MODE_2_0",
                    "SampleRate": 48000
                  }
                }
              }
            ],
            "NameModifier": "-max-quality"
          }
        ],
        "OutputGroupSettings": {
          "Type": "FILE_GROUP_SETTINGS",
          "FileGroupSettings": {
            "Destination": "s3://poc-2023-08-28-media-convert/output/"
          }
        }
      }
    ],
    "Inputs": [
      {
        "AudioSelectors": {
          "Audio Selector 1": {
            "DefaultSelection": "DEFAULT"
          }
        },
        "VideoSelector": {
          "Rotate": "AUTO"
        },
        "TimecodeSource": "ZEROBASED",
        "FileInput": "s3://poc-2023-08-28-media-convert/source-files/snow-video.MOV"
      }
    ]
  },
  "AccelerationSettings": {
    "Mode": "DISABLED"
  },
  "StatusUpdateInterval": "SECONDS_60",
  "Priority": 0
};
/* eslint-enable indent, quotes, quote-props, comma-dangle */

/* eslint-disable no-console */

client.createJob(jobSpec).then((job) => {
    console.log(job);
}).catch((error) => {
    console.error('Caught error:');
    console.error(error);
});

// Test for getJob()
// client.getJob('1693230862997-36szjw').then((job) => {
//     console.log(job);
// }).catch((error) => {
//     console.error('Caught error:');
//     console.error(error);
// });
