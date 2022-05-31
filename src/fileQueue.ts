import { FileBase } from './fileBase';
import { genBlockMeta, FileBlock } from './fileBlock';
import { Transport } from './transport';
import { UploaderOptions } from './types';
import { Mediator } from './mediator';
import { FILE_STATUS } from './constants';
import { nextTick } from './utils';

interface PoolItem {
    retry: number;
    fileBase?: FileBase;
    block?: FileBlock;
}

export class FileQueue {
    fileQueue: FileBase[] = [];
    options: UploaderOptions;
    emit: Mediator;
    private pool: PoolItem[] = [];
    private currentThreads = 0; // 当前请求并发数
    constructor(options: UploaderOptions, emit: Mediator) {
        this.options = { ...options };
        this.emit = emit;
    }

    startUpload(fileBase: FileBase) {
        fileBase.setStatus(FILE_STATUS.PROGRESS);
        if (!this.options.chunked) {
            this.pool.push({
                fileBase,
                retry: this.options.retry,
            });
        } else {
            const blockManager = genBlockMeta(fileBase, this.options.chunkSize);
            this.pool.push(
                ...blockManager.getBlocks().map((block: FileBlock) => {
                    return {
                        block,
                        retry: this.options.retry,
                    };
                }),
            );
        }
        nextTick(this.tick);
    }
    tick() {
        if (this.currentThreads < this.options.threads) {
            const activePool = this.pool.splice(
                0,
                this.options.threads - this.currentThreads,
            );
            this.currentThreads += activePool.length;

            activePool.forEach(this.upload);
        }
    }
    upload(poolItem: PoolItem) {
        if (poolItem.fileBase) {
            this.sendFile(poolItem);
        } else if (poolItem.block) {
            this.sendBlock(poolItem);
        }
    }
    sendFile(poolItem: PoolItem) {
        const fileBase = poolItem.fileBase;
        const transport = new Transport(this.options.request);
        fileBase.transport = transport;
        transport.appendParam({
            [this.options.request.fileField]: fileBase,
        });
        transport.send();
        transport.on('progress', (percentage) => {
            this.emit.trigger('progress', percentage, fileBase);
        });
        transport.on('succeess', () => {
            this.emit.trigger('success', fileBase);
            nextTick(this.tick);
        });
        transport.on('error', (errorMsg) => {
            this.errorHandler(poolItem, errorMsg);
        });
    }
    sendBlock(poolItem: PoolItem) {
        const transport = new Transport(this.options.request);
        transport.appendParam(params);
        transport.send();
        transport.on('progress', (percentage) => {
            this.emit.trigger('progress', percentage, fileBase);
        });
        transport.on('succeess', () => {
            this.emit.trigger('success', fileBase);
        });
        transport.on('error', (errorMsg) => {
            this.errorHandler(poolItem, errorMsg);
        });
    }
    errorHandler(poolItem: PoolItem, errorMsg: string) {
        if (!poolItem.retry) {
            this.emit.trigger('error', errorMsg, poolItem.fileBase.source);
            nextTick(this.tick);
        } else {
            poolItem.retry -= 1;
            this.pool.push(poolItem);
        }
    }
    addFile(file: File) {
        if (!this.fileQueue.find((item) => item.source === file)) {
            this.fileQueue.push(new FileBase(file));
        }
    }
    removeFile(file: File) {
        const index = this.fileQueue.findIndex((item) => item.source === file);
        if (index !== -1) {
            this.fileQueue.splice(index, 1);
        }
    }
}
