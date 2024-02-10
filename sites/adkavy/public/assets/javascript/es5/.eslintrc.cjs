/* globals module */
'use strict'; // eslint-disable-line strict

module.exports = {
    parser: 'espree',
    env: {
        es6: false,
        node: false,
        browser: true,
    },
    parserOptions: {
        ecmaVersion: 5,
        sourceType: 'script',
        ecmaFeatures: {
            globalReturn: false,
            generators: false,
            objectLiteralDuplicateProperties: false,
            experimentalObjectRestSpread: false,
        },
    },
    rules: {
        'object-shorthand': [ 'off' ],
        'no-var': [ 'off' ],
        'prefer-arrow-callback': [ 'off' ],
        'prefer-rest-params': [ 'off' ],
        quotes: [
            'error',
            'single',
            { avoidEscape: true, allowTemplateLiterals: false },
        ],
    },
};
