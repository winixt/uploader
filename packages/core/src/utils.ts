import pako from 'pako';
import { FileBase } from './fileBase';
import { FileBlock } from './fileBlock';

export const nextTick = (cb: (...args: any[]) => void) => {
    setTimeout(cb, 1);
};

export const compressBlock = (
    file: FileBase,
    block: FileBlock,
): Promise<Blob> => {
    return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = function (e) {
            const result = pako.deflate(
                new Uint8Array(e.target?.result as ArrayBuffer),
            );
            resolve(new Blob([result]));
        };

        fileReader.onerror = function () {
            console.warn('oops, something went wrong.');
        };

        const { start, end } = block;
        fileReader.readAsArrayBuffer(file.source.slice(start, end));
    });
};
