import test_handleError from './test_handle-error.js';
import test_remoteProcedureCall from './test_remote-procedure-call.js';


export default async function test_AdminRPCTarget() {
    await test_handleError();
    await test_remoteProcedureCall();
}
