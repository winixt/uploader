import { merge } from 'lodash-es'
import { Mediator } from './mediator'
import type { UploaderOptions } from './types'
import { FileQueue } from './fileQueue'
import { FileBase } from './fileBase'
import { clearStore } from './fileStore'

type FileType = File | FileBase

export class Uploader {
  options: UploaderOptions
  emit: Mediator
  queue: FileQueue
  constructor(options: UploaderOptions) {
    this.options = options
    this.emit = new Mediator()
    this.queue = new FileQueue(this.options, this.emit)
  }

  wrapFile(file: FileType) {
    if (file instanceof FileBase)
      return file

    return new FileBase(file)
  }

  setOption(opts: Partial<UploaderOptions>) {
    merge(this.options, opts)
  }

  // 执行上传，并将文件添加到队列
  startUpload(files?: FileType): FileBase
  startUpload(files?: FileType[]): FileBase[]
  startUpload(files?: FileType | FileType[]) {
    let innerFiles = files
    if (!Array.isArray(innerFiles))
      innerFiles = innerFiles ? [innerFiles] : []

    const fileBases = innerFiles.map(this.wrapFile)
    this.queue.startUpload(fileBases)

    return Array.isArray(files) ? fileBases : fileBases[0]
  }

  stopUpload(files?: FileType | FileType[]) {
    if (!files) {
      this.queue.stopAllUpload()
    }
    else {
      let _files: FileType[] = []
      if (!Array.isArray(files))
        _files = [files]

      else
        _files = files

      _files.forEach((file: FileType) => {
        if (file instanceof FileBase) {
          this.queue.stopTargetFileUpload(file)
        }
        else {
          const fileBases = this.queue.findFile(file)
          fileBases.forEach(this.queue.stopTargetFileUpload.bind(this.queue))
        }
      })
    }
  }

  getFiles() {
    return this.queue.fileQueue
  }

  // 仅添加文件到队列中，不执行上传
  addFile(file: FileType) {
    file = this.wrapFile(file)
    this.queue.addFile(file)
  }

  // 移除文件的时候，记得调用，避免内存泄漏
  removeFile(file?: FileType) {
    if (!file) {
      this.queue.removeAllFile()
    }
    else {
      if (file instanceof FileBase) {
        this.queue.removeFile(file)
      }
      else {
        const fileBases = this.queue.findFile(file)
        fileBases.forEach(this.queue.removeFile.bind(this.queue))
      }
    }
  }

  destroy() {
    clearStore()
    this.emit.off()
  }

  onProgress(fn: (percentage: number, file: File) => void) {
    this.emit.on('progress', fn)
  }

  onSuccess(fn: (response: any, file: File) => void) {
    this.emit.on('success', fn)
  }

  onError(fn: (msg: string, file: File) => void) {
    this.emit.on('error', fn)
  }
}
