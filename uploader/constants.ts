export enum FILE_STATUS {
    INITED = 'inited', // 初始状态
    QUEUED = 'queued', // 已经进入队列, 等待上传
    PROGRESS = 'progress', // 上传中
    ERROR = 'error', // 上传出错，可重试
    COMPLETE = 'complete', // 上传完成。
    CANCELLED = 'cancelled', // 上传取消。
    INTERRUPT = 'interrupt', // 上传中断，可续传。
    INVALID = 'invalid', // 文件不合格，不能重试上传。
}
