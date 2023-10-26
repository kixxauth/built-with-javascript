import { OperationalError } from '../errors.js';
import { KixxAssert } from '../../dependencies.js';
import MediaConvertClient from './media-convert-client.js';


const { assert, assertFalsy, isNonEmptyString } = KixxAssert;


export default class MediaConvert {

    #logger = null;
    #mediaConvertClient = null;
    #awsMediaConvertRole = null;
    #objectStoreS3Bucket = null;
    #objectStoreEnvironment = null;

    constructor({ config, logger }) {
        const awsAccessKeyId = config.mediaConvert.getAccessKeyId();
        const awsSecretKey = config.mediaConvert.getSecretAccessKey();
        const awsMediaConvertEndpoint = config.mediaConvert.getEndpoint();
        const role = config.mediaConvert.getRole();

        assert(isNonEmptyString(awsAccessKeyId), 'AWS accessKeyId must be a non empty String');
        assert(isNonEmptyString(awsSecretKey), 'AWS secretAccessKey must be a non empty String');
        assert(isNonEmptyString(awsMediaConvertEndpoint), 'AWS MediaConvert endpoint must be a non empty String');
        assert(isNonEmptyString(role), 'AWS MediaConvert role must be a non empty String');

        this.#logger = logger.createChild({ name: 'MediaConvert' });

        this.#mediaConvertClient = new MediaConvertClient({
            awsRegion: config.objectStore.getRegion(),
            awsAccessKeyId,
            awsSecretKey,
            awsMediaConvertEndpoint: config.mediaConvert.getEndpoint(),
        });

        this.#awsMediaConvertRole = role;
        this.#objectStoreS3Bucket = config.objectStore.getBucketName();
        this.#objectStoreEnvironment = config.objectStore.getEnvironment();
    }

    /**
     * @public
     */
    async createMediaConvertJob(obj) {
        const settings = this.createMediaConvertJobSettings(obj);

        this.#logger.log('create job', {
            scopeId: obj.scopeId,
            id: obj.id,
            key: obj.key,
        });

        let response;
        try {
            response = await this.#mediaConvertClient.createJob(settings);
        } catch (cause) {
            throw new OperationalError(
                'Unexpected MediaConvert CreateJobCommand error',
                { code: 'MEDIACONVERT_CREATE_JOB_ERR', cause }
            );
        }

        if (!response.job) {
            if (response.message) {
                throw new OperationalError(response.message, { code: 'MEDIACONVERT_CREATE_JOB_ERR' });
            }
            throw new OperationalError(
                'No Job info returned from MediaConvert CreateJobCommand',
                { code: 'MEDIACONVERT_CREATE_JOB_ERR' }
            );
        }

        return response.job;
    }

    /**
     * @private
     */
    createMediaConvertJobSettings(obj) {
        assert(isNonEmptyString(obj.scopeId));
        assert(isNonEmptyString(obj.key));
        assertFalsy(obj.key.startsWith('/'));
        assertFalsy(obj.key.endsWith('/'));

        const s3BaseUri = `${ this.#objectStoreS3Bucket }/${ this.#objectStoreEnvironment }/${ obj.scopeId }`;

        return {
            Role: this.#awsMediaConvertRole,
            Settings: {
                TimecodeConfig: {
                    Source: 'ZEROBASED',
                },
                Inputs: [
                    {
                        TimecodeSource: 'ZEROBASED',
                        // TODO: How should we handle mobile camera rotation?
                        VideoSelector: {/* Rotate: 'AUTO' */},
                        AudioSelectors: {
                            'Audio Selector 1': { DefaultSelection: 'DEFAULT' },
                        },
                        FileInput: `s3://${ s3BaseUri }/${ obj.key }`,
                    },
                ],
                OutputGroups: [
                    {
                        Name: 'File Group',
                        CustomName: obj.id,
                        OutputGroupSettings: {
                            Type: 'FILE_GROUP_SETTINGS',
                            FileGroupSettings: {
                                Destination: `s3://${ s3BaseUri }/${ obj.id }/video`,
                                DestinationSettings: {
                                    S3Settings: {
                                        // TODO: Map the S3 StorageClass from the RemoteObject storage class.
                                        StorageClass: 'STANDARD_IA',
                                    },
                                },
                            },
                        },
                        Outputs: [
                            {
                                VideoDescription: {
                                    Width: 852, // For 480p resolution.
                                    CodecSettings: {
                                        Codec: 'H_264',
                                        H264Settings: {
                                            // QVBR Guidelines:
                                            //   https://docs.aws.amazon.com/mediaconvert/latest/ug/cbr-vbr-qvbr.html#qvbr-guidelines
                                            RateControlMode: 'QVBR',
                                            SceneChangeDetect: 'TRANSITION_DETECTION',
                                            MaxBitrate: 1000000,
                                            QvbrSettings: {
                                                QvbrQualityLevel: 7,
                                            },
                                        },
                                    },
                                },
                                AudioDescriptions: [
                                    {
                                        CodecSettings: {
                                            Codec: 'AAC',
                                            AacSettings: {
                                                Bitrate: 96000,
                                                CodingMode: 'CODING_MODE_2_0',
                                                SampleRate: 48000,
                                            },
                                        },
                                        AudioSourceName: 'Audio Selector 1',
                                    },
                                ],
                                ContainerSettings: {
                                    Container: 'MP4',
                                    Mp4Settings: {},
                                },
                            },
                        ],
                    },
                ],
            },
        };
    }
}
