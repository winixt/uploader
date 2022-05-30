import { noop } from 'lodash-es';
import { Mediator } from './mediator';
import { UploaderOptions } from './types';
import { os } from './utils';

export class Transport {
    private status = 0;
    private response: string;
    private xhr: XMLHttpRequest;
    private headers: Record<string, string>;
    private emit: Mediator;
    private options: UploaderOptions;
    private file: File;
    private params: Record<string, string>;
    private timer: number;
    constructor(options: UploaderOptions, emit: Mediator) {
        this.options = { ...options };
        this.emit = emit;
    }

    send() {
        const xhr = this.initAjax();
        let server = this.options.server;

        if (this.options.withCredentials && 'withCredentials' in xhr) {
            xhr.open(this.options.method, server, true);
            xhr.withCredentials = true;
        } else {
            xhr.open(this.options.method, server);
        }

        this._setRequestHeader(xhr, this.options.headers);

        if (this.options.sendAsBinary) {
            server +=
                this.options.attachInfoToQuery !== false
                    ? (/\?/.test(server) ? '&' : '?') +
                      new URLSearchParams(this.params).toString()
                    : '';

            const binary = this.file;
            // 强制设置成 content-type 为文件流。
            xhr.overrideMimeType &&
                xhr.overrideMimeType('application/octet-stream');

            // android直接发送blob会导致服务端接收到的是空文件。
            // bug详情。
            // https://code.google.com/p/android/issues/detail?id=39882
            // 所以先用fileReader读取出来再通过arraybuffer的方式发送。
            if (os.android) {
                let fr = new FileReader();

                fr.onload = function () {
                    xhr.send(this.result);
                    fr = fr.onload = null;
                };

                fr.readAsArrayBuffer(binary);
            } else {
                xhr.send(binary);
            }
        } else {
            const formData = new FormData();
            for (const [key, value] of Object.entries(this.params)) {
                formData.append(key, value);
            }

            formData.append(
                this.options.fileVal,
                this.file,
                this.options.filename,
            );
            xhr.send(formData);
        }
        this.timeout();
    }
    getResponse() {
        return this.response;
    }
    getResponseAsJson() {
        return this.parseJson(this.response);
    }

    getResponseHeaders() {
        return this.headers;
    }

    getStatus() {
        return this.status;
    }

    appendFile(key: string, file: File, filename: string) {
        this.file = file;
        this.options.fileVal = key || this.options.fileVal;
        this.options.filename = filename || this.options.filename;
    }

    appendParams(key: string | Record<string, string>, value?: string) {
        if (typeof key === 'object') {
            Object.assign(this.params, key);
        } else {
            this.params[key] = value;
        }
    }

    abort() {
        clearTimeout(this.timer);
        const xhr = this.xhr;

        if (xhr) {
            xhr.upload.onprogress = noop;
            xhr.onreadystatechange = noop;
            xhr.abort();

            this.xhr = null;
        }
    }

    setRequestHeader(key: string | Record<string, string>, value?: string) {
        if (typeof key === 'object') {
            Object.assign(this.headers, key);
        } else {
            this.headers[key] = value;
        }
    }

    destroy() {
        this.abort();
    }

    private timeout() {
        const duration = this.options.timeout;

        if (!duration) {
            return;
        }

        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.abort();
            this.emit.trigger('error', 'timeout');
        }, duration);
    }
    private sended() {
        this.emit.trigger('progress', 1);
        clearTimeout(this.timer);
    }
    private initAjax() {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (e) => {
            let percentage = 0;

            if (e.lengthComputable) {
                percentage = e.loaded / e.total;
            }

            this.timeout();
            return this.emit.trigger('progress', percentage);
        };

        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) {
                return;
            }

            xhr.upload.onprogress = noop;
            xhr.onreadystatechange = noop;
            this.xhr = null;
            this.status = xhr.status;

            const separator = '|'; // 分隔符
            // 拼接的状态，在 widgets/upload.js 会有代码用到这个分隔符
            const status = separator + xhr.status + separator + xhr.statusText;

            if (xhr.status >= 200 && xhr.status < 300) {
                this.response = xhr.responseText;
                this.headers = this.parseHeader(xhr.getAllResponseHeaders());
                this.sended();
                return this.emit.trigger('load');
            } else if (xhr.status >= 500 && xhr.status < 600) {
                this.response = xhr.responseText;
                this.headers = this.parseHeader(xhr.getAllResponseHeaders());
                this.sended();
                return this.emit.trigger('error', 'server' + status);
            }

            return this.emit.trigger(
                'error',
                this.status ? 'http' + status : 'abort',
            );
        };

        this.xhr = xhr;
        return xhr;
    }

    private parseHeader(raw: string) {
        const ret: Record<string, string> = {};

        raw &&
            raw.replace(
                /^([^\:]+):(.*)$/gm,
                (_: string, key: string, value: string) => {
                    return (ret[key.trim()] = value.trim());
                },
            );

        return ret;
    }
    private _setRequestHeader(
        xhr: XMLHttpRequest,
        headers: Record<string, string>,
    ) {
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
    }

    private parseJson(str: string) {
        let json;

        try {
            json = JSON.parse(str);
        } catch (ex) {
            json = {};
        }

        return json;
    }
}
