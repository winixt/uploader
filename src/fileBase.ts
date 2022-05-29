import { Mediator } from './mediator';
import { FILE_STATUS } from './constants';
import { FileBlocks } from './fileBlock';

const idPrefix = 'WU_FILE_';
let idSuffix = 0;
function gid() {
    return idPrefix + idSuffix++;
}

const statusMap: Record<string, FILE_STATUS> = {};

export default class FileBase extends Mediator {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    id: string;
    ext: string;
    statusText: string;
    source: File;
    fileBlocks: FileBlocks;
    skipped: boolean;
    constructor(source: File) {
        super();
        this.name = source.name || 'Untitled';
        this.size = source.size || 0;
        this.type = source.type || 'application/octet-stream';
        this.lastModified = source.lastModified || Date.now();
        this.id = gid();
        this.ext = this.getExt();
        this.statusText = '';
        this.source = source;

        statusMap[this.id] = FILE_STATUS.INITED;

        this.on('error', (msg) => {
            this.setStatus(FILE_STATUS.ERROR, msg);
        });
    }
    getExt() {
        const result = /\.([^.]+)$/.exec(this.name);
        return result ? result[1] : '';
    }
    setStatus(status: FILE_STATUS, text?: string) {
        const prevStatus = statusMap[this.id];

        typeof text !== 'undefined' && (this.statusText = text);

        if (status !== prevStatus) {
            statusMap[this.id] = status;
            this.trigger('statuschange', status, prevStatus);
        }
    }
    getStatus() {
        return statusMap[this.id];
    }
    destroy() {
        this.off();
        delete statusMap[this.id];
    }
}
