import { UploaderOptions, RequestOptions } from './types';
import { Uploader } from './uploader';

export function createUploader(options: Partial<UploaderOptions>) {
    const { request, ...otherOptions } = options;

    const requestOptions: RequestOptions = {
        api: '',
        withCredentials: false,
        timeout: 2 * 60 * 1000, // 2min
        ...request,
    };

    /**
     * 文件队列
     * chunk 队列
     */

    return new Uploader({
        chunked: true,
        chunkSize: 5242880, // 5M
        retry: 2,
        threads: 3,
        ...otherOptions,
        request: requestOptions,
    });
}
