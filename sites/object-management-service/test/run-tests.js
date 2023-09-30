import test_HTTPRequestSession from './http-request-session/tests.js';
import test_AdminRPCTarget from './admin-rpc-target/tests.js';
import test_WriteServer from './write-server/tests.js';


async function runTests() {
    /* eslint-disable no-console */
    console.log('Running test_HTTPRequestSession');
    await test_HTTPRequestSession();
    console.log('Running test_AdminRPCTarget');
    await test_AdminRPCTarget();
    console.log('Running test_WriteServer');
    await test_WriteServer();
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
