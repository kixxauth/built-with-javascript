import test_handleError from './test_handle-error.js';
import test_createObservation from './test_create-observation.js';
import test_updateObservation from './test_update-observation.js';

export default async function test_AwsS3Client() {
    await test_handleError();
    await test_createObservation();
    await test_updateObservation();
}
