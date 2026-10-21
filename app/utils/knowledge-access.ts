import type { OperatorRole } from '~/types/operator'

/** 知識管理入口與 /knowledge/** 路由：僅 ops／admin（Irice 10/21）。 */
export function canAccessKnowledge(role: OperatorRole | null | undefined): boolean {
  return role === 'ops' || role === 'admin'
}

/** 片段核可／退回：僅 ops／admin（與 candor-core 權限 PR 對齊）。 */
export function canReviewKnowledgeChunks(role: OperatorRole | null | undefined): boolean {
  return role === 'ops' || role === 'admin'
}

export function isKnowledgeAdminPath(path: string): boolean {
  const stripped = path.replace(/^\/en(?=\/|$)/, '') || '/'
  return stripped === '/knowledge' || stripped.startsWith('/knowledge/')
}
