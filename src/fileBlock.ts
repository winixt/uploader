import { FileBase } from './fileBase';
import { Transport } from './transport';

export function genBlockMeta(file: FileBase, chunkSize: number) {
    const pending: FileBlock[] = [];
    const blob = file.source;
    const total = blob.size;
    const chunks = chunkSize ? Math.ceil(total / chunkSize) : 1;
    let start = 0;

    const blockManager = new FileBlockManager(file);
    for (let index = 0; index < chunks; index++) {
        const len = Math.min(chunkSize, total - start);
        pending.push({
            file: file,
            start: start,
            end: chunkSize ? start + len : total,
            total: total,
            chunks: chunks,
            chunk: index,
            transport: null,
            manager: blockManager,
        });
        start += len;
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
}
export interface FileBlock {
    file: FileBase;
    start: number;
    end: number;
    total: number;
    chunks: number;
    chunk: number;
    waiting?: boolean;
    transport: Transport;
    manager: FileBlockManager;
}
