import { describe, expect, it } from 'vitest'
import {
  canAccessKnowledge,
  canReviewKnowledgeChunks,
  isKnowledgeAdminPath
} from './knowledge-access'
import { visibleNavGroups } from './nav'

describe('knowledge access RBAC', () => {
  it('allows ops and admin into knowledge, blocks expert', () => {
    expect(canAccessKnowledge('ops')).toBe(true)
    expect(canAccessKnowledge('admin')).toBe(true)
    expect(canAccessKnowledge('expert')).toBe(false)
    expect(canAccessKnowledge(null)).toBe(false)
  })

  it('allows ops and admin to review chunks, blocks expert', () => {
    expect(canReviewKnowledgeChunks('ops')).toBe(true)
    expect(canReviewKnowledgeChunks('admin')).toBe(true)
    expect(canReviewKnowledgeChunks('expert')).toBe(false)
    expect(canReviewKnowledgeChunks(undefined)).toBe(false)
  })

  it('detects knowledge admin paths including locale prefix', () => {
    expect(isKnowledgeAdminPath('/knowledge')).toBe(true)
    expect(isKnowledgeAdminPath('/knowledge/chunks')).toBe(true)
    expect(isKnowledgeAdminPath('/en/knowledge/datasets')).toBe(true)
    expect(isKnowledgeAdminPath('/orders')).toBe(false)
    expect(isKnowledgeAdminPath('/en/expert-case-reviews')).toBe(false)
  })

  it('hides knowledge nav for expert and shows it for ops/admin', () => {
    const expertNav = visibleNavGroups('consultant_ops', 'expert')
    const opsNav = visibleNavGroups('consultant_ops', 'ops')
    const adminNav = visibleNavGroups('consultant_admin', 'admin')

    const keys = (groups: ReturnType<typeof visibleNavGroups>) =>
      groups.flatMap(group => group.items.map(item => item.key))

    expect(keys(expertNav)).not.toContain('knowledge')
    expect(keys(opsNav)).toContain('knowledge')
    expect(keys(adminNav)).toContain('knowledge')
  })
})
