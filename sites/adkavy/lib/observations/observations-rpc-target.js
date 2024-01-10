import Kixx from '../../kixx/mod.js';

const { JsonRPCTarget } = Kixx.Targets;


export default class ObservationsRPCTarget extends JsonRPCTarget {
    authenticateUser() {
        // Noop
    }
}
