import FileBase from './fileBase';
import { Transport } from './transport';

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
    transport: Transport;
    manager: FileBlockManager;
}
