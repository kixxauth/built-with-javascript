
exports.helper = function observation_type_classname(observation) {
    observation = observation || {};

    if (observation.triggeredAvalanche) {
        return 'triggered-avalanche';
    }
    if (observation.observedAvalanche) {
        return 'observed-avalanche';
    }
    return 'observation';
};
