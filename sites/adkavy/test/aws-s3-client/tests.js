import test_getObject from './test_get-object.js';
import test_putObject from './test_put-object.js';

export default async function test_AwsS3Client() {
    await test_getObject();
    await test_putObject();
}
