import FileBase from './fileBase';
import { Queue } from './queue';
import { AcceptType } from './types';
import { Mediator } from './mediator';
import { Upload } from './upload';
import { FILE_STATUS } from './constants';
import { UploaderOptions } from './types';

export class Uploader extends Mediator {
    options: UploaderOptions;
    queue: Queue;
    accept: RegExp;
    upload: Upload;
    constructor(options: Partial<UploaderOptions>) {
        super();
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
            ...options,
        };

        this.queue = new Queue();
        this.upload = new Upload();
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
    private _getFile(file: FileBase | string) {
        if (typeof file === 'string') {
            return this.queue.getFile(file);
        }
        return file;
    }
    private _addFile(file: FileBase | File) {
        file = this.wrapFile(file);
        if (!this.trigger('beforeFileQueued', file)) return;
        if (!this.acceptFile(file)) {
            this.trigger('error', 'Q_TYPE_DENIED', file);
            return;
        }
        this.queue.append(file);
        this.trigger('fileQueued', file);
    }

    addFile(file: File | File[] | FileBase | FileBase[]) {
        const files = (Array.isArray(file) ? file : [file]).map(this._addFile);

        if (files.length) {
            this.trigger('filesQueued', files);
            if (this.options.auto) {
                // TODO 上传
            }
        }
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

        if (file) {
        } else {
            this.queue
                .getFiles(FILE_STATUS.INITED)
                .forEach((file: FileBase) => {
                    file.setStatus(FILE_STATUS.QUEUED);
                });
        }
    }
    cancelUpload(file: FileBase) {
        file.fileBlocks &&
            file.fileBlocks.getBlocks().forEach((block) => {
                const _tr = block.transport;

                if (_tr) {
                    _tr.abort();
                    _tr.destroy();
                    delete block.transport;
                }
            });
    }
    cancelFile(file: FileBase | string) {
        file = this._getFile(file);
        this.cancelUpload(file);
        this.trigger('fileDequeued', file);
    }
    skipFile(file: FileBase | string, status: FILE_STATUS) {
        file = this._getFile(file);

        file.setStatus(status || FILE_STATUS.COMPLETE);
        file.skipped = true;

        // 如果正在上传。
        this.cancelUpload(file);
        this.trigger('uploadSkip', file);
    }
}
