import { FILE_STATUS } from './constants';
import { Mediator } from './mediator';

export class Queue extends Mediator {
    constructor() {
        super();
        this.stats = {
            numOfQueue: 0,
            numOfSuccess: 0,
            numOfCancel: 0,
            numOfProgress: 0,
            numOfUploadFailed: 0,
            numOfInvalid: 0,
            numOfDeleted: 0,
            numOfInterrupt: 0,
        };
        // 上传队列，仅包括等待上传的文件
        this._queue = [];

        // 存储所有文件
        this._map = {};
    }
    append(file) {
        this._queue.push(file);
        this._fileAdded(file);
        return this;
    }
    prepend(file) {
        this._queue.unshift(file);
        this._fileAdded(file);
        return this;
    }
    getFile(fileId) {
        if (typeof fileId !== 'string') {
            return fileId;
        }
        return this._map[fileId];
    }
    fetch(status) {
        status = status || FILE_STATUS.QUEUED;

        for (let i = 0; i < this._queue.length; i++) {
            const file = this._queue[i];

            if (status === file.getStatus()) {
                return file;
            }
        }

        return null;
    }
    sort(fn) {
        if (typeof fn === 'function') {
            this._queue.sort(fn);
        }
    }
    // 获取指定类型的文件列表, 列表中每一个成员为[File](#WebUploader:File)对象。
    getFiles(status) {
        const result = [];

        for (let i = 0; i < this._queue.length; i++) {
            const file = this._queue[i];

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
    removeFile(file) {
        const existing = this._map[file.id];

        if (existing) {
            delete this._map[file.id];
            this._delFile(file);
            file.destroy();
            this.stats.numOfDeleted++;
        }
    }
    _fileAdded(file) {
        const existing = this._map[file.id];

        if (!existing) {
            this._map[file.id] = file;

            file.on('statuschange', (cur, pre) => {
                this._onFileStatusChange(cur, pre);
            });
        }
    }
    _delFile(file) {
        for (let i = this._queue.length - 1; i >= 0; i--) {
            if (this._queue[i] === file) {
                this._queue.splice(i, 1);
                break;
            }
        }
    }
    _onFileStatusChange(curStatus, preStatus) {
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
