import { FileBase } from './fileBase';
import { genBlockMeta, FileBlock } from './fileBlock';
import { Transport } from './transport';
import { UploaderOptions } from './types';
import { Mediator } from './mediator';
import { FILE_STATUS } from './constants';
import { nextTick } from './utils';
import {
    storeUploadFile,
    getUploadedRes,
    isUploaded,
    storeUploadBlock,
    isUploadedBlock,
} from './fileStore';

let poolIndex = 0;
interface PoolItem {
    id: number;
    retry: number;
    block: FileBlock;
    transport?: Transport;
}

export class FileQueue {
    fileQueue: FileBase[] = [];
    options: UploaderOptions;
    emit: Mediator;
    private pool: PoolItem[] = [];
    private activePool: PoolItem[] = [];
    constructor(options: UploaderOptions, emit: Mediator) {
        this.options = options;
        this.emit = emit;
    }
    startUpload(files: FileBase[]) {
        this.fileQueue.push(...files);
        this.filterFile(FILE_STATUS.QUEUED).forEach((file: FileBase) => {
            this.uploadFile(file);
        });
        this.filterFile(FILE_STATUS.INTERRUPT).forEach((file: FileBase) => {
            this.uploadFile(file);
        });
    }
    async uploadFile(file: FileBase) {
        if (!file.hash) {
            await file.genFileHash();
        }
        if (isUploaded(file)) {
            file.setStatus(FILE_STATUS.COMPLETE);
            this.emit.trigger('progress', 1, file);
            this.emit.trigger('success', getUploadedRes(file), file);
            return;
        }

        file.setStatus(FILE_STATUS.PROGRESS);

        let blocks = file.blocks;
        if (!blocks) {
            blocks = genBlockMeta(
                file,
                this.options.chunked,
                this.options.chunkSize,
            );
        }
        this.pool.push(
            ...blocks.map((block: FileBlock) => {
                return {
                    id: poolIndex++,
                    block,
                    retry: this.options.retry,
                };
            }),
        );
        nextTick(this.tick.bind(this));
    }
    stopAllUpload() {
        this.activePool.forEach((item) => {
            if (item.block) {
                item.transport?.destroy();
            }
        });
        this.pool = [];
        this.activePool = [];
        this.fileQueue.forEach((file: FileBase) => {
            if (
                ![FILE_STATUS.COMPLETE, FILE_STATUS.QUEUED].includes(
                    file.getStatus(),
                )
            ) {
                file.setStatus(FILE_STATUS.INTERRUPT);
            }
        });
    }
    stopTargetFileUpload(file: FileBase) {
        this.activePool.forEach((item) => {
            if (item.block.file === file) {
                item.transport?.destroy();
            }
        });

        if (file.getStatus() !== FILE_STATUS.COMPLETE) {
            file.setStatus(FILE_STATUS.INTERRUPT);
        }
        this.pool = this.excludeFilePoolItem(this.pool, file);
        this.activePool = this.excludeFilePoolItem(this.activePool, file);
        nextTick(this.tick.bind(this));
    }
    tick() {
        if (this.pool.length && this.activePool.length < this.options.threads) {
            const newActivePool = this.pool.splice(
                0,
                this.options.threads - this.activePool.length,
            );

            newActivePool.forEach((poolItem: PoolItem) => {
                this.sendBlock(poolItem);
            });
            this.activePool = this.activePool.concat(newActivePool);
        }
    }
    sendBlock(poolItem: PoolItem) {
        if (isUploadedBlock(poolItem.block)) {
            this.updateProgress(poolItem.block, 1);

            this.removePoolItemInActivePool(poolItem);
            nextTick(this.tick.bind(this));
            return;
        }
        const transport = new Transport(this.options.request);
        const { file, start, end } = poolItem.block;
        const chunk = file.source.slice(start, end);
        poolItem.transport = transport;
        transport.appendParam({
            chunk: chunk,
            totalChunk: poolItem.block.totalChunk,
            chunkIndex: poolItem.block.chunkIndex,
            filename: file.name,
            hash: file.hash,
            size: poolItem.block.size,
            chunkSize: this.options.chunkSize,
        });
        transport.send();
        transport.on('progress', (progress) => {
            this.updateProgress(poolItem.block, progress);
        });
        transport.on('success', (response) => {
            storeUploadBlock(poolItem.block, response);
            if (response.merge) {
                // 上传成功
                poolItem.block.file.setStatus(FILE_STATUS.COMPLETE);
                storeUploadFile(file, response.merge);
                this.emit.trigger('success', response.merge, file);
                this.stopTargetFileUpload(poolItem.block.file);
            } else {
                poolItem.transport.destroy();
                this.removePoolItemInActivePool(poolItem);
                nextTick(this.tick.bind(this));
            }
        });
        transport.on('error', (errorMsg) => {
            // 移除该文件所有 block
            if (!poolItem.retry) {
                this.stopTargetFileUpload(poolItem.block.file);
                this.emit.trigger('error', errorMsg, poolItem.block.file);
                file.setStatus(FILE_STATUS.ERROR);
            } else {
                poolItem.retry -= 1;
                this.sendBlock(poolItem);
            }
        });
    }

    private updateProgress(block: FileBlock, percentage: number) {
        block.progress = percentage;
        const allPercentage = block.file.getProgress();
        this.emit.trigger('progress', allPercentage, block.file);
    }

    findFile(file: File) {
        return this.fileQueue.filter((item: FileBase) => {
            return item.source === file;
        });
    }

    addFile(file: FileBase) {
        if (!this.fileQueue.find((item) => item.source === file.source)) {
            this.fileQueue.push(file);
        } else {
            throw new Error(`${file.source.name} is exist in file queue.`);
        }
    }
    removeFile(file: FileBase) {
        this.stopTargetFileUpload(file);
        const index = this.fileQueue.findIndex(
            (item) => item.source === file.source,
        );
        if (index !== -1) {
            this.fileQueue.splice(index, 1);
        }
    }
    removeAllFile() {
        this.stopAllUpload();
        this.fileQueue = [];
    }

    private removePoolItemInActivePool(poolItem: PoolItem) {
        const index = this.activePool.findIndex(
            (item) => item.id === poolItem.id,
        );
        if (index !== -1) {
            this.activePool.splice(index, 1);
        }
    }

    private filterFile(fileStatus: FILE_STATUS) {
        return this.fileQueue.filter((item) => item.status === fileStatus);
    }

    private excludeFilePoolItem(pool: PoolItem[], filebase: FileBase) {
        return pool.filter((item) => {
            return item.block.file !== filebase;
        });
    }
}
