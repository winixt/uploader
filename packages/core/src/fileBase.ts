import { FILE_STATUS } from './constants';
import { FileBlock } from './fileBlock';
import SparkMD5 from 'spark-md5';

function genFileHash(file: FileBase): Promise<string> {
    const blocks = file.blocks;
    return new Promise((resolve) => {
        const spark = new SparkMD5.ArrayBuffer();
        const fileReader = new FileReader();
        let currentChunk = 0;
        fileReader.onload = function (e) {
            spark.append(e.target?.result as ArrayBuffer); // Append array buffer
            currentChunk++;

            if (currentChunk < blocks.length) {
                loadNext();
            } else {
                resolve(spark.end());
            }
        };

        fileReader.onerror = function () {
            console.warn('oops, something went wrong.');
        };

        function loadNext() {
            const { start, end } = blocks[currentChunk];

            fileReader.readAsArrayBuffer(file.source.slice(start, end));
        }

        loadNext();
    });
}

export class FileBase {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    hash: string;
    ext: string;
    statusText: string;
    source: File;
    blocks: FileBlock[];
    status: FILE_STATUS;
    constructor(source: File) {
        this.name = source.name || 'Untitled';
        this.size = source.size || 0;
        this.type = source.type || 'application/octet-stream';
        this.lastModified = source.lastModified || Date.now();
        this.ext = this.getExt();
        this.statusText = '';
        this.source = source;

        this.status = FILE_STATUS.QUEUED;
    }
    getExt() {
        const result = /\.([^.]+)$/.exec(this.name);
        return result ? result[1] : '';
    }
    setStatusText(text: string) {
        this.statusText = text;
    }
    async genFileHash() {
        this.hash = await genFileHash(this);
    }
    setStatus(status: FILE_STATUS) {
        const prevStatus = this.status;

        if (status !== prevStatus) {
            this.status = status;
        }
    }
    getStatus() {
        return this.status;
    }
    getProgress() {
        if (this.status === FILE_STATUS.COMPLETE) {
            return 1;
        }
        return this.blocks.reduce((acc, cur) => {
            return (acc += cur.progress / cur.totalChunk);
        }, 0);
    }
}
