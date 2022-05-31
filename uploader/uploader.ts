import FileBase from './fileBase';
import { Queue } from './queue';
import { AcceptType } from './types';
import { Mediator } from './mediator';
import { Upload } from './upload';
import { FILE_STATUS } from './constants';
import { UploaderOptions } from './types';

export class Uploader {
    options: UploaderOptions;
    queue: Queue;
    accept: RegExp;
    upload: Upload;
    emit: Mediator;
    constructor(options: Partial<UploaderOptions>) {
        this.options = {
            auto: false,
            prepareNextFile: false,
            chunked: false,
            chunkSize: 5242880, // 5M
            chunkRetry: 2,
            threads: 3,
            fileVal: 'file',
            method: 'POST',
            sendAsBinary: false,
            withCredentials: true,
            timeout: 2 * 60 * 1000, // 2min
            ...options,
        };

        this.emit = new Mediator();
        this.queue = new Queue();
        this.upload = new Upload(this.options);
        this.accept = this.genAcceptReg();
    }
    private genAcceptReg(accept?: AcceptType | AcceptType[]) {
        if (accept) {
            const accepts = Array.isArray(accept) ? accept : [accept];
            const arr = [];

            for (let i = 0; i < accepts.length; i++) {
                const item = accepts[i].extensions;
                item && arr.push(item);
            }

            if (arr.length) {
                return new RegExp(
                    '\\.' +
                        arr
                            .join(',')
                            .replace(/,/g, '$|\\.')
                            .replace(/\*/g, '.*') +
                        '$',
                    'i',
                );
            }
        }
        return null;
    }
    acceptFile(file: File | FileBase) {
        const invalid =
            !file ||
            !file.size ||
            (this.accept &&
                /\.\w+$/.exec(file.name) &&
                !this.accept.test(file.name));

        return !invalid;
    }
    // 为了支持外部直接添加一个原生File对象。
    private wrapFile(file: FileBase | File) {
        if (!(file instanceof FileBase)) {
            return new FileBase(file);
        }
        return file;
    }
    getFile(file: FileBase | string) {
        if (typeof file === 'string') {
            return this.queue.getFile(file);
        }
        return file;
    }
    /**
     * @method retry
     * @grammar retry() => undefined
     * @grammar retry( file ) => undefined
     * @description 重试上传，重试指定文件，或者从出错的文件开始重新上传。
     * @for  Uploader
     * @example
     * function retry() {
     *     uploader.retry();
     * }
     */
    retry(file: string | FileBase, noForceStart?: boolean) {
        file = this.getFile(file);
        if (file) {
            file.setStatus(FILE_STATUS.QUEUED);
            noForceStart || this.startUpload(file);
            return;
        }

        const files = this.queue.getFiles(FILE_STATUS.ERROR);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            file.setStatus(FILE_STATUS.QUEUED);
        }

        // TODO
        // me.request('start-upload');
    }
    reset() {
        this.queue.reset();
        this.emit.trigger('reset');
    }
    private _addFile(file: FileBase | File) {
        file = this.wrapFile(file);
        if (!this.emit.trigger('beforeFileQueued', file)) return;
        if (!this.acceptFile(file)) {
            this.emit.trigger('error', 'Q_TYPE_DENIED', file);
            return;
        }
        this.queue.append(file);
        this.emit.trigger('fileQueued', file);
    }

    addFile(file: File | File[] | FileBase | FileBase[]) {
        const files = (Array.isArray(file) ? file : [file]).map(this._addFile);

        if (files.length) {
            this.emit.trigger('filesQueued', files);
            if (this.options.auto) {
                // TODO 上传
                // setTimeout(function() {
                //     me.request('start-upload');
                // }, 20 );
            }
        }
    }

    getStats() {
        return this.queue.getStats();
    }

    stopUpload(file: FileBase | boolean | string, interrupt?: boolean) {
        if (typeof file === 'string') {
            file = this.queue.getFile(file);
        }
    }
    startUpload(file?: FileBase | string) {
        if (typeof file === 'string') {
            file = this.queue.getFile(file);
        }
        this.queue.getFiles(FILE_STATUS.INVALID).forEach(this.queue.removeFile);

        if (!file) {
            this.queue
                .getFiles(FILE_STATUS.INITED)
                .forEach((file: FileBase) => {
                    file.setStatus(FILE_STATUS.QUEUED);
                });
        }
        if (!this.upload.running && !file) {
            this.queue
                .getFiles(FILE_STATUS.INTERRUPT)
                .forEach((file: FileBase) => {
                    file.setStatus(FILE_STATUS.PROGRESS);
                });
        }
        this.upload.startUpload(file);
    }
    cancelUpload(file: FileBase) {
        file.blocks &&
            file.blocks.forEach((block) => {
                const _tr = block.transport;

                if (_tr) {
                    _tr.abort();
                    _tr.destroy();
                    delete block.transport;
                }
            });
    }
    cancelFile(file: FileBase | string) {
        file = this.getFile(file);
        this.upload.cancelFile(file);
    }
    skipFile(file: FileBase | string, status: FILE_STATUS) {
        file = this.getFile(file);

        this.upload.skipFile(file, status);
    }
    onProgress(fn: (...args: any[]) => void) {
        this.emit.on('progress', fn);
    }
    onUploadSkip(fn: (...args: any[]) => void) {
        this.emit.on('uploadSkip', fn);
    }
    onBeforeFileQueued(fn: (...args: any[]) => void) {
        this.emit.on('beforeFileQueued', fn);
    }
    onFileQueued(fn: (...args: any[]) => void) {
        this.emit.on('fileQueued', fn);
    }
    onFilesQueued(fn: (...args: any[]) => void) {
        this.emit.on('filesQueued', fn);
    }
    onFileDequeued(fn: (...args: any[]) => void) {
        this.emit.on('fileDequeued', fn);
    }
    onLoad(fn: (...args: any[]) => void) {
        this.emit.on('load', fn);
    }
    onError(fn: (...args: any[]) => void) {
        this.emit.on('error', fn);
    }
    onReset(fn: (...args: any[]) => void) {
        this.emit.on('reset', fn);
    }
}
