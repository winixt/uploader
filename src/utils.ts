export const nextTick = (cb: (...args: any[]) => void) => {
    setTimeout(cb, 1);
};
