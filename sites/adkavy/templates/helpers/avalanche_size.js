exports.helper = function avalanche_size(size) {
    switch (size) {
        case 'd1':
            return 'D1: Relatively harmless to people.';
        case 'd2':
            return 'D2: Could bury, injure, or kill a person.';
        case 'd3':
            return 'D3: Could bury and destroy a car, damage a truck, destroy a wood frame house, or break a few trees.';
        case 'd4':
            return 'D4: Could destroy a railway car, large truck, several buildings, or a substantial amount of forest.';
        default:
            return 'Size: Unspecified';
    }
};
