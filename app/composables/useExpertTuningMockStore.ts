import {
  EXPERT_TUNING_MOCK,
  TRAINING_BATCH_SEED,
  cloneTrainingBatch,
  generateSimulatedCases,
  refreshBatchStatus,
  type TrainingBatchMock,
  type WeightSetMock
} from '~/utils/expert-tuning-mock'

export function useExpertTuningMockStore() {
  const batches = useState<TrainingBatchMock[]>('candor-expert-training-batches', () => [
    cloneTrainingBatch(TRAINING_BATCH_SEED)
  ])
  const weightSets = useState<WeightSetMock[]>('candor-expert-weight-sets', () =>
    structuredClone(EXPERT_TUNING_MOCK)
  )

  function getBatch(id: string) {
    return batches.value.find(row => row.id === id) ?? null
  }

  function upsertBatch(batch: TrainingBatchMock) {
    const next = cloneTrainingBatch(batch)
    next.status = refreshBatchStatus(next)
    const index = batches.value.findIndex(row => row.id === next.id)
    if (index >= 0) {
      const copy = [...batches.value]
      copy[index] = next
      batches.value = copy
    } else {
      batches.value = [next, ...batches.value]
    }
    return next
  }

  function createBatch(input: {
    name: string
    nameEn: string
    weight_set_id: string
    weight_version: string
    case_count: number
    selected_case_ids: string[]
    localeEn: boolean
  }) {
    const now = new Date().toISOString()
    const cases = generateSimulatedCases(
      input.selected_case_ids,
      input.case_count,
      input.weight_version,
      input.localeEn
    )
    const batch: TrainingBatchMock = {
      id: `tb-${Date.now()}`,
      name: input.name,
      nameEn: input.nameEn || input.name,
      weight_set_id: input.weight_set_id,
      weight_version: input.weight_version,
      case_count: cases.length,
      selected_case_ids: [...input.selected_case_ids],
      status: cases.length ? 'generated' : 'selecting',
      created_at: now,
      cases
    }
    return upsertBatch(batch)
  }

  function promoteBatch(id: string) {
    const batch = getBatch(id)
    if (!batch || batch.status !== 'ready') {
      return null
    }
    const promoted = cloneTrainingBatch(batch)
    promoted.status = 'promoted'
    upsertBatch(promoted)

    const note = `Unlocked by training batch “${batch.name}”. Clone → publish still required.`
    const noteZh = `已由訓練組合「${batch.name}」解鎖。仍須 clone → publish。`
    const baselineEntries = weightSets.value.find(row => row.id === batch.weight_set_id)?.entries
      ?? EXPERT_TUNING_MOCK[0]!.entries
    const draft: WeightSetMock = {
      id: `ws-draft-from-${batch.id}`,
      version: `${batch.weight_version}-train`,
      status: 'draft',
      label: `${batch.name} 解鎖草稿`,
      labelEn: `${batch.nameEn} unlock draft`,
      baseline_version: batch.weight_version,
      updated_at: new Date().toISOString(),
      entries: structuredClone(baselineEntries),
      unlock_note: noteZh,
      unlock_note_en: note
    }
    weightSets.value = [draft, ...weightSets.value]
    return promoted
  }

  return {
    batches,
    weightSets,
    getBatch,
    upsertBatch,
    createBatch,
    promoteBatch
  }
}
