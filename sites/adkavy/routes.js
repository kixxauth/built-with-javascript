export default [
    {
        pattern: '/assets/(.*)',
        HTTPInterface: 'StaticFileServer',
        methods: {
            GET: {
                method: 'serveFile',
                options: {
                    folder: '',
                    cacheControl: 'public, max-age=14400',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'home',
                    template: 'home.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/create-observation',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'observations/create',
                    template: 'observations/form.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/observations/',
        HTTPInterface: 'Observations',
        methods: {
            GET: {
                method: 'listObservations',
            },
            HEAD: {},
            POST: {
                method: 'createObservation',
            },
        },
    },
    {
        pattern: '/observations/:observationId',
        HTTPInterface: 'Observations',
        methods: {
            GET: {
                method: 'viewObservation',
            },
            HEAD: {},
            PATCH: {
                method: 'updateObservation',
            },
        },
    },
    {
        pattern: '/observations/:observationId/media/:filename',
        HTTPInterface: 'Observations',
        methods: {
            PUT: {
                method: 'addMedia',
            },
            PATCH: {
                method: 'updateMedia',
            },
        },
    },
    {
        pattern: '/incident-reports/',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'incident-reports',
                    template: 'incident-reports.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/incident-reports/2022-02-12-angel-slides',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'incident-reports/2022-02-12-angel-slides',
                    template: 'incident-reports/2022-02-12-angel-slides.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/events/',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'events',
                    template: 'events.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/weather',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'weather',
                    template: 'weather.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/education',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'education',
                    template: 'education.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/making-observations',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'education',
                    template: 'education.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    {
        pattern: '/donate',
        HTTPInterface: 'HTMLPage',
        methods: {
            GET: {
                method: 'renderPage',
                options: {
                    page: 'donate',
                    template: 'donate.html',
                    cacheControl: 'public, max-age=129600',
                },
            },
            HEAD: {},
        },
    },
    // Static root files. This should always go last in the lookup order.
    {
        pattern: '/:basename.(png|ico|svg|xml|webmanifest)',
        HTTPInterface: 'StaticFileServer',
        methods: {
            GET: {
                method: 'serveFile',
                options: {
                    folder: '/root',
                    cacheControl: 'public, max-age=14400',
                },
            },
            HEAD: {},
        },
    },
];
