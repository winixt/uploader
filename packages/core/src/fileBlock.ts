import { FileBase } from './fileBase';
import { Transport } from './transport';

export function genBlockMeta(
    file: FileBase,
    chunked: boolean,
    chunkSize: number,
) {
    const pending: FileBlock[] = [];
    const blob = file.source;
    const total = blob.size;
    const blockManager = new FileBlockManager(file);

    if (chunked) {
        const chunks = chunkSize ? Math.ceil(total / chunkSize) : 1;
        let start = 0;

        for (let index = 0; index < chunks; index++) {
            const len = Math.min(chunkSize, total - start);
            pending.push({
                file: file,
                start: start,
                end: chunkSize ? start + len : total,
                total: total,
                chunks: chunks,
                chunkIndex: index,
                manager: blockManager,
            });
            start += len;
        }
    } else {
        pending.push({
            file: file,
            start: 0,
            end: total,
            total: total,
            chunks: 1,
            chunkIndex: 0,
            manager: blockManager,
        });
    }

    blockManager.setBlocks(pending);

    file.blocks = pending.concat();
    file.remainingBlock = pending.length;

    return blockManager;
}

export class FileBlockManager {
    file: FileBase;
    blocks: FileBlock[] = [];
    constructor(file: FileBase) {
        this.file = file;
    }
    has() {
        return !!this.blocks.length;
    }

    shift() {
        return this.blocks.shift();
    }

    unshift(block: FileBlock) {
        this.blocks.unshift(block);
    }
    setBlocks(blocks: FileBlock[]) {
        this.blocks = blocks;
        return this;
    }
    getBlocks() {
        return this.blocks;
    }
    getProcessPercentage() {
        return this.blocks.reduce((acc, cur) => {
            return (acc +=
                (cur.transport ? cur.transport.process : 0) / cur.chunks);
        }, 0);
    }
    isSuccess() {
        return this.blocks.some((item) => {
            const response = item.transport?.getResponse() as any;
            return response && response.merge;
        });
    }
    findUploadSuccessRes() {
        let successRes: Record<string, any> = {};
        this.blocks.forEach((item: FileBlock) => {
            const response = item.transport?.getResponse() as any;
            if (typeof response !== 'string' && response.merge) {
                successRes = response.merge;
            }
        });

        return successRes;
    }
}
export interface FileBlock {
    file: FileBase;
    start: number;
    end: number;
    total: number;
    chunks: number;
    chunkIndex: number;
    transport?: Transport;
    manager: FileBlockManager;
}
