import { FileBase } from './fileBase';
import { genBlockMeta, FileBlock } from './fileBlock';
import { Transport } from './transport';
import { UploaderOptions } from './types';
import { Mediator } from './mediator';
import { FILE_STATUS } from './constants';
import { nextTick } from './utils';

let poolIndex = 0;
interface PoolItem {
    id: number;
    retry: number;
    fileBase?: FileBase;
    block?: FileBlock;
}

// TODO 处理 block 错误重传和 暂停重传问题

export class FileQueue {
    fileQueue: FileBase[] = [];
    options: UploaderOptions;
    emit: Mediator;
    private pool: PoolItem[] = [];
    private activePool: PoolItem[] = [];
    constructor(options: UploaderOptions, emit: Mediator) {
        this.options = { ...options };
        this.emit = emit;
    }
    startUpload(fileBase: FileBase) {
        fileBase.setStatus(FILE_STATUS.PROGRESS);
        if (!this.options.chunked) {
            this.pool.push({
                id: poolIndex++,
                fileBase,
                retry: this.options.retry,
            });
        } else {
            const blockManager = genBlockMeta(fileBase, this.options.chunkSize);
            this.pool.push(
                ...blockManager.getBlocks().map((block: FileBlock) => {
                    return {
                        id: poolIndex++,
                        block,
                        retry: this.options.retry,
                    };
                }),
            );
        }
        nextTick(this.tick);
    }
    stopUpload(fileBase?: FileBase) {
        if (!fileBase) {
            this.activePool.forEach((item) => {
                if (item.fileBase) {
                    item.fileBase.transport?.abort();
                }
                if (item.block) {
                    item.block.transport?.abort();
                }
            });
            this.pool = [];
            this.activePool = [];
        } else {
            this.activePool.forEach((item) => {
                if (item.fileBase === fileBase) {
                    item.fileBase.transport?.abort();
                } else if (item.block && item.block.file === fileBase) {
                    item.block.transport?.abort();
                }
            });
            this.pool = this.removeFilePoolItem(this.pool, fileBase);
            this.activePool = this.removeFilePoolItem(
                this.activePool,
                fileBase,
            );
        }
    }
    tick() {
        if (this.pool.length && this.activePool.length < this.options.threads) {
            const newActivePool = this.pool.splice(
                0,
                this.options.threads - this.activePool.length,
            );

            newActivePool.forEach(this.upload);
            this.activePool = this.activePool.concat(newActivePool);
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
        transport.on('succeess', (response) => {
            this.emit.trigger('success', response, fileBase);
            nextTick(this.tick);
        });
        transport.on('error', (errorMsg) => {
            this.errorHandler(poolItem, errorMsg);
        });
    }
    sendBlock(poolItem: PoolItem) {
        const transport = new Transport(this.options.request);
        const { file, start, end } = poolItem.block;
        const chunk = file.source.slice(start, end);
        poolItem.block.transport = transport;
        transport.appendParam({
            chunk: chunk,
            chunks: poolItem.block.chunks,
            chunkIndex: poolItem.block.chunkIndex,
            filename: file.name,
            id: file.id,
        });
        transport.send();
        transport.on('progress', () => {
            const allPercentage = poolItem.block.manager.getProcessPercentage();
            this.emit.trigger('progress', allPercentage, file.source);
        });
        transport.on('succeess', () => {
            if (poolItem.block.manager.isSuccess()) {
                this.emit.trigger(
                    'success',
                    poolItem.block.manager.findUploadSuccessRes(),
                    poolItem.block.file,
                );
            }
            nextTick(this.tick);
        });
        transport.on('error', (errorMsg) => {
            // 移除该文件所有 block
            if (!poolItem.retry) {
                this.activePool.forEach((item) => {
                    if (item.block && item.block.file === poolItem.block.file) {
                        item.block.transport.abort();
                    }
                });
                this.pool = this.removeFilePoolItem(
                    this.pool,
                    poolItem.block.file,
                );
                this.activePool = this.removeFilePoolItem(
                    this.activePool,
                    poolItem.block.file,
                );
            }
            this.errorHandler(poolItem, errorMsg);
        });
    }

    errorHandler(poolItem: PoolItem, errorMsg: string) {
        const fileBase = this.getFileInPoolItem(poolItem);
        this.removePoolItem(this.activePool, poolItem.id);
        if (!poolItem.retry) {
            this.emit.trigger('error', errorMsg, fileBase.source);
            nextTick(this.tick);
        } else {
            poolItem.retry -= 1;
            this.upload(poolItem);
        }
    }
    getFileInPoolItem(poolItem: PoolItem) {
        if (poolItem.fileBase) {
            return poolItem.fileBase;
        }
        return poolItem.block.file;
    }
    removeFilePoolItem(pool: PoolItem[], filebase: FileBase) {
        return pool.filter((item) => {
            if (item.fileBase) return item.fileBase !== filebase;
            if (item.block) return item.block.file !== filebase;
            return true;
        });
    }
    removePoolItem(pool: PoolItem[], poolId: number) {
        const index = pool.findIndex((item: PoolItem) => item.id === poolId);
        if (index !== -1) {
            pool.splice(index, 1);
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
