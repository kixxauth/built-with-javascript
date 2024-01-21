
exports.helper = function observation_type_label(observationType) {
    switch (observationType) {
        case 'triggered-avalanche':
            return 'Triggered Avalanche';
        case 'observed-avalanche':
            return 'Observed Avalanche';
        default:
            return 'Observation';
    }
};
