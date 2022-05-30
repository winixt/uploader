export const guid = (() => {
    let counter = 0;

    return function (prefix?: string) {
        let timestamp = (+new Date()).toString(32);

        for (let i = 0; i < 5; i++) {
            timestamp += Math.floor(Math.random() * 65535).toString(32);
        }

        return (prefix || 'wu_') + timestamp + (counter++).toString(32);
    };
})();

export const formatSize = (
    size: number,
    pointLength?: number,
    units?: string[],
) => {
    units = units || ['B', 'K', 'M', 'G', 'TB'];
    let unit = units.shift();

    while (unit && size > 1024) {
        size = size / 1024;
        unit = units.shift();
    }

    return (unit === 'B' ? size : size.toFixed(pointLength || 2)) + unit;
};

export const os = (function (ua) {
    const ret: {
        ios?: number;
        android?: number;
    } = {};

    const android = ua.match(/(?:Android);?[\s\/]+([\d.]+)?/);
    const ios = ua.match(/(?:iPad|iPod|iPhone).*OS\s([\d_]+)/);

    if (android) {
        ret.android = parseFloat(android[1]);
    }

    if (ios) {
        ret.ios = parseFloat(ios[1].replace(/_/g, '.'));
    }
    return ret;
})(navigator.userAgent);
