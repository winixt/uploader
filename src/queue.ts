import { FILE_STATUS } from './constants';
import { Mediator } from './mediator';
import { AcceptType } from './types';
import FileBase from './fileBase';

export interface QueueStats {
    numOfQueue: number;
    numOfSuccess: number;
    numOfCancel: number;
    numOfProgress: number;
    numOfUploadFailed: number;
    numOfInvalid: number;
    numOfDeleted: number;
    numOfInterrupt: number;
}

export class Queue extends Mediator {
    stats: QueueStats = {
        numOfQueue: 0,
        numOfSuccess: 0,
        numOfCancel: 0,
        numOfProgress: 0,
        numOfUploadFailed: 0,
        numOfInvalid: 0,
        numOfDeleted: 0,
        numOfInterrupt: 0,
    };
    accept: RegExp;
    filesQueue: FileBase[] = [];
    filesMap: Record<string, FileBase> = {};

    constructor() {
        super();
    }
    getStats() {
        return this.stats;
    }
    append(file: FileBase) {
        this.filesQueue.push(file);
        this.fileAdded(file);
        return this;
    }
    prepend(file: FileBase) {
        this.filesQueue.unshift(file);
        this.fileAdded(file);
        return this;
    }
    getFile(fileId: string) {
        if (typeof fileId !== 'string') {
            return fileId;
        }
        return this.filesMap[fileId];
    }
    fetch(status: FILE_STATUS) {
        status = status || FILE_STATUS.QUEUED;

        for (let i = 0; i < this.filesQueue.length; i++) {
            const file = this.filesQueue[i];

            if (status === file.getStatus()) {
                return file;
            }
        }

        return null;
    }
    sort(fn: (a: FileBase, b: FileBase) => number) {
        if (typeof fn === 'function') {
            this.filesQueue.sort(fn);
        }
    }
    // 获取指定类型的文件列表, 列表中每一个成员为[File](#WebUploader:File)对象。
    getFiles(status: FILE_STATUS) {
        const result = [];

        for (let i = 0; i < this.filesQueue.length; i++) {
            const file = this.filesQueue[i];

            if (file.getStatus() !== status) {
                continue;
            }

            result.push(file);
        }

        return result;
    }
    /**
     * 在队列中删除文件。
     * @grammar removeFile( file ) => Array
     * @method removeFile
     * @param {File} 文件对象。
     */
    removeFile(file: FileBase) {
        const existing = this.filesMap[file.id];

        if (existing) {
            delete this.filesMap[file.id];
            this.delFile(file);
            file.destroy();
            this.stats.numOfDeleted++;
        }
    }
    private fileAdded(file: FileBase) {
        const existing = this.filesMap[file.id];

        if (!existing) {
            this.filesMap[file.id] = file;

            file.on('statuschange', (cur: FILE_STATUS, pre: FILE_STATUS) => {
                this.onFileStatusChange(cur, pre);
            });
        }
    }
    private delFile(file: FileBase) {
        for (let i = this.filesQueue.length - 1; i >= 0; i--) {
            if (this.filesQueue[i] === file) {
                this.filesQueue.splice(i, 1);
                break;
            }
        }
    }
    private onFileStatusChange(curStatus: FILE_STATUS, preStatus: FILE_STATUS) {
        const stats = this.stats;

        // eslint-disable-next-line default-case
        switch (preStatus) {
            case FILE_STATUS.PROGRESS:
                stats.numOfProgress--;
                break;

            case FILE_STATUS.QUEUED:
                stats.numOfQueue--;
                break;

            case FILE_STATUS.ERROR:
                stats.numOfUploadFailed--;
                break;

            case FILE_STATUS.INVALID:
                stats.numOfInvalid--;
                break;

            case FILE_STATUS.INTERRUPT:
                stats.numOfInterrupt--;
                break;
        }

        // eslint-disable-next-line default-case
        switch (curStatus) {
            case FILE_STATUS.QUEUED:
                stats.numOfQueue++;
                break;

            case FILE_STATUS.PROGRESS:
                stats.numOfProgress++;
                break;

            case FILE_STATUS.ERROR:
                stats.numOfUploadFailed++;
                break;

            case FILE_STATUS.COMPLETE:
                stats.numOfSuccess++;
                break;

            case FILE_STATUS.CANCELLED:
                stats.numOfCancel++;
                break;

            case FILE_STATUS.INVALID:
                stats.numOfInvalid++;
                break;

            case FILE_STATUS.INTERRUPT:
                stats.numOfInterrupt++;
                break;
        }
    }
}
