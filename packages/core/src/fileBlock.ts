import { FileBase } from './fileBase';

export function genBlockMeta(
    file: FileBase,
    chunked: boolean,
    chunkSize: number,
) {
    const pending: FileBlock[] = [];
    const blob = file.source;
    const total = blob.size;

    if (chunked) {
        const totalChunk = chunkSize ? Math.ceil(total / chunkSize) : 1;
        let start = 0;

        for (let index = 0; index < totalChunk; index++) {
            const len = Math.min(chunkSize, total - start);
            pending.push({
                file: file,
                start: start,
                end: chunkSize ? start + len : total,
                size: total,
                totalChunk: totalChunk,
                chunkIndex: index,
                progress: 0,
            });
            start += len;
        }
    } else {
        pending.push({
            file: file,
            start: 0,
            end: total,
            size: total,
            totalChunk: 1,
            chunkIndex: 0,
            progress: 0,
        });
    }

    file.blocks = pending;

    return pending;
}

export interface FileBlock {
    file: FileBase;
    start: number;
    end: number;
    size: number;
    totalChunk: number;
    chunkIndex: number;
    progress: number;
}
