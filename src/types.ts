export interface AcceptType {
    title?: string;
    extensions: string;
    mimeTypes: string;
}

export interface UploaderOptions {
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
}
