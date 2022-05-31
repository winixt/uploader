import { FILE_STATUS } from './constants';
import FileBase from './fileBase';

export interface QueueStats {
    successNum: number;
    progressNum: number;

    cancelNum: number;
    invalidNum: number;
    uploadFailNum: number;
    queueNum: number;
    interruptNum: number;
}

export class Queue {
    accept: RegExp;
    filesQueue: FileBase[] = [];
    filesMap: Record<string, FileBase> = {};

    getStats() {
        const stats: QueueStats = {
            successNum: 0,
            progressNum: 0,

            cancelNum: 0,
            invalidNum: 0,
            uploadFailNum: 0,
            queueNum: 0,
            interruptNum: 0,
        };
        return this.filesQueue.reduce((acc: QueueStats, cur: FileBase) => {
            switch (cur.getStatus()) {
                case FILE_STATUS.QUEUED:
                    acc.queueNum++;
                    break;

                case FILE_STATUS.PROGRESS:
                    acc.progressNum++;
                    break;

                case FILE_STATUS.ERROR:
                    acc.uploadFailNum++;
                    break;

                case FILE_STATUS.COMPLETE:
                    acc.successNum++;
                    break;

                case FILE_STATUS.CANCELLED:
                    acc.cancelNum++;
                    break;

                case FILE_STATUS.INVALID:
                    acc.invalidNum++;
                    break;

                case FILE_STATUS.INTERRUPT:
                    acc.interruptNum++;
                    break;
            }
            return acc;
        }, stats);
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
    getFile(fileId: string | FileBase) {
        if (typeof fileId !== 'string') {
            return fileId;
        }
        return this.filesMap[fileId];
    }
    fetchFile(status: FILE_STATUS) {
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

        // TODO
        //  this.request( 'cancel-file', file );
        if (existing) {
            delete this.filesMap[file.id];
            this.delFile(file);
        }
    }
    /**
     * @method reset
     * @grammar reset() => undefined
     * @description 重置uploader。目前只重置了队列。
     * @for  Uploader
     * @example
     * uploader.reset();
     */
    reset() {
        this.filesQueue = [];
        this.filesMap = {};
    }

    destroy() {
        this.reset();
        // TODO wath is placeholder ?
        // this.placeholder && this.placeholder.destroy();
    }
    private fileAdded(file: FileBase) {
        const existing = this.filesMap[file.id];

        if (!existing) {
            this.filesMap[file.id] = file;
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
}
