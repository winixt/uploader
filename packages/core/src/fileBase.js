import { Mediator } from './mediator';
import { FILE_STATUS } from './constants';

const idPrefix = 'WU_FILE_';
let idSuffix = 0;
function gid() {
    return idPrefix + idSuffix++;
}

const statusMap = {};

export default class FileBase extends Mediator {
    constructor(source) {
        super();
        this.name = source.name || 'Untitled';
        this.size = source.size || 0;
        this.type = source.type || 'application/octet-stream';
        this.lastModifiedDate = source.lastModifiedDate || Date.now();
        this.id = gid();
        this.ext = this.getExt();
        this.statusText = '';
        this.source = source;
        this.loaded = 0;

        statusMap[this.id] = FILE_STATUS.INITED;

        this.on('error', (msg) => {
            this.setStatus(FILE_STATUS.ERROR, msg);
        });
    }
    getExt() {
        const result = /\.([^.]+)$/.exec(this.name);
        return result ? result[1] : '';
    }
    setStatus(status, text) {
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
