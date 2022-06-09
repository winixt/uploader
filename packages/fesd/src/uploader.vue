<template>
    <FUpload
        :accept="accept"
        :action="action"
        :headers="headers"
        :data="data"
        :withCredentials="withCredentials"
        :beforeUpload="beforeUpload"
        :beforeRemove="beforeRemove"
        :disabled="disabled"
        :fileList="fileList"
        :multiple="multiple"
        :multipleLimit="multipleLimit"
        :showFileList="showFileList"
        :httpRequest="customerRequest"
        @remove="removeFile"
    >
        <template #default>
            <slot></slot>
        </template>
        <template #tip>
            <slot name="tip"></slot>
        </template>
        <template #file>
            <slot name="file"></slot>
        </template>
        <template #fileList>
            <slot name="fileList"></slot>
        </template>
    </FUpload>
</template>

<script lang="ts">
import { defineComponent, watch, onBeforeUnmount, PropType } from 'vue';
import { FUpload } from '@fesjs/fes-design';
import { createUploader } from '../../core/src/index';

interface FileListItem {
    uid?: number | string;
    status?: string;
    name: string;
    url: string;
}

export default defineComponent({
    name: 'Uploader',
    components: {
        FUpload,
    },
    props: {
        accept: {
            type: Array as PropType<string[]>,
            default: (): string[] => [],
        },
        action: {
            type: String,
            required: true,
        },
        headers: {
            type: Object,
            default: () => ({}),
        },
        data: {
            type: Object,
            default: () => ({}),
        },
        withCredentials: {
            type: Boolean,
            default: true,
        },
        beforeUpload: Function,
        beforeRemove: Function,
        disabled: {
            type: Boolean,
            default: false,
        },
        fileList: {
            type: Array as PropType<FileListItem[]>,
            default: (): FileListItem[] => [],
        },
        multiple: {
            type: Boolean,
            default: false,
        },
        multipleLimit: Number,
        showFileList: {
            type: Boolean,
            default: true,
        },
        chunked: {
            type: Boolean,
            default: true,
        },
        chunkSize: {
            type: Number,
            default: 5242880,
        },
        retry: {
            type: Number,
            default: 2,
        },
        threads: {
            type: Number,
            default: 3,
        },
        timeout: {
            type: Number,
            default: 120000,
        },
    },
    setup(props) {
        const uploader = createUploader({
            chunked: props.chunked,
            chunkSize: props.chunkSize,
            retry: props.retry,
            threads: props.threads,
            request: {
                api: props.action,
                timeout: props.timeout,
                params: props.data,
                headers: props.headers,
                withCredentials: props.withCredentials,
            },
        });

        watch(
            () => props.data,
            () => {
                uploader.setOption({
                    request: {
                        params: props.data,
                    },
                });
            },
        );

        const customerRequest = ({
            file,
            onProgress,
            onSuccess,
            onError,
        }: {
            file: File;
            onProgress: (...args: any[]) => void;
            onSuccess: (...args: any[]) => void;
            onError: (...args: any[]) => void;
        }) => {
            uploader.startUpload(file);
            uploader.onProgress((percentage: number) => {
                onProgress({
                    percent: percentage * 100,
                });
            });
            uploader.onSuccess((res: any) => {
                onSuccess(res);
            });
            uploader.onError((error: string) => {
                onError(error);
            });
        };

        const removeFile = ({ file }: { file: File }) => {
            uploader.removeFile(file);
        };

        onBeforeUnmount(() => {
            uploader.removeFile();
        });

        return {
            customerRequest,
            removeFile,
        };
    },
});
</script>
