export interface RequestOptions {
    api?: string;
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
    compressed: boolean;
    request: RequestOptions;
}
