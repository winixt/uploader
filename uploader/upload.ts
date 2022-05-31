import { FILE_STATUS } from './constants';
import FileBase from './fileBase';
import { FileBlock, FileBlockManager } from './fileBlock';
import { UploaderOptions } from './types';
import { Mediator } from './mediator';
import { nextTick } from './utils';

interface PromiseFile {
    promise: Promise<any>;
    file: FileBase;
}

// 负责将文件切片。
function cuteFile(file: FileBase, chunkSize: number) {
    const pending: FileBlock[] = [];
    const blob = file.source;
    const total = blob.size;
    const chunks = chunkSize ? Math.ceil(total / chunkSize) : 1;
    let start = 0;

    const blockManager = new FileBlockManager(file);
    for (let index = 0; index < chunks; index++) {
        const len = Math.min(chunkSize, total - start);
        pending.push({
            file: file,
            start: start,
            end: chunkSize ? start + len : total,
            total: total,
            chunks: chunks,
            chunk: index,
            transport: null,
            manager: blockManager,
        });
        start += len;
    }
    blockManager.setBlocks(pending);

    file.blocks = pending.concat();
    file.remaining = pending.length;

    return blockManager;
}

export class Upload {
    running = false;
    progress = false;
    remaining = 0;
    // 记录当前正在传的数据，跟threads相关
    pool: FileBlock[] = [];
    // 缓存分好片的文件。
    stack: FileBlockManager[] = [];
    // 缓存即将上传的文件。
    pending: Promise<FileBase>[] = [];
    private trigged = false;
    private promiseFile: PromiseFile;
    options: UploaderOptions;
    emit: Mediator;
    constructor(options: UploaderOptions, emit: Mediator) {
        this.options = options;
        this.emit = emit;
        // owner TODO
        // .on( 'startUpload', function() {
        //     me.progress = true;
        // })
        // .on( 'uploadFinished', function() {
        //     me.progress = false;
        // });
        // 销毁上传相关的属性。 TODO
        // owner.on( 'uploadComplete', function( file ) {

        //     // 把其他块取消了。
        //     file.blocks && $.each( file.blocks, function( _, v ) {
        //         v.transport && (v.transport.abort(), v.transport.destroy());
        //         delete v.transport;
        //     });

        //     delete file.blocks;
        //     delete file.remaning;
        // });
    }
    reset() {
        this.stopUpload(true);
        this.running = false;
        this.pool = [];
        this.stack = [];
        this.pending = [];
        this.remaining = 0;
        this.trigged = false;
        this.promise = null;
    }
    triggerStartUpload(file?: FileBase) {
        this.progress = true;
        this.emit.trigger('startUpload', file); // 开始上传或暂停恢复的，trigger event
    }
    triggerStopUpload(file?: FileBase) {
        this.progress = false;
        this.emit.trigger('stopUpload', file); // 开始上传或暂停恢复的，trigger event
    }
    /**
     * 开始上传。此方法可以从初始状态调用开始上传流程，也可以从暂停状态调用，继续上传流程。
     *
     * 可以指定开始某一个文件。
     * @grammar upload() => undefined
     * @grammar upload( file | fileId) => undefined
     * @method upload
     * @for  Uploader
     */
    startUpload(file: FileBase) {
        // 如果指定了开始某个文件，则只开始指定的文件。
        if (file) {
            if (file.getStatus() === FILE_STATUS.INTERRUPT) {
                file.setStatus(FILE_STATUS.QUEUED);
                this.pool.forEach((block: FileBlock) => {
                    if (block.file !== file) {
                        return;
                    }

                    block.transport && block.transport.send();
                    file.setStatus(FILE_STATUS.PROGRESS);
                });
            } else if (file.getStatus() !== FILE_STATUS.PROGRESS) {
                file.setStatus(FILE_STATUS.QUEUED);
            }
        }

        if (this.running) {
            this.triggerStartUpload(file);
            return nextTick(this.tick);
        }

        this.running = true;

        // 如果有暂停的，则续传
        if (!file) {
            this.pool.forEach((block: FileBlock) => {
                const file = block.file;

                if (file.getStatus() === FILE_STATUS.INTERRUPT) {
                    this.trigged = false;
                    file.setStatus(FILE_STATUS.PROGRESS);

                    if (block.waiting) {
                        return;
                    }

                    // 文件 prepare 完后，如果暂停了，这个时候只会把文件插入 pool, 而不会创建 tranport，
                    block.transport
                        ? block.transport.send()
                        : this.doSend(block);
                }
            });
        }

        // TODO 逻辑优化
        // if (!file) {
        //     this.queue
        //         .getFiles(FILE_STATUS.INTERRUPT)
        //         .forEach((file: FileBase) => {
        //             file.setStatus(FILE_STATUS.PROGRESS);
        //         });
        // }

        this.trigged = false;
        nextTick(this.tick);
        this.triggerStartUpload(file);
    }
    /**
     * 暂停上传。第一个参数为是否中断上传当前正在上传的文件。
     *
     * 如果第一个参数是文件，则只暂停指定文件。
     * @grammar stop() => undefined
     * @grammar stop( true ) => undefined
     * @grammar stop( file ) => undefined
     * @method stop
     * @for  Uploader
     */
    stopUpload(file: FileBase | boolean, interrupt?: boolean) {
        // TODO stop upload 不能传 fileId
        if (file === true) {
            interrupt = file;
            file = null;
        }

        if (this.running === false) {
            return;
        }

        // 如果只是暂停某个文件。
        if (file && typeof file !== 'boolean') {
            if (
                file.getStatus() !== FILE_STATUS.PROGRESS &&
                file.getStatus() !== FILE_STATUS.QUEUED
            ) {
                return;
            }

            file.setStatus(FILE_STATUS.INTERRUPT);

            this.pool.forEach((block: FileBlock) => {
                // 只 abort 指定的文件，每一个分片。
                if (block.file === file) {
                    block.transport && block.transport.abort();

                    if (interrupt) {
                        this.putback(block);
                        this.popBlock(block);
                    }
                }
            });

            this.triggerStopUpload(file);

            return nextTick(this.tick);
        }

        this.running = false;

        // 正在准备中的文件。
        if (this.promiseFile && this.promiseFile.file) {
            this.promiseFile.file.setStatus(FILE_STATUS.INTERRUPT);
        }

        if (interrupt) {
            this.pool.forEach((block: FileBlock) => {
                block.transport && block.transport.abort();
                block.file.setStatus(FILE_STATUS.INTERRUPT);
            });
        }

        this.triggerStopUpload();
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
    /**
     * @method cancelFile
     * @grammar cancelFile( file ) => undefined
     * @grammar cancelFile( id ) => undefined
     * @param {File|id} file File对象或这File对象的id
     * @description 标记文件状态为已取消, 同时将中断文件传输。
     * @for  Uploader
     * @example
     *
     * $li.on('click', '.remove-this', function() {
     *     uploader.cancelFile( file );
     * })
     */
    cancelFile(file: FileBase) {
        // 如果正在上传。
        this.cancelUpload(file);
        file.setStatus(FILE_STATUS.CANCELLED);
        this.emit.trigger('fileDequeued', file);
    }
    skipFile(file: FileBase, status: FILE_STATUS) {
        file.setStatus(status || FILE_STATUS.COMPLETE);
        file.skipped = true;

        // 如果正在上传。
        this.cancelUpload(file);
        this.emit.trigger('uploadSkip', file);
    }
    /**
     * 判断`Uploader`是否正在上传中。
     * @grammar isInProgress() => Boolean
     * @method isInProgress
     * @for  Uploader
     */
    isInProgress() {
        return !!this.progress;
    }

    /**
     * @event uploadFinished
     * @description 当所有文件上传结束时触发。
     * @for  Uploader
     */
    private async tick() {
        // 上一个promise还没有结束，则等待完成后再执行。
        if (this.promiseFile) {
            await this.promiseFile.promise;
            this.tick();
        }

        // 还有位置，且还有文件要处理的话。
        if (
            this.pool.length < this.options.threads &&
            (val = this.nextBlock())
        ) {
            me._trigged = false;

            fn = function (val) {
                me._promise = null;

                // 有可能是reject过来的，所以要检测val的类型。
                val && val.file && me._startSend(val);
                Base.nextTick(me.__tick);
            };

            me._promise = isPromise(val) ? val.always(fn) : fn(val);

            // 没有要上传的了，且没有正在传输的了。
        } else if (
            !me.remaning &&
            !me._getStats().numOfQueue &&
            !me._getStats().numOfInterrupt
        ) {
            me.runing = false;

            me._trigged ||
                Base.nextTick(function () {
                    me.owner.trigger('uploadFinished');
                });
            me._trigged = true;
        }
    }
    putback(block) {
        let idx;

        block.cuted.unshift(block);
        idx = this.stack.indexOf(block.cuted);

        if (!~idx) {
            // 如果不在里面，说明移除过，需要把计数还原回去。
            this.remaning++;
            block.file.remaning++;
            this.stack.unshift(block.cuted);
        }
    }
    getStack() {
        while ((act = this.stack[i++])) {
            if (act.has() && act.file.getStatus() === FILE_STATUS.PROGRESS) {
                return act;
            } else if (
                !act.has() ||
                (act.file.getStatus() !== FILE_STATUS.PROGRESS &&
                    act.file.getStatus() !== FILE_STATUS.INTERRUPT)
            ) {
                // 把已经处理完了的，或者，状态为非 progress（上传中）、
                // interupt（暂停中） 的移除。
                this.stack.splice(--i, 1);
            }
        }

        return null;
    }
    private nextBlock() {
        // 如果当前文件还有没有需要传输的，则直接返回剩下的。
        if ((act = this.getStack())) {
            // 是否提前准备下一个文件
            if (opts.prepareNextFile && !me.pending.length) {
                me._prepareNextFile();
            }

            return act.shift();

            // 否则，如果正在运行，则准备下一个文件，并等待完成后返回下个分片。
        } else if (me.runing) {
            // 如果缓存中有，则直接在缓存中取，没有则去queue中取。
            if (!me.pending.length && me._getStats().numOfQueue) {
                me._prepareNextFile();
            }

            next = me.pending.shift();
            done = function (file) {
                if (!file) {
                    return null;
                }

                act = CuteFile(file, opts.chunked ? opts.chunkSize : 0);
                me.stack.push(act);
                return act.shift();
            };

            // 文件可能还在prepare中，也有可能已经完全准备好了。
            if (isPromise(next)) {
                preparing = next.file;
                next = next[next.pipe ? 'pipe' : 'then'](done);
                next.file = preparing;
                return next;
            }

            return done(next);
        }
    }
}
