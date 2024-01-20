import Kixx from '../../kixx/mod.js';

const { HTMLPageRoute } = Kixx.Routes;
const { HTMLPageTarget } = Kixx.Targets;
const { CacheablePage, ListEntitiesPage } = Kixx.CacheablePage;


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
        const page = new ListEntitiesPage({
            pageId: options.page,
            templateId: options.template,
            noCache,
            logger: logger.createChild({ name: `ListEntities:${ name }` }),
            eventBus,
            dataStore,
            blobStore,
            templateStore,
            dataType: options.dataType,
            viewName: options.viewName,
            descending: options.descending,
            limit: options.limit,
        });

        return new HTMLPageTarget({
            name,
            methods,
            options,
            page,
        });
    });

    router.registerTargetFactory('ViewEntity', ({ name, methods, options }) => {
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
}
