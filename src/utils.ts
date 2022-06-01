export const nextTick = (cb: (...args: any[]) => void) => {
    setTimeout(cb, 1);
};

export function hashString(str: string) {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = char + (hash << 6) + (hash << 16) - hash;
    }

    return hash;
}
