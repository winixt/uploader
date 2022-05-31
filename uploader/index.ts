import {} from './queue';

import { AcceptType } from './types';

interface UploaderOptions {
    auto: boolean;
    pick?: string;
    accept?: AcceptType | AcceptType[];
    prepareNextFile: boolean;
    chunked: boolean;
    chunkSize: number;
    chunkRetry: number;
    threads: number;
    formData?: FormData;
    fileVal: string;
    method: 'POST' | 'GET';
    sendAsBinary: boolean;
    fileNumLimit?: number;
    fileSizeLimit?: number;
    fileSingleSizeLimit?: number;
    duplicate?: number;
    withCredentials?: boolean;
    filename?: string;
}

export interface Stats {
    successNum: number;
    progressNum: number;
    cancelNum: number;
    invalidNum: number;
    uploadFailNum: number;
    queueNum: number;
    interruptNum: number;
}

export interface Uploader {
    options: UploaderOptions;
    getStats: () => Stats;
}

export function createUploader(options: Partial<UploaderOptions>) {
    const defaultOptions: UploaderOptions = {
        auto: false,
        prepareNextFile: false,
        chunked: false,
        chunkSize: 5242880, // 5M
        chunkRetry: 2,
        threads: 3,
        fileVal: 'file',
        method: 'POST',
        sendAsBinary: false,
    };

    const uploader: Uploader = {
        options: {
            ...defaultOptions,
            ...options,
        },
        getStats() {},
    };
}
