export interface WeightSetEntryMock {
  domain: string
  ingredient: string
  base_weight: number
  priority: number
}

export interface WeightSetMock {
  id: string
  version: string
  status: 'draft' | 'published' | 'archived'
  label: string
  labelEn: string
  baseline_version: string | null
  updated_at: string
  entries: WeightSetEntryMock[]
  /** Optional note after a training batch unlocks clone. */
  unlock_note?: string
  unlock_note_en?: string
}

export type TrainingBatchStatus = 'selecting' | 'generated' | 'in_review' | 'ready' | 'promoted'

export interface CaseDialogueMock {
  id: string
  title: string
  titleEn: string
  summary: string
  summaryEn: string
  goals: string[]
}

export interface CatalogItemMock {
  code: string
  name: string
  nameEn: string
}

export interface SimulatedItemMock {
  code: string
  name: string
  nameEn: string
}

export interface CaseReviewMock {
  status: 'pending' | 'approved' | 'adjusted'
  items_after: SimulatedItemMock[]
  reason: string
  expert_id: string
  expert_name: string
  reviewed_at: string | null
}

export interface SimulatedCaseMock {
  id: string
  case_dialogue_id: string
  summary: string
  summaryEn: string
  items_before: SimulatedItemMock[]
  review: CaseReviewMock
}

export interface TrainingBatchMock {
  id: string
  name: string
  nameEn: string
  weight_set_id: string
  weight_version: string
  case_count: number
  selected_case_ids: string[]
  status: TrainingBatchStatus
  created_at: string
  cases: SimulatedCaseMock[]
}

/** Local mock only — not wired to `/admin/weight-sets` or training HTTP. */
export const EXPERT_TUNING_MOCK: WeightSetMock[] = [
  {
    id: 'ws-published-010',
    version: '0.1.0',
    status: 'published',
    label: '現行發布版',
    labelEn: 'Current published',
    baseline_version: null,
    updated_at: '2026-09-01T00:00:00Z',
    entries: [
      { domain: 'sleep', ingredient: 'magnesium', base_weight: 0.85, priority: 1 },
      { domain: 'sleep', ingredient: 'glycine', base_weight: 0.62, priority: 2 },
      { domain: 'energy', ingredient: 'coenzyme_q10', base_weight: 0.71, priority: 1 },
      { domain: 'immunity', ingredient: 'vitamin_d', base_weight: 0.78, priority: 1 }
    ]
  },
  {
    id: 'ws-draft-020-rc1',
    version: '0.2.0-rc1',
    status: 'draft',
    label: '睡眠權重調整草稿',
    labelEn: 'Sleep weight draft',
    baseline_version: '0.1.0',
    updated_at: '2026-10-01T08:30:00Z',
    entries: [
      { domain: 'sleep', ingredient: 'magnesium', base_weight: 0.92, priority: 1 },
      { domain: 'sleep', ingredient: 'glycine', base_weight: 0.7, priority: 2 },
      { domain: 'sleep', ingredient: 'l_theanine', base_weight: 0.55, priority: 3 },
      { domain: 'energy', ingredient: 'coenzyme_q10', base_weight: 0.71, priority: 1 },
      { domain: 'immunity', ingredient: 'vitamin_d', base_weight: 0.78, priority: 1 }
    ]
  }
]

export const CASE_DIALOGUE_MOCK: CaseDialogueMock[] = [
  {
    id: 'case-sleep-01',
    title: '睡眠淺、易醒',
    titleEn: 'Light sleep, frequent waking',
    summary: '客人描述入睡困難、夜間易醒；目標睡眠。',
    summaryEn: 'Guest reports trouble falling asleep and night waking; goal sleep.',
    goals: ['sleep']
  },
  {
    id: 'case-energy-01',
    title: '午後疲勞',
    titleEn: 'Afternoon fatigue',
    summary: '工作午後精神差；目標能量。',
    summaryEn: 'Afternoon slump at work; goal energy.',
    goals: ['energy']
  },
  {
    id: 'case-immune-01',
    title: '季節交替易感冒',
    titleEn: 'Seasonal colds',
    summary: '換季常感冒；目標免疫。',
    summaryEn: 'Frequent colds at season change; goal immunity.',
    goals: ['immunity']
  },
  {
    id: 'case-combo-01',
    title: '睡眠＋壓力',
    titleEn: 'Sleep and stress',
    summary: '壓力大、睡不安穩；目標睡眠與能量。',
    summaryEn: 'High stress and restless sleep; goals sleep and energy.',
    goals: ['sleep', 'energy']
  }
]

export const CATALOG_ITEM_MOCK: CatalogItemMock[] = [
  { code: 'MG-GLY', name: '鎂＋甘胺酸', nameEn: 'Magnesium + glycine' },
  { code: 'THEA', name: 'L-茶胺酸', nameEn: 'L-theanine' },
  { code: 'COQ10', name: '輔酶 Q10', nameEn: 'Coenzyme Q10' },
  { code: 'VITD', name: '維生素 D', nameEn: 'Vitamin D' },
  { code: 'OMEGA3', name: 'Omega-3', nameEn: 'Omega-3' },
  { code: 'BCOMP', name: 'B 群', nameEn: 'B-complex' }
]

const DEMO_EXPERT = {
  id: 'op-expert-demo',
  name: '示範專家'
}

function itemOf(code: string): SimulatedItemMock {
  const found = CATALOG_ITEM_MOCK.find(row => row.code === code)
  return {
    code,
    name: found?.name ?? code,
    nameEn: found?.nameEn ?? code
  }
}

