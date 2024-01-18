import Kixx from '../../kixx/mod.js';

const { HTMLPageRoute } = Kixx.Routes;
const { HTMLPageTarget, ListEntitiesTarget, ViewEntityTarget } = Kixx.Targets;
const { CacheablePage } = Kixx.CacheablePage;


export function registerHTMLPages(router, settings) {
    const {
        eventBus,
        logger,
        dataStore,
        blobStore,
        templateStore,
        noCache,
    } = settings;

    //
    // Static HTML pages
    //

    router.registerRouteFactory('HTMLPage', ({ name, patterns, targets }) => {
        return new HTMLPageRoute({
            name,
            eventBus,
            patterns,
            targets,
        });
    });

    router.registerTargetFactory('HTMLPage', ({ name, methods, options }) => {
        const page = new CacheablePage({
            pageId: options.page,
            templateId: options.template,
            noCache,
            logger: logger.createChild({ name: `CachedHTMLPage:${ name }` }),
            eventBus,
            dataStore,
            blobStore,
            templateStore,
        });

        return new HTMLPageTarget({
            name,
            methods,
            options,
            page,
        });
    });

    //
    // Dynamic HTML pages
    //

    router.registerTargetFactory('ListEntities', ({ name, methods, options }) => {
        return new ListEntitiesTarget({
            name,
            eventBus,
            logger: logger.createChild({ name: `ListEntities:${ name }` }),
            methods,
            options,
        });
    });

    router.registerTargetFactory('ViewEntity', ({ name, methods, options }) => {
        return new ViewEntityTarget({
            name,
            eventBus,
            logger: logger.createChild({ name: `ViewEntity:${ name }` }),
            methods,
            options,
        });
    });
}
