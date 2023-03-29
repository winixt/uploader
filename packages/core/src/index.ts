import type { RequestOptions, UploaderOptions } from './types'
import { Uploader } from './uploader'

export { FileBase } from './fileBase'

export function createUploader(options: Partial<UploaderOptions>) {
  const { request, ...otherOptions } = options

  const requestOptions: RequestOptions = {
    api: '',
    withCredentials: false,
    timeout: 2 * 60 * 1000, // 2min
    ...request,
  }

  /**
     * 文件队列
     * chunk 队列
     */

  return new Uploader({
    chunked: true,
    chunkSize: 5242880, // 5M
    retry: 2,
    threads: 3,
    compressed: true, // 对 block 进行 zlib 压缩
    ...otherOptions,
    request: requestOptions,
  })
}
