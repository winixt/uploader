export interface RequestOptions {
    api: string;
    fileField: string;
    params?: Record<string, any>;
    headers?: Record<string, string>;
    withCredentials?: boolean;
    timeout?: number;
}

export interface UploaderOptions {
    chunked: boolean;
    chunkSize: number;
    retry: number;
    threads: number;
    fileNumLimit?: number;
    fileSizeLimit?: number;
    request: RequestOptions;
}
