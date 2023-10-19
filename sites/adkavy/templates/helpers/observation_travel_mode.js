
exports.helper = function observation_travel_mode(observation) {
    switch (observation.travelMode) {
        case 'skiing_or_snowboarding':
            return 'Skiing/Snowboarding';
        case 'xc_skiing_or_snowshoeing':
            return 'XC Skiing/Snowshoeing';
        case 'walking_hiking':
            return 'Walking/Hiking';
        case 'snowmobiling':
            return 'Snowmobiling';
        case 'driving':
            return 'Driving';
        case 'other':
        default:
            return 'Other';
    }
};
