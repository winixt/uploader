import type { FileBase } from './fileBase'
import type { FileBlock } from './fileBlock'

const FILE_STORE = new Map()

export const storeUploadFile = (file: FileBase, response: any) => {
  FILE_STORE.set(file.hash, response)
}

export const isUploaded = (file: FileBase) => {
  return FILE_STORE.has(file.hash)
}

export const getUploadedRes = (file: FileBase) => {
  return FILE_STORE.get(file.hash)
}

const FILE_BLOCK_STORE = new Map()
function getBlockKey(block: FileBlock) {
  return `${block.file.hash}_${block.chunkIndex}`
}
export const storeUploadBlock = (block: FileBlock, response: any) => {
  FILE_BLOCK_STORE.set(getBlockKey(block), response)
}

export const isUploadedBlock = (block: FileBlock) => {
  return FILE_BLOCK_STORE.has(getBlockKey(block))
}

export const clearStore = () => {
  FILE_STORE.clear()
  FILE_BLOCK_STORE.clear()
}
