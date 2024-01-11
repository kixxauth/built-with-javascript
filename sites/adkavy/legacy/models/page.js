import BaseDataStoreModel from './base-data-store-model.js';


export default class Page extends BaseDataStoreModel {

    static type = 'page';

    /**
     * @private
     */
    mapAttributes(attrs) {
        return Object.assign({}, attrs || {});
    }
}
