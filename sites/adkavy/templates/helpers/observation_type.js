
exports.helper = function observation_type(observation) {
    observation = observation || {};

    if (observation.triggeredAvalanche) {
        return 'Triggered Avalanche';
    }
    if (observation.observedAvalanche) {
        return 'Observed Avalanche';
    }
    return 'Observation';
};
