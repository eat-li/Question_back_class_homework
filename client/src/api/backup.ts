import request from './request'

// 整包恢复：上传备份 ZIP，后端按依赖顺序恢复全部数据
export const restoreBackup = (file: File): Promise<Record<string, number>> => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/backup/restore', formData) as unknown as Promise<Record<string, number>>
}
