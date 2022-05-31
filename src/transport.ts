import { noop } from 'lodash-es';
import { RequestOptions } from './types';
import { Mediator } from './mediator';

/**
 * 对外暴露的事件：progress succeess error
 */

export class Transport extends Mediator {
    private status = 0;
    private response: string;
    private xhr: XMLHttpRequest;
    private options: RequestOptions;
    private params: Record<string, any>;
    constructor(options: RequestOptions) {
        super();
        this.options = { ...options };
        this.params = { ...this.options.params };
    }
    send() {
        const xhr = this.initAjax();
        const server = this.options.url;
        xhr.withCredentials = this.options.withCredentials;

        xhr.open('POST', server, true);

        this.setRequestHeader(xhr, this.options.headers);

        const formData = new FormData();
        for (const [key, value] of Object.entries(this.options.params)) {
            formData.append(key, value);
        }

        xhr.send(formData);
    }
    appendParam(key: string | Record<string, any>, value?: any) {
        if (typeof key === 'string') {
            this.params[key] = value;
        } else {
            Object.assign(this.params, key);
        }
    }
    getResponse() {
        return this.response;
    }
    getResponseAsJson() {
        return this.parseJson(this.response);
    }

    getStatus() {
        return this.status;
    }

    abort() {
        const xhr = this.xhr;

        if (xhr) {
            xhr.upload.onprogress = noop;
            xhr.onreadystatechange = noop;
            xhr.abort();

            this.xhr = null;
        }
    }

    destroy() {
        this.abort();
    }
    private initAjax() {
        const xhr = new XMLHttpRequest();

        xhr.timeout = this.options.timeout;
        xhr.upload.onprogress = (e) => {
            let percentage = 0;

            if (e.lengthComputable) {
                percentage = e.loaded / e.total;
            }

            return this.trigger('progress', percentage);
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
                this.trigger('progress', 1);
                return this.trigger('success');
            } else if (xhr.status >= 500 && xhr.status < 600) {
                this.response = xhr.responseText;
                this.trigger('progress', 1);
                return this.trigger('error', 'server' + status);
            }

            return this.trigger(
                'error',
                this.status ? 'http' + status : 'abort',
            );
        };

        xhr.ontimeout = () => {
            return this.trigger('error', 'timeout');
        };

        this.xhr = xhr;
        return xhr;
    }
    private setRequestHeader(
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