export default [
    {
        pattern: '/origin/:scope/:pathparts+',
        HTTPInterface: 'OriginServer',
        methods: {
            GET: 'serveObject',
            HEAD: 'serveObjectMetadata',
        },
    },
    {
        pattern: '/objects/:scope/:key+',
        HTTPInterface: 'WriteServer',
        methods: {
            PUT: 'putObject',
        },
    },
    // {
    //     pattern: '/admin/objects/:key/:version?',
    //     HTTPInterface: 'AdminServer',
    //     methods: {
    //         GET: 'viewObject',
    //     },
    // },
    // {
    //     pattern: '/admin/objects',
    //     HTTPInterface: 'AdminServer',
    //     methods: {
    //         GET: 'listObjects',
    //     },
    // },
    // {
    //     pattern: '/admin',
    //     HTTPInterface: 'AdminServer',
    //     methods: {
    //         GET: 'start',
    //     },
    // },
    {
        pattern: '/admin-rpc',
        HTTPInterface: 'AdminRPCTarget',
        methods: {
            POST: 'remoteProcedureCall',
        },
    },
];
