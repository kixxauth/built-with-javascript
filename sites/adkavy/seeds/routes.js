export default [
    {
        patterns: [ '/assets/(.*)' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'StaticFileServer',
            options: {
                folder: '',
                cacheControl: 'public, max-age=14400',
            },
        }],
    },
    {
        patterns: [ '/', '/index.json' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'home',
                template: 'home.html',
                cacheControl: 'public, max-age=129600',
            },
        }]
    },
    {
        patterns: [ '/create-observation(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'observations__form',
                template: 'observations/form.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/observations', '/observations.json' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'ObservationsList',
            options: {
                page: 'observations__list',
                template: 'observations/list.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/observations/:observationId(.json)' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'ObservationsView',
            options: {
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
            name: 'ObservationsAddMedia',
        }],
    },
    {
        patterns: [ '/incident-reports', '/incident-reports.json' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'incident-reports__list',
                template: 'incident-reports/list.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/incident-reports/2022-02-12-angel-slides(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'incident-reports__view',
                template: 'incident-reports/view.html',
                cacheControl: 'public, no-cache',
            },
        }],
    },
    {
        patterns: [ '/events(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'events',
                template: 'events.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/weather(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'weather',
                template: 'weather.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/education(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'education',
                template: 'education.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/making-observations(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'making-observations',
                template: 'making-observations.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    {
        patterns: [ '/donate(.json)?' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'HTMLPage',
            options: {
                page: 'donate',
                template: 'donate.html',
                cacheControl: 'public, max-age=129600',
            },
        }],
    },
    // Static root files. This should always go last in the lookup order.
    {
        patterns: [ ':basename.(png|ico|svg|xml|webmanifest)' ],
        targets: [{
            methods: [ 'GET', 'HEAD' ],
            name: 'StaticFileServer',
            options: {
                folder: 'root',
                cacheControl: 'public, max-age=14400',
            },
        }],
    },
];
