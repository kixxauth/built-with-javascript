import Kixx from '../../kixx/mod.js';
import ObservationModel from './observation-model.js';

const { CacheablePage } = Kixx.CacheablePage;

export default class ViewObservationPage extends CacheablePage {

    async getDynamicData(baseData, args) {
        const { observationId } = args;
        const { dataStore } = this;

        const observation = await ObservationModel.load(dataStore, observationId);

        return { observation: observation.toView() };
    }
}
