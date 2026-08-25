import request from './request'

export const login = (data: { username: string; password: string }) =>
  request.post('/auth/login', data)

export const getMe = () => request.get('/auth/me')
