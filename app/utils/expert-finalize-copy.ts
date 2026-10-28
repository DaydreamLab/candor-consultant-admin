/**
 * Finalize-copy (定稿對話文案) helpers for expert-case-review detail.
 * Aligns with candor-core POST …/finalize-copy/generate（PR #103）.
 */

export type ExpertFinalizeCopyDraft = {
  report_highlights: string
  expert_opinion: string
  content_hash: string
  cache_hit: boolean
}

/** Plain-language fixture (no product-name concatenation). Bodies omit `##` titles. */
export const EXPERT_FINALIZE_COPY_MOCK: ExpertFinalizeCopyDraft = {
  report_highlights:
    '這次報告裡，維生素 D 落在警戒區間，和白天容易疲累的感受較吻合；鎂落在提醒區，和「入睡比較慢」的目標有關。B12 目前在最佳區間，不是這次優先要處理的項目。\n\n'
    + '整體來看：先把「日照／維 D」與「夜間放鬆」兩條線講清楚，再對齊你想改善的入睡與白天精神。',
  expert_opinion:
    '以你的目標（入睡品質、白天精神）對照報告：維 D 偏低可能讓白天精神較難拉起來；鎂在提醒區時，夜間比較不容易放鬆入睡。建議方向是——白天補足日照／維 D 相關不足，夜間把放鬆節奏做穩；兩週後用「入睡所需時間」與「下午是否仍想睡」自我回看。\n\n'
    + '**可能原因（白話）**\n'
    + '- 日照或飲食來源不足 → 維 D 警戒\n'
    + '- 壓力／睡前節奏不穩 → 與鎂提醒、入睡目標疊加\n\n'
    + '**建議方向**\n'
    + '- 先穩定夜間放鬆與固定睡前節奏\n'
    + '- 白天精神以補足報告中的警戒項為優先，再觀察兩週',
  content_hash: 'mock-finalize-copy-hash',
  cache_hit: false
}

const mockCacheByCaseId = new Map<string, ExpertFinalizeCopyDraft>()

/** Opt-in local mock：`NUXT_PUBLIC_EXPERT_FINALIZE_COPY_MOCK=1`（正式／Pages 勿開）。 */
export function isExpertFinalizeCopyMockEnabled(): boolean {
  try {
    return Boolean(useRuntimeConfig().public.expertFinalizeCopyMock)
  } catch {
    return process.env.NUXT_PUBLIC_EXPERT_FINALIZE_COPY_MOCK === '1'
  }
}

export function resetExpertFinalizeCopyMockCache() {
  mockCacheByCaseId.clear()
}

/**
 * Mock generate with content-hash style cache.
 * `force=true` always regenerates (cache_hit=false).
 */
export function mockGenerateExpertFinalizeCopy(
  caseId: string,
  force = false
): ExpertFinalizeCopyDraft {
  const key = caseId || 'default'
  if (!force) {
    const hit = mockCacheByCaseId.get(key)
    if (hit) {
      return { ...hit, cache_hit: true }
    }
  }
  const next: ExpertFinalizeCopyDraft = {
    ...EXPERT_FINALIZE_COPY_MOCK,
    content_hash: `${EXPERT_FINALIZE_COPY_MOCK.content_hash}:${key}`,
    cache_hit: false
  }
  mockCacheByCaseId.set(key, { ...next, cache_hit: false })
  return next
}

export function readFinalizeCopyFromDetail(detail: Record<string, unknown> | null | undefined): {
  report_highlights: string
  expert_opinion: string
} | null {
  if (!detail) {
    return null
  }
  const highlights = detail.report_highlights
  const opinion = detail.expert_opinion
  if (typeof highlights !== 'string' && typeof opinion !== 'string') {
    return null
  }
  return {
    report_highlights: typeof highlights === 'string' ? highlights : '',
    expert_opinion: typeof opinion === 'string' ? opinion : ''
  }
}

export function isFinalizeCopyDirty(
  currentHighlights: string,
  currentOpinion: string,
  baselineHighlights: string,
  baselineOpinion: string
): boolean {
  return currentHighlights !== baselineHighlights || currentOpinion !== baselineOpinion
}
