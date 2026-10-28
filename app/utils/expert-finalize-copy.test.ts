import { afterEach, describe, expect, it } from 'vitest'
import {
  EXPERT_FINALIZE_COPY_MOCK,
  isFinalizeCopyDirty,
  mockGenerateExpertFinalizeCopy,
  readFinalizeCopyFromDetail,
  resetExpertFinalizeCopyMockCache
} from './expert-finalize-copy'

describe('expert-finalize-copy', () => {
  afterEach(() => {
    resetExpertFinalizeCopyMockCache()
  })

  it('mock generate returns plain-language bodies without ## titles', () => {
    const draft = mockGenerateExpertFinalizeCopy('case-1')
    expect(draft.cache_hit).toBe(false)
    expect(draft.report_highlights).toBe(EXPERT_FINALIZE_COPY_MOCK.report_highlights)
    expect(draft.expert_opinion).toContain('可能原因')
    expect(draft.report_highlights.startsWith('##')).toBe(false)
    expect(draft.expert_opinion.startsWith('##')).toBe(false)
    expect(draft.report_highlights).not.toMatch(/Magnesium|維生素 D3 2000/i)
  })

  it('second generate without force is cache_hit', () => {
    mockGenerateExpertFinalizeCopy('case-2')
    const again = mockGenerateExpertFinalizeCopy('case-2', false)
    expect(again.cache_hit).toBe(true)
    expect(again.content_hash).toContain('case-2')
  })

  it('force regenerate clears cache_hit', () => {
    mockGenerateExpertFinalizeCopy('case-3')
    const forced = mockGenerateExpertFinalizeCopy('case-3', true)
    expect(forced.cache_hit).toBe(false)
  })

  it('readFinalizeCopyFromDetail reads optional fields', () => {
    expect(readFinalizeCopyFromDetail(null)).toBeNull()
    expect(readFinalizeCopyFromDetail({})).toBeNull()
    expect(readFinalizeCopyFromDetail({
      report_highlights: 'A',
      expert_opinion: 'B'
    })).toEqual({ report_highlights: 'A', expert_opinion: 'B' })
  })

  it('isFinalizeCopyDirty compares both sections', () => {
    expect(isFinalizeCopyDirty('a', 'b', 'a', 'b')).toBe(false)
    expect(isFinalizeCopyDirty('a!', 'b', 'a', 'b')).toBe(true)
    expect(isFinalizeCopyDirty('a', 'b!', 'a', 'b')).toBe(true)
  })
})
