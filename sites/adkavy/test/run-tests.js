import test_AwsS3Client from './aws-s3-client/tests.js';
import test_Observations_HTTPInterface from './http-interfaces/observations/tests.js';


async function runTests() {
    /* eslint-disable no-console */
    console.log('Running test_AwsS3Client');
    await test_AwsS3Client();
    console.log('Running test_Observations_HTTPInterface');
    await test_Observations_HTTPInterface();
    /* eslint-enable no-console */
}

runTests().then(() => {
    /* eslint-disable no-console */
    console.log('Pass! All Tests Complete.');
    /* eslint-enable no-console */
}).catch((error) => {
    /* eslint-disable no-console */
    console.log('Fail. Testing error:');
    console.log(error);
    /* eslint-enable no-console */
});
