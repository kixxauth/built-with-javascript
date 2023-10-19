
exports.helper = function observation_red_flags(flags) {
    return flags.map(mapFlag).join(', ');
};

function mapFlag(flag) {
    switch (flag) {
        case 'recent_avalanches':
            return 'Recent Avalanches';
        case 'shooting_cracks':
            return 'Shooting Cracks';
        case 'whumpfing_collapsing':
            return 'Whumpfing/Collapsing';
        case 'heavy_precipitation':
            return 'Heavy Snowfall / Other Precipitation';
        case 'rapid_warming':
            return 'Rapid Warming';
        case 'drifting_snow':
            return 'Drifting Snow / Windloading';
        default:
            return 'Unknown';
    }
}
