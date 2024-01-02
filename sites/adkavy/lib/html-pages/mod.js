import Kixx from '../../kixx/mod.js';

const { CachedHTMLPage } = Kixx.Pages;
const { HTMLPageRoute } = Kixx.Routes;
const { HTMLPageTarget, ListEntitiesTarget, ViewEntityTarget } = Kixx.Targets;


export function registerStaticHTMLPage(components, router) {
    const {
        config,
        eventBus,
        dataStore,
        blobStore,
        templateStore,
    } = components;

    //
    // Static HTML pages
    //

    router.registerRouteFactory('HTMLPage', ({ patterns, targets }) => {
        return new HTMLPageRoute({
            eventBus,
            logger: components.logger.createChild({ name: 'StaticHTMLPage' }),
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('HTMLPage', ({ methods, options }) => {
        const page = new CachedHTMLPage({
            pageId: options.page,
            templateId: options.template,
            cacheable: true,
            noCache: !config.pages.cache,
            logger: components.logger.createChild({ name: 'CachedHTMLPage' }),
            eventBus,
            dataStore,
            blobStore,
            templateStore,
        });

        return new HTMLPageTarget({
            methods,
            options,
            page,
        });
    });

    //
    // Dynamic HTML pages
    //

    router.registerTargetFactory('ListEntities', ({ methods, options }) => {
        return new ListEntitiesTarget({
            eventBus,
            logger: components.logger.createChild({ name: 'ListEntities' }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('ViewEntity', ({ methods, options }) => {
        return new ViewEntityTarget({
            eventBus,
            logger: components.logger.createChild({ name: 'ViewEntity' }),
            methods,
            options,
        });
    });
}
