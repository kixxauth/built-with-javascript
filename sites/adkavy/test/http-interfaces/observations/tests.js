import test_handleError from './test_handle-error.js';
import test_createObservation from './test_create-observation.js';
import test_updateObservation from './test_update-observation.js';
import test_addMedia from './test_add-media.js';
import test_updateMedia from './test_update-media.js';

export default async function test_AwsS3Client() {
    await test_handleError();
    await test_createObservation();
    await test_updateObservation();
    await test_addMedia();
    await test_updateMedia();
}
