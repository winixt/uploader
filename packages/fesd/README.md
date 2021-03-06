## Uploader Props

| 属性                           | 说明                                                                                                  | 类型                     | 默认值  |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------ | ------- |
| accept                         | 接受上传的文件类型                                                                                    | array                    | []      |
| action                         | 上传的地址                                                                                            | string                   | -       |
| beforeUpload                   | 上传文件之前的钩子，参数为上传的文件，若返回 false 或者返回 Promise 且被 reject，则停止上传           | function(file)           | -       |
| beforeRemove                   | 删除文件之前的钩子，参数为上传的文件和文件列表，若返回 false 或者返回 Promise 且被 reject，则停止删除 | function(file, fileList) | -       |
| disabled                       | 是否禁用                                                                                              | boolean                  | `false` |
| data                           | 上传接口附带的数据                                                                                    | object                   | `{}`    |
| fileList                       | 上传的文件列表, 例如: [{name: 'food.jpg', url: 'https://xxx.cdn.com/xxx.jpg'}]。                      | array                    | `[]`    |
| headers                        | 上传接口中请求附带的请求头                                                                            | object                   | `{}`    |
| listType（第一期只支持`text`） | 文件列表的类型，可选值有`text` / `picture-card`                                                       | string                   | `text`  |
| multiple                       | 是否支持多选文件                                                                                      | boolean                  | `false` |
| multipleLimit                  | 最大允许上传个数                                                                                      | number                   | -       |
| name                           | 上传的文件字段名                                                                                      | string                   | `file`  |
| showFileList                   | 是否显示已上传文件列表                                                                                | boolean                  | `true`  |
| withCredentials                | 支持发送 cookie 凭证信息                                                                              | boolean                  | `false` |

## Uploader Events

| 事件名称 | 说明                                                           | 回调参数                             |
| -------- | -------------------------------------------------------------- | ------------------------------------ |
| change   | 文件状态改变时的钩子，添加文件、上传成功和上传失败时都会被调用 | function({file, fileList})           |
| remove   | 文件列表移除文件时的钩子                                       | function({file, fileList})           |
| success  | 文件上传成功时的钩子                                           | function({response, file, fileList}) |
| error    | 文件上传失败时的钩子                                           | function({error, file, fileList})    |
| exceed   | 文件上传超出限制时的钩子                                       | function({files, fileList})          |
| progress | 文件上传进度的钩子                                             | function({event, file, fileList})    |

## Uploader Slots

| 名称     | 说明                                         |
| -------- | -------------------------------------------- |
| default  | 触发文件选择框的内容, 参数为 { uploadFiles } |
| tip      | 提示说明文字                                 |
| fileList | 自定义文件的展示, 参数为 { uploadFiles }     |
| file     | 自定义上传后的文件展示, 参数为 { file }      |
