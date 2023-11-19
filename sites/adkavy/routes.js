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
        pattern: '/:index?',
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
        pattern: '/observations/:observationId/media/:mediaId',
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
        HTTPInterface: 'IncidentReports',
        methods: {
            GET: {
                method: 'listIncidentReports',
            },
            HEAD: {},
        },
    },
    {
        pattern: '/incident-reports/:reportId',
        HTTPInterface: 'IncidentReports',
        methods: {
            GET: {
                method: 'viewIncidentReport',
            },
            HEAD: {},
        },
    },
    {
        pattern: '/events/',
        HTTPInterface: 'Events',
        methods: {
            GET: {
                method: 'listEvents',
            },
            HEAD: {},
        },
    },
    {
        pattern: '/events/:eventId',
        HTTPInterface: 'Events',
        methods: {
            GET: {
                method: 'viewEvent',
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
