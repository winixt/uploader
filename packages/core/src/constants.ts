export enum FILE_STATUS {
  QUEUED = 'queued', // 已经进入队列, 等待上传
  PROGRESS = 'progress', // 上传中
  ERROR = 'error', // 上传出错，可重试
  COMPLETE = 'complete', // 上传完成。

  INTERRUPT = 'interrupt', // 上传中断，可续传。
}
