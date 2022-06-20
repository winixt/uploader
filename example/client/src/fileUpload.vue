<template>
    <Uploader
        action="http://127.0.0.1:3000/upload"
        :withCredentials="false"
        :chunkSize="20 * 1024"
        :multiple="multiple"
        :multipleLimit="multipleLimit"
        :accept="accept"
        :beforeUpload="beforeUpload"
        @remove="remove"
        @success="success"
        @error="error"
        @exceed="fileNumExceed"
    >
        <FButton>上传文件</FButton>
        <template #tip>
            <div class="f-upload__tip">
                {{ exceedTip || '大小不超过10M' }}
            </div>
        </template>
    </Uploader>
</template>

<script lang="ts">
import { ref, defineComponent, PropType } from 'vue';
import { FButton, FMessage } from '@fesjs/fes-design';
import Uploader from '../../../packages/fesd/src/uploader.vue';

export default defineComponent({
    components: {
        FButton,
        Uploader,
    },
    props: {
        multiple: Boolean,
        multipleLimit: Number,
        accept: {
            type: Array as PropType<string[]>,
            default: () => [],
        },
        maxSize: Number,
        exceedTip: String,
        maxFileNameLength: {
            type: Number,
            default: 50,
        },
    },
    emits: ['update:fileList'],
    setup(props) {
        let fileList:File[] = []
        const updateFileList = (fileList: File[]) => {
            fileList = fileList;
        };
        const remove = ({ fileList }: {fileList: File[]}) => {
            updateFileList(fileList);
        };
        const error = () => {
            FMessage.error('上传失败，请重试');
        };
        const success = ({ file, fileList }: {file: File, fileList: File[]}) => {
            console.log('success', { file, fileList });
            updateFileList(fileList);
        };
        const beforeUpload = async (file: File) => {
            if (props.maxSize && file.size > props.maxSize) {
                FMessage.error(
                    props.exceedTip
                        ? props.exceedTip
                        : `上传文件超过 ${props.maxSize}B，请重新选择`,
                );
                return false;
            }
            if (
                props.maxFileNameLength &&
                file.name.length > props.maxFileNameLength
            ) {
                FMessage.error(
                    `文件名长度不能超过${props.maxFileNameLength}字符`,
                );
                return false;
            }
            if (
                props.multipleLimit &&
                fileList.length > props.multipleLimit
            ) {
                FMessage.error(`文件数量不能超过${props.multipleLimit}个`);
                return false;
            }
            return true;
        };

        const fileNumExceed = () => {
            FMessage.error(`文件数量不能超过${props.multipleLimit}个`);
        };

        return {
            fileList,
            remove,
            error,
            beforeUpload,
            success,
            fileNumExceed,
        };
    },
});
</script>
<style>
.f-upload__tip {
    font-size: 12px;
    margin-top: 7px;
    color: #93949b;
}
</style>
