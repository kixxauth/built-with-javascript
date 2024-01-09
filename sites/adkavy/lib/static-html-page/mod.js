import Kixx from '../../kixx/mod.js';

const { HTMLPageRoute } = Kixx.Routes;
const { HTMLPageTarget } = Kixx.Targets;
const { CachedHTMLPage } = Kixx.Pages;


export function registerStaticHTMLPage(components, router) {

    router.registerRouteFactory('HTMLPage', ({ patterns, targets }) => {
        return new HTMLPageRoute({
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('HTMLPage', ({ methods, options }) => {
        const page = new CachedHTMLPage({
            pageId: ,
            templateId: ,
        });

        return new HTMLPageTarget({
            methods,
            page,
            options,
        });
    });
}
