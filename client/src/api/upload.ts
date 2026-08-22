import request from './request'

// 上传图片到阿里云 OSS（后端中转，返回可公开访问的 URL）
export const uploadImage = (file: File): Promise<{ url: string; key: string }> => {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload', formData) as unknown as Promise<{ url: string; key: string }>
}
