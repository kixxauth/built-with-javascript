exports.name = 'avalanche_type';

exports.helper = function avalanche_type(type) {
    switch (type) {
        case 'sluff':
            return 'Dry/Loose (Sluff)';
        case 'wet_loose':
            return 'Wet/Loose';
        case 'slab':
            return 'Slab';
        default:
            return 'Type: Unspecified';
    }
};
