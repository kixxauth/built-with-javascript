import test_getUser from './test_get-user.js';
import test_getAdminUser from './test_get-admin-user.js';


export default async function test_HTTPRequestSession() {
    await test_getUser();
    await test_getAdminUser();
}
