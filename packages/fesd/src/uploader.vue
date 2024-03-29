<template>
  <FUpload
    :accept="accept"
    :action="action"
    :headers="headers"
    :data="data"
    :with-credentials="withCredentials"
    :before-upload="beforeUpload"
    :before-remove="beforeRemove"
    :disabled="disabled"
    :file-list="fileList"
    :multiple="multiple"
    :multiple-limit="multipleLimit"
    :show-file-list="showFileList"
    :http-request="customerRequest"
    @change="onChange"
    @remove="onRemove"
    @success="onSuccess"
    @error="onError"
    @exceed="onExceed"
    @progress="onProgress"
  >
    <template v-if="$slots.default" #default>
      <slot />
    </template>
    <template v-if="$slots.tip" #tip>
      <slot name="tip" />
    </template>
    <template v-if="$slots.file" #file>
      <slot name="file" />
    </template>
    <template v-if="$slots.fileList" #fileList>
      <slot name="fileList" />
    </template>
  </FUpload>
</template>

<script lang="ts">
import type { PropType } from 'vue'
import { defineComponent, onBeforeUnmount, watch } from 'vue'
import { FUpload } from '@fesjs/fes-design'
import { createUploader } from '../../core/src/index'

interface FileListItem {
  uid?: number | string
  status?: string
  name: string
  url: string
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
  emits: ['change', 'remove', 'success', 'error', 'exceed', 'progress'],
  setup(props, { emit }) {
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
    })

    watch(
      () => props.data,
      () => {
        uploader.setOption({
          request: {
            params: props.data,
          },
        })
      },
    )

    const customerRequest = ({
      file,
      onProgress,
      onSuccess,
      onError,
    }: {
      file: File
      onProgress: (...args: any[]) => void
      onSuccess: (...args: any[]) => void
      onError: (...args: any[]) => void
    }) => {
      const fileBase = uploader.startUpload(file)
      fileBase.onProgress((percentage: number) => {
        onProgress({
          percent: percentage * 100,
        })
      })
      fileBase.onSuccess((res: any) => {
        console.log('uploader success', res)
        onSuccess(res)
      })
      fileBase.onError((error: string) => {
        onError(error)
      })

      return {
        abort: () => {
          uploader.stopUpload(file)
        },
      }
    }

    const removeFile = (file: File) => {
      uploader.removeFile(file)
    }

    onBeforeUnmount(() => {
      uploader.removeFile()
    })

    const onChange = (params: { file: File }) => {
      emit('change', params)
    }
    const onRemove = (params: { file: {
      raw: File
    } }) => {
      removeFile(params.file.raw)
      emit('remove', params)
    }
    const onSuccess = (params: { file: File }) => {
      emit('success', params)
    }
    const onError = (params: { file: File }) => {
      emit('error', params)
    }
    const onExceed = (params: { file: File }) => {
      emit('exceed', params)
    }
    const onProgress = (params: { file: File }) => {
      emit('progress', params)
    }

    return {
      customerRequest,
      onChange,
      onRemove,
      onSuccess,
      onError,
      onExceed,
      onProgress,
    }
  },
})
</script>
