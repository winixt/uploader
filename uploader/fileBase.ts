import { FILE_STATUS } from './constants';
import { FileBlock } from './fileBlock';

const idPrefix = 'WU_FILE_';
let idSuffix = 0;
function gid() {
    return idPrefix + idSuffix++;
}

export default class FileBase {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    id: string;
    ext: string;
    statusText: string;
    source: File;
    blocks: FileBlock[] = [];
    remaining = 0;
    skipped: boolean;
    status: FILE_STATUS;
    constructor(source: File) {
        this.name = source.name || 'Untitled';
        this.size = source.size || 0;
        this.type = source.type || 'application/octet-stream';
        this.lastModified = source.lastModified || Date.now();
        this.id = gid();
        this.ext = this.getExt();
        this.statusText = '';
        this.source = source;

        this.status = FILE_STATUS.INITED;
    }
    getExt() {
        const result = /\.([^.]+)$/.exec(this.name);
        return result ? result[1] : '';
    }
    setStatusText(text: string) {
        this.statusText = text;
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
}