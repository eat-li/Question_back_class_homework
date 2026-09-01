// 题库接口（只读开放接口 /api/open/questions）
// 写操作全部留在 Web 管理后台，小程序不提供任何新增 / 修改 / 删除入口。
import request from '@/utils/request'

const BASE = '/open/questions'

export default {
  // 分页筛选：keyword / type / difficulty / knowledgeTag / knowledgeSubTag / page / pageSize
  list(params) {
    return request.get(BASE, params)
  },
  detail(id) {
    return request.get(BASE + '/' + id)
  },
  // 知识点聚合：每个知识点的题量与题型分布，带二级知识点
  stats(params) {
    return request.get(BASE + '/stats', params)
  },
  tags() {
    return request.get(BASE + '/tags')
  },
  subTags(knowledgeTag) {
    return request.get(BASE + '/subtags', { knowledgeTag })
  }
}
