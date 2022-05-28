# 文件分片上传

核心代码来自[webuploader](https://github.com/fex-team/webuploader)，这里新开一个仓库维护主要原因：

**原有仓库年久失修，代码组织方式还是好多年前的 AMD，不支持 esmodule 不支持按需引用，对 JQuery 等还有依赖**

## difference with webuploader

-   remove `noop` `log` `$` `Deferred` `isPromise` `when` `inherits` `bindFn` `nextTick` `slice`
