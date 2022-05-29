export const guid = (() => {
    let counter = 0;

    return function (prefix?: string) {
        let timestramp = (+new Date()).toString(32);

        for (let i = 0; i < 5; i++) {
            timestramp += Math.floor(Math.random() * 65535).toString(32);
        }

        return (prefix || 'wu_') + timestramp + (counter++).toString(32);
    };
})();

export const formatSize = (size: number, pointLength?: number, units?: string[]) => {
    units = units || ['B', 'K', 'M', 'G', 'TB'];
    let unit = units.shift();

    while (unit && size > 1024) {
        size = size / 1024;
        unit = units.shift();
    }

    return (unit === 'B' ? size : size.toFixed(pointLength || 2)) + unit;
};
