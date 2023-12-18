import test_renderPage_asHTML from './test_render-page-as-html.js';
import test_renderPage_asJSON from './test_render-page-as-json.js';
import test_renderPage_notFound from './test_render-page-not-found.js';


export default async function test_HTMLPage_HTTPInterface() {
    await test_renderPage_asHTML();
    await test_renderPage_asJSON();
    await test_renderPage_notFound();
}
