import { Mediator } from './mediator';
import { UploaderOptions } from './types';
export class Uploader {
    options: UploaderOptions;
    emit: Mediator;
    constructor(options: UploaderOptions) {
        this.options = options;
        this.emit = new Mediator();
    }
    onProgress(fn: (percentage: number, file: File) => void) {
        this.emit.on('progress', fn);
    }
    onSuccess(fn: (file: File) => void) {
        this.emit.on('progress', fn);
    }
    onError(fn: (msg: string, file: File) => void) {
        this.emit.on('error', fn);
    }
}
