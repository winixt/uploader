# 文件分片上传

大文件上传的主要问题：**在同一个请求中，要上传大量的数据，导致整个过程会比较漫长，且失败后需要重头开始上传**。

大文件下载，使用文件流即可。在特殊场景下（比如玩 webGPU、大文件管理应用等）也可使用分片下载的方式，将分片临时存储于 indexDB。

## 前端

可以查看 demo

## 对接后台

提供一个接受文件块的接口，demo 中有 `node.js` 的案例

### 接受的参数(FormData)

| 名称       | 说明       | 类型   |
| ---------- | ---------- | ------ |
| chunk      | 文件分片   | blob   |
| totalChunk | 总分片数   | number |
| chunkIndex | chunk 下标 | String |
| filename   | 文件名称   | String |
| hash       | 文件 hash  | String |
| size       | 文件 size  | String |
| chunkSize  | chunk 大小 | String |

### 响应内容的要求

每接受一个 chunk，检测到接受的 chunk 数（后端自行记录已接受的 chunk) 是否等于 totalChunk，若相等，在当前响应内容加一个 merge 字段，表示文件已合并，前端通过这个字段判断整个是否上传成功。例如

```json
{
    "code": 0,
    "merge": {
        "fileHash": "128ad650343805024e59c8b28c748d4c",
        "fileId": "file_xxx"
    }
}
```
