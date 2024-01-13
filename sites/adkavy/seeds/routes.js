export default [
    {
        patterns: [ '/assets/(.*)' ],
        routeName: 'StaticFileServer',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'StaticFileServer',
            options: {
                folder: '',
                cacheControl: 'public, max-age=14400',
            },
        }],
    },
    {
        patterns: [ '/', '/index.json' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'home',
                template: 'home.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/create-observation(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'observations__form',
                template: 'observations/form.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/observations', '/observations.json' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'ListEntities',
            options: {
                type: 'observation',
                page: 'observations__list',
                template: 'observations/list.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/observations/:observationId(.json)' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'ViewEntity',
            options: {
                type: 'observation',
                page: 'observations__view',
                template: 'observations/view.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/observations/:observationId/media/:filename' ],
        targets: [{
            methods: [ 'PUT' ],
            targetName: 'ObservationsAddMedia',
        }],
    },
    {
        patterns: [ '/incident-reports', '/incident-reports.json' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'incident-reports__list',
                template: 'incident-reports/list.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/incident-reports/2022-02-12-angel-slides(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'incident-reports__view',
                template: 'incident-reports/view.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/events(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'events',
                template: 'events.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/weather(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'weather',
                template: 'weather.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/education(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'education',
                template: 'education.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/making-observations(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'making-observations',
                template: 'making-observations.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/donate(.json)?' ],
        routeName: 'HTMLPage',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'HTMLPage',
            options: {
                page: 'donate',
                template: 'donate.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/observations-rpc' ],
        routeName: 'ObservationsRPC',
        targets: [{
            methods: [ 'POST' ],
            targetName: 'ObservationsRPC',
        }],
    },
    // Static root files. This should always go last in the lookup order.
    {
        patterns: [ '/:basename.(png|ico|svg|xml|webmanifest)' ],
        routeName: 'StaticFileServer',
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            targetName: 'StaticFileServer',
            options: {
                folder: 'root',
                cacheControl: 'public, max-age=14400',
            },
        }],
    },
];
