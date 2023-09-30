import test_getUserAndScope from './test_get-user-and-scope.js';
import test_getScopedUser from './test_get-scoped-user.js';
import test_getAdminUser from './test_get-admin-user.js';


export default async function test_HTTPRequestSession() {
    await test_getUserAndScope();
    await test_getAdminUser();
    await test_getScopedUser();
}
