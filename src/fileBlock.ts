import FileBase from './fileBase';

export interface FileBlock {
    file: FileBase;
    start: number;
    end: number;
    total: number;
    chunks: number;
    chunk: number;
    transport;
}

export class FileBlocks {
    blocks: FileBlock[];
    remaning: number;
    constructor(blocks: FileBlock[]) {
        this.blocks = blocks;
        this.remaning = this.blocks.length;
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
    getBlocks() {
        return this.blocks;
    }
}
