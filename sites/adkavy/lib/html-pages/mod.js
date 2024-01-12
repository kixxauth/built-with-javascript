import Kixx from '../../kixx/mod.js';

const { HTMLPageRoute } = Kixx.Routes;
const { HTMLPageTarget, ListEntitiesTarget, ViewEntityTarget } = Kixx.Targets;
const { CacheablePage } = Kixx.CacheablePage;


export function registerHTMLPages(components, router) {
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
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('HTMLPage', ({ methods, options }) => {
        const page = new CacheablePage({
            pageId: options.page,
            templateId: options.template,
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
