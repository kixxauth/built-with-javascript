import BasePage from './base-page.js';

export default class StaticPage extends BasePage {

    #watchedSnippetIds = [];

    constructor(options) {
        options.cacheable = true;
        super(options);
    }

    bindEventListeners() {
        this.eventBus.on('PageDataStore:updateItem', this.onPageDataStoreUpdate.bind(this));
        this.eventBus.on('PageSnippetStore:updateItem', this.onPageSnippetStoreUpdate.bind(this));

        // Get page data in the background, so we can populate the watched snippets list.
        this.getPageData()
            .then((page) => {
                this.#watchedSnippetIds = page.snippets || [];
            })
            .catch((error) => {
                const { pageId } = this;
                this.logger.error('error fetching page data in the background', { pageId, error });
            });
    }

    onPageDataStoreUpdate(page) {
        if (page.id === this.pageId) {
            this.#watchedSnippetIds = page.snippets || [];
            const { pageId } = this;
            this.logger.log('detected page data update', { pageId });
            this.deleteCache();
        }
    }

    onPageSnippetStoreUpdate({ id }) {
        if (this.#watchedSnippetIds.includes(id)) {
            const { pageId } = this;
            this.logger.log('detected snippet update', { pageId, snippet: id });
            this.deleteCache();
        }
    }
}
