import { UploaderOptions, RequestOptions } from './types';

export function createUploader(options: Partial<UploaderOptions>) {
    const { request, otherOptions } = options;

    const requestOptions: RequestOptions = {
        fileField: 'file',
        withCredentials: true,
        timeout: 2 * 60 * 1000, // 2min
        ...request,
    };

    /**
     * 文件队列
     * chunk 队列
     */
    return {
        startUpload(files: File | File[]) {},
        stopUpload(files?: File | File[]) {},
        // 监听上传进度
        onProgress() {},
        // 上传成功
        onSuccess(file: File) {},
        // 上传失败
        onError(file: File) {},
    };
}