function pendingReview(items: SimulatedItemMock[]): CaseReviewMock {
  return {
    status: 'pending',
    items_after: items.map(row => ({ ...row })),
    reason: '',
    expert_id: '',
    expert_name: '',
    reviewed_at: null
  }
}

/** Seed batch already in review (3 cases; mock UI may show fewer than configured N). */
export const TRAINING_BATCH_SEED: TrainingBatchMock = {
  id: 'tb-2026-10-sleep',
  name: '睡眠權重訓練 #1',
  nameEn: 'Sleep weight training #1',
  weight_set_id: 'ws-published-010',
  weight_version: '0.1.0',
  case_count: 3,
  selected_case_ids: ['case-sleep-01', 'case-combo-01', 'case-energy-01'],
  status: 'in_review',
  created_at: '2026-10-02T10:00:00Z',
  cases: [
    {
      id: 'sim-001',
      case_dialogue_id: 'case-sleep-01',
      summary: '依「睡眠淺、易醒」抽樣；權重 0.1.0 模擬品項。',
      summaryEn: 'Sampled from light-sleep dialogue; items from weight 0.1.0.',
      items_before: [itemOf('MG-GLY'), itemOf('THEA')],
      review: pendingReview([itemOf('MG-GLY'), itemOf('THEA')])
    },
    {
      id: 'sim-002',
      case_dialogue_id: 'case-combo-01',
      summary: '依「睡眠＋壓力」抽樣；權重 0.1.0 模擬品項。',
      summaryEn: 'Sampled from sleep+stress dialogue; items from weight 0.1.0.',
      items_before: [itemOf('MG-GLY'), itemOf('COQ10'), itemOf('BCOMP')],
      review: pendingReview([itemOf('MG-GLY'), itemOf('COQ10'), itemOf('BCOMP')])
    },
    {
      id: 'sim-003',
      case_dialogue_id: 'case-energy-01',
      summary: '依「午後疲勞」抽樣；權重 0.1.0 模擬品項。',
      summaryEn: 'Sampled from afternoon-fatigue dialogue; items from weight 0.1.0.',
      items_before: [itemOf('COQ10'), itemOf('BCOMP')],
      review: {
        status: 'approved',
        items_after: [itemOf('COQ10'), itemOf('BCOMP')],
        reason: '',
        expert_id: DEMO_EXPERT.id,
        expert_name: DEMO_EXPERT.name,
        reviewed_at: '2026-10-02T14:20:00Z'
      }
    }
  ]
}

export const WEIGHT_SET_STATUS_COLOR = {
  draft: 'neutral',
  published: 'success',
  archived: 'warning'
} as const

export const TRAINING_BATCH_STATUS_COLOR = {
  selecting: 'neutral',
  generated: 'info',
  in_review: 'warning',
  ready: 'primary',
  promoted: 'success'
} as const

export function demoExpertIdentity() {
  return { ...DEMO_EXPERT }
}

export function cloneTrainingBatch(batch: TrainingBatchMock): TrainingBatchMock {
  return structuredClone(batch)
}

export function itemsEqual(left: SimulatedItemMock[], right: SimulatedItemMock[]) {
  if (left.length !== right.length) {
    return false
  }
  const a = left.map(row => row.code).sort().join(',')
  const b = right.map(row => row.code).sort().join(',')
  return a === b
}

export function batchReviewProgress(batch: TrainingBatchMock) {
  const done = batch.cases.filter(row => row.review.status !== 'pending').length
  return { done, total: batch.cases.length }
}

export function refreshBatchStatus(batch: TrainingBatchMock): TrainingBatchStatus {
  if (batch.status === 'promoted' || batch.status === 'selecting') {
    return batch.status
  }
  if (!batch.cases.length) {
    return 'generated'
  }
  const { done, total } = batchReviewProgress(batch)
  if (done === 0) {
    return 'generated'
  }
  if (done < total) {
    return 'in_review'
  }
  return 'ready'
}

export function generateSimulatedCases(
  selectedCaseIds: string[],
  count: number,
  weightVersion: string,
  localeEn: boolean
): SimulatedCaseMock[] {
  const pool = selectedCaseIds.length
    ? CASE_DIALOGUE_MOCK.filter(row => selectedCaseIds.includes(row.id))
    : CASE_DIALOGUE_MOCK
  if (!pool.length) {
    return []
  }
  const templates: Record<string, string[]> = {
    'case-sleep-01': ['MG-GLY', 'THEA'],
    'case-energy-01': ['COQ10', 'BCOMP'],
    'case-immune-01': ['VITD', 'OMEGA3'],
    'case-combo-01': ['MG-GLY', 'COQ10', 'BCOMP']
  }
  const out: SimulatedCaseMock[] = []
  const n = Math.max(1, Math.min(count, 50))
  for (let i = 0; i < n; i++) {
    const dialogue = pool[i % pool.length]!
    const codes = templates[dialogue.id] ?? ['MG-GLY']
    const items = codes.map(itemOf)
    out.push({
      id: `sim-gen-${String(i + 1).padStart(3, '0')}`,
      case_dialogue_id: dialogue.id,
      summary: localeEn
        ? `Sample #${i + 1} from “${dialogue.titleEn}”; weight ${weightVersion}.`
        : `第 ${i + 1} 筆，抽自「${dialogue.title}」；權重 ${weightVersion}。`,
      summaryEn: `Sample #${i + 1} from “${dialogue.titleEn}”; weight ${weightVersion}.`,
      items_before: items,
      review: pendingReview(items)
    })
  }
  return out
}
