import { Mediator } from './mediator';
import { UploaderOptions } from './types';
import { FileQueue } from './fileQueue';
import { FileBase } from './fileBase';

export class Uploader {
    options: UploaderOptions;
    emit: Mediator;
    queue: FileQueue;
    constructor(options: UploaderOptions) {
        this.options = options;
        this.emit = new Mediator();
        this.queue = new FileQueue(this.options, this.emit);
    }
    startUpload(files: File | File[]) {
        if (!Array.isArray(files)) {
            files = [files];
        }
        const fileBases = files.map((file: File) => {
            return new FileBase(file);
        });
        fileBases.forEach((file: FileBase) => {
            this.queue.startUpload(file);
        });

        return fileBases;
    }
    stopUpload(files?: FileBase | FileBase[]) {
        if (!Array.isArray(files)) {
            files = files ? [files] : null;
        }
        if (!files) {
            this.stopUpload();
        } else {
            files.forEach((file: FileBase) => {
                this.queue.stopUpload(file);
            });
        }
    }
    onProgress(fn: (percentage: number, file: File) => void) {
        this.emit.on('progress', fn);
    }
    onSuccess(fn: (response: any, file: File) => void) {
        this.emit.on('progress', fn);
    }
    onError(fn: (msg: string, file: File) => void) {
        this.emit.on('error', fn);
    }
}
