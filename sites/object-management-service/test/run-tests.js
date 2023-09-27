import test_HTTPRequestSession from './http-request-session/tests.js';

async function runTests() {
    await test_HTTPRequestSession();
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
