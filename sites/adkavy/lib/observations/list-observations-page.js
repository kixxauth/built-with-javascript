import { KixxAssert } from '../../dependencies.js';
import Kixx from '../../kixx/mod.js';
import ObservationModel from './observation-model.js';

const { CacheablePage } = Kixx.CacheablePage;
const { isNumberNotNaN, isBoolean } = KixxAssert;


export default class ListObservationsPage extends CacheablePage {

    #dataType = 'observation';
    #viewName = 'observations_by_observation_datetime';
    #descending = true;
    #limit = 100;

    constructor(spec) {
        super(spec);

        const {
            descending,
            limit,
        } = spec;

        if (isBoolean(descending)) {
            this.#descending = descending;
        }

        if (isNumberNotNaN(limit)) {
            this.#limit = limit;
        }
    }

    /**
     * @private
     * @param {String} args.startkey [description]
     * @param {Boolean} args.descending [description]
     * @param {Number} args.limit [description]
     */
    async getDynamicData(baseData, args) {
        const startKey = args.startkey ? { type: this.#dataType, id: args.startkey } : null;
        const descending = isBoolean(args.descending) ? args.descending : this.#descending;

        let limit;

        if (args.limit) {
            const limitInt = parseInt(args.limit, 10);
            if (isNumberNotNaN(limitInt)) {
                limit = limitInt;
            } else {
                limit = this.#limit;
            }
        } else {
            limit = this.#limit;
        }

        // Pages are delineated by the start and end of each winter season.
        const pages = this.#generatePageQueries();

        // Convert the page query parameter to a zero indexed integer.
        let pageIndex;

        if (args.page) {
            const i = parseInt(args.page, 10);
            if (isNumberNotNaN(i)) {
                pageIndex = i - 1;
            } else {
                pageIndex = 0;
            }
        } else {
            pageIndex = 0;
        }

        // Clamp the page index to a safe value.
        if (pageIndex < 0) {
            pageIndex = 0;
        }
        if (pageIndex >= pages.length) {
            pageIndex = pages.length - 1;
        }

        const params = pages[pageIndex];

        // Date strings formatted like '2023-08-01'.
        const startDate = params.start;
        const endDate = params.end;

        const query = {
            condition: 'between',
            params,
            // Example:
            // params: {
            //     start: '2023-08-01',
            //     end: '2024-07-31',
            // },
        };

        const result = await this.dataStore.queryViewIndex(this.#viewName, query, {
            descending,
            startKey,
            limit,
        });

        let observations;

        if (Array.isArray(result.items)) {
            observations = result.items.map((record) => {
                return new ObservationModel(record).toView();
            });
        } else {
            observations = [];
        }

        baseData.links.pages = pages.map(({ start, end }, i) => {
            const { canonical } = baseData.links;

            const search = `?page=${ i + 1 }`;

            return {
                search,
                href: canonical.base + canonical.pathname + search,
                start,
                end,
                label: `${ start.split('-')[0] }/${ end.split('-')[0] }`,
                isActive: i === pageIndex,
            };
        });

        return {
            pageLabel: `${ startDate.split('-')[0] }/${ endDate.split('-')[0] }`,
            observations,
        };
    }

    #generatePageQueries() {
        // The start year for the first winter season of the dataset.
        const startYear = 2021;

        const today = new Date();
        // Add 1 to correlate with human expression starting month numbers on 1 instead of zero.
        const currentMonth = today.getMonth() + 1;

        let seasonStartYear = today.getFullYear();

        // If it is currently earlier than August we start the winter season in the prior year.
        if (currentMonth < 8) {
            seasonStartYear = seasonStartYear - 1;
        }

        const pages = [];

        // Iterate backward from the start year of the current season to the start year
        // of the first winter season of the dataset.
        for (seasonStartYear; seasonStartYear >= startYear; seasonStartYear -= 1) {
            pages.push({
                start: `${ seasonStartYear }-08-01`,
                end: `${ seasonStartYear + 1 }-07-31`, // July always has 31 days.
            });
        }

        return pages;
    }
}
