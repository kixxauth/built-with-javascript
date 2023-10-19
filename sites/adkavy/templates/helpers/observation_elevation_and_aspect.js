
exports.helper = function observation_elevation_and_aspect(observation) {
    if (observation.elevation || observation.aspect) {
        const elevation = observation.elevation || 'Elevation not provided';
        const aspect = observation.aspect ? mapAspect(observation.aspect) : 'Aspect not provided';

        return `${ elevation } / ${ aspect }`;
    }

    return 'Not Provided';
};

function mapAspect(aspect) {
    switch (aspect.toUpperCase()) {
        case 'N':
            return 'North';
        case 'NW':
            return 'Northwest';
        case 'W':
            return 'West';
        case 'SW':
            return 'Southwest';
        case 'S':
            return 'South';
        case 'SE':
            return 'Southeast';
        case 'E':
            return 'East';
        case 'NE':
            return 'Northeast';
        default:
            return 'Unknown';
    }
}
