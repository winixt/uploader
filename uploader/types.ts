export interface AcceptType {
    title?: string;
    extensions: string;
    mimeTypes: string;
}

export interface UploaderOptions {
    auto: boolean;
    server?: string;
    pick?: string;
    accept?: AcceptType | AcceptType[];
    prepareNextFile: boolean;
    chunked: boolean;
    chunkSize: number;
    chunkRetry: number;
    threads: number;
    params?: Record<string, any>;
    fileVal: string;
    method: 'POST' | 'GET';
    sendAsBinary: boolean;
    fileNumLimit?: number;
    fileSizeLimit?: number;
    fileSingleSizeLimit?: number;
    duplicate?: number;
    headers?: Record<string, string>;
    withCredentials: boolean;
    timeout: number;
    filename?: string;
    attachInfoToQuery?: boolean;
}
