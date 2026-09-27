import request from './request'

// 恢复时被跳过的孤儿关联记录（引用的父数据在库里不存在）
export interface RestoreSkippedRow {
  id: number
  field: string
  value: number
  parent: string
}

export interface RestoreResult {
  counts: Record<string, number>
  skipped: Record<string, RestoreSkippedRow[]>
  skippedTotal: number
}

// 整包恢复：上传备份 ZIP，后端按依赖顺序恢复全部数据
export const restoreBackup = (file: File): Promise<RestoreResult> => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/backup/restore', formData) as unknown as Promise<RestoreResult>
}
