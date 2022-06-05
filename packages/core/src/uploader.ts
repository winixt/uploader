import { merge } from 'lodash-es';
import { Mediator } from './mediator';
import { UploaderOptions } from './types';
import { FileQueue } from './fileQueue';
import { FileBase } from './fileBase';

type FileType = File | FileBase;

export class Uploader {
    options: UploaderOptions;
    emit: Mediator;
    queue: FileQueue;
    constructor(options: UploaderOptions) {
        this.options = options;
        this.emit = new Mediator();
        this.queue = new FileQueue(this.options, this.emit);
    }
    wrapFile(file: FileType) {
        if (file instanceof FileBase) {
            return file;
        }
        return new FileBase(file);
    }
    setOption(opts: Partial<UploaderOptions>) {
        merge(this.options, opts);
    }
    // 执行上传，并将文件添加到队列
    startUpload(files?: FileType | FileType[]) {
        if (!Array.isArray(files)) {
            files = files ? [files] : [];
        }
        const fileBases = files.map(this.wrapFile);
        this.queue.startUpload(fileBases);

        return fileBases;
    }
    stopUpload(files?: FileType | FileType[]) {
        if (!Array.isArray(files)) {
            files = files ? [files] : null;
        }
        if (!files) {
            this.queue.stopAllUpload();
        } else {
            files.forEach((file: FileType) => {
                if (file instanceof FileBase) {
                    this.queue.stopTargetFileUpload(file);
                } else {
                    const fileBases = this.queue.findFile(file);
                    fileBases.forEach(this.queue.stopTargetFileUpload);
                }
            });
        }
    }
    getFiles() {
        return this.queue.fileQueue;
    }
    // 仅添加文件到队列中，不执行上传
    addFile(file: FileType) {
        file = this.wrapFile(file);
        this.queue.addFile(file);
    }
    // 移除文件的时候，记得调用，避免内存泄漏
    removeFile(file?: FileType) {
        if (!file) {
            this.queue.removeAllFile();
        } else {
            if (file instanceof FileBase) {
                this.queue.removeFile(file);
            } else {
                const fileBases = this.queue.findFile(file);
                fileBases.forEach(this.queue.removeFile);
            }
        }
    }
    onProgress(fn: (percentage: number, file: File) => void) {
        this.emit.on('progress', fn);
    }
    onSuccess(fn: (response: any, file: File) => void) {
        this.emit.on('success', fn);
    }
    onError(fn: (msg: string, file: File) => void) {
        this.emit.on('error', fn);
    }
}
