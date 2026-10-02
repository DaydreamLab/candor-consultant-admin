<script setup lang="ts">
import {
  CASE_DIALOGUE_MOCK,
  CATALOG_ITEM_MOCK,
  TRAINING_BATCH_STATUS_COLOR,
  batchReviewProgress,
  cloneTrainingBatch,
  demoExpertIdentity,
  itemsEqual,
  type SimulatedCaseMock,
  type SimulatedItemMock
} from '~/utils/expert-tuning-mock'

const route = useRoute()
const localePath = useLocalePath()
const { t, locale } = useI18n()
const session = useSessionStore()
const { getBatch, upsertBatch, promoteBatch } = useExpertTuningMockStore()

const batchId = computed(() => String(route.params.id ?? ''))
const batch = computed(() => getBatch(batchId.value))
const batchLabel = useState<string | null>('candor-training-batch-label', () => null)

const selectedCaseId = ref<string | null>(null)
const draftCodes = ref<string[]>([])
const draftReason = ref('')
const reviewError = ref('')
const promoteMessage = ref('')

const selectedCase = computed(() =>
  batch.value?.cases.find(row => row.id === selectedCaseId.value) ?? null
)

const progress = computed(() => {
  if (!batch.value) {
    return { done: 0, total: 0 }
  }
  return batchReviewProgress(batch.value)
})

const canPromote = computed(() => batch.value?.status === 'ready')

const catalogOptions = computed(() =>
  CATALOG_ITEM_MOCK.map(row => ({
    label: String(locale.value).startsWith('en') ? row.nameEn : row.name,
    value: row.code
  }))
)

watch(batchId, (id) => {
  const row = getBatch(id)
  batchLabel.value = row
    ? (String(locale.value).startsWith('en') ? row.nameEn : row.name)
    : null
  selectedCaseId.value = row?.cases[0]?.id ?? null
  promoteMessage.value = ''
  hydrateDraft()
}, { immediate: true })

watch(selectedCaseId, () => {
  reviewError.value = ''
  hydrateDraft()
})

onUnmounted(() => {
  batchLabel.value = null
})

function hydrateDraft() {
  const current = selectedCase.value
  if (!current) {
    draftCodes.value = []
    draftReason.value = ''
    return
  }
  const source = current.review.status === 'pending'
    ? current.items_before
    : current.review.items_after
  draftCodes.value = source.map(row => row.code)
  draftReason.value = current.review.reason
}

function expertIdentity() {
  const op = session.operator
  if (op?.id) {
    return { id: op.id, name: op.name || op.email }
  }
  return demoExpertIdentity()
}

function dialogueTitle(caseDialogueId: string) {
  const found = CASE_DIALOGUE_MOCK.find(row => row.id === caseDialogueId)
  if (!found) {
    return caseDialogueId
  }
  return String(locale.value).startsWith('en') ? found.titleEn : found.title
}

function caseSummary(row: SimulatedCaseMock) {
  return String(locale.value).startsWith('en') ? row.summaryEn : row.summary
}

function itemName(row: SimulatedItemMock) {
  return String(locale.value).startsWith('en') ? row.nameEn : row.name
}

function reviewStatusLabel(row: SimulatedCaseMock) {
  return t(`expertTuning.training.reviewStatus.${row.review.status}`)
}

function codesToItems(codes: string[]): SimulatedItemMock[] {
  return codes.map((code) => {
    const found = CATALOG_ITEM_MOCK.find(row => row.code === code)
    return {
      code,
      name: found?.name ?? code,
      nameEn: found?.nameEn ?? code
    }
  })
}

function itemChecked(code: string) {
  return draftCodes.value.includes(code)
}

function toggleItem(code: string, checked: boolean | 'indeterminate') {
  const on = checked === true
  if (on && !draftCodes.value.includes(code)) {
    draftCodes.value = [...draftCodes.value, code]
    return
  }
  if (!on) {
    draftCodes.value = draftCodes.value.filter(row => row !== code)
  }
}

function saveApprove() {
  applyReview('approved', selectedCase.value?.items_before.map(row => row.code) ?? [])
}

function saveAdjust() {
  applyReview('adjusted', draftCodes.value)
}

function applyReview(mode: 'approved' | 'adjusted', codes: string[]) {
  reviewError.value = ''
  const currentBatch = batch.value
  const current = selectedCase.value
  if (!currentBatch || !current) {
    return
  }
  const after = codesToItems(codes)
  if (!after.length) {
    reviewError.value = t('expertTuning.training.errors.items')
    return
  }
  const changed = !itemsEqual(current.items_before, after)
  if (mode === 'adjusted' && changed && !draftReason.value.trim()) {
    reviewError.value = t('expertTuning.training.errors.reason')
    return
  }
  if (mode === 'approved' && changed) {
    reviewError.value = t('expertTuning.training.errors.approveChanged')
    return
  }
  const expert = expertIdentity()
  const next = cloneTrainingBatch(currentBatch)
  const target = next.cases.find(row => row.id === current.id)
  if (!target) {
    return
  }
  target.review = {
    status: changed ? 'adjusted' : 'approved',
    items_after: after,
    reason: changed ? draftReason.value.trim() : '',
    expert_id: expert.id,
    expert_name: expert.name,
    reviewed_at: new Date().toISOString()
  }
  upsertBatch(next)
  hydrateDraft()
}

function onPromote() {
  promoteMessage.value = ''
  const result = promoteBatch(batchId.value)
  if (!result) {
    promoteMessage.value = t('expertTuning.training.errors.promote')
    return
  }
  promoteMessage.value = t('expertTuning.training.promotedHint')
}
</script>

<template>
  <PageHeader
    :title="batchLabel || batchId"
    :description="$t('expertTuning.training.detailDescription')"
  >
    <ExpertTuningTabs />

    <p
      v-if="!batch"
      class="text-sm text-error"
    >
      {{ $t('expertTuning.training.notFound') }}
    </p>
    <template v-else>
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge
          :label="$t(`expertTuning.training.status.${batch.status}`)"
          :color="TRAINING_BATCH_STATUS_COLOR[batch.status]"
        />
        <span class="text-sm text-muted">
          {{ $t('expertTuning.training.fields.weight') }} · {{ batch.weight_version }}
        </span>
        <span class="text-sm text-muted">
          {{ $t('expertTuning.training.progress', { done: progress.done, total: progress.total }) }}
        </span>
        <UButton
          class="ms-auto"
          :disabled="!canPromote"
          @click="onPromote"
        >
          {{ $t('expertTuning.training.promote') }}
        </UButton>
      </div>
      <p
        v-if="promoteMessage"
        class="mb-4 text-sm text-highlighted"
      >
        {{ promoteMessage }}
      </p>
      <p
        v-else-if="!canPromote && batch.status !== 'promoted'"
        class="mb-4 text-sm text-muted"
      >
        {{ $t('expertTuning.training.promoteHint') }}
      </p>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,16rem)_1fr]">
        <div class="rounded-xl border border-default bg-elevated">
          <p class="border-b border-default px-3 py-2 text-sm font-semibold text-highlighted">
            {{ $t('expertTuning.training.casesTitle') }}
          </p>
          <ul class="max-h-[28rem] overflow-y-auto">
            <li
              v-for="row in batch.cases"
              :key="row.id"
            >
              <button
                type="button"
                class="flex w-full flex-col gap-1 border-b border-default px-3 py-2.5 text-left hover:bg-muted/40"
                :class="row.id === selectedCaseId ? 'bg-primary/5' : ''"
                @click="selectedCaseId = row.id"
              >
                <span class="text-sm font-medium text-highlighted">
                  {{ dialogueTitle(row.case_dialogue_id) }}
                </span>
                <span class="text-xs text-muted">
                  {{ reviewStatusLabel(row) }}
                </span>
              </button>
            </li>
          </ul>
        </div>

        <div
          v-if="selectedCase"
          class="flex flex-col gap-4"
        >
          <section class="rounded-xl border border-default bg-elevated p-4">
            <h2 class="text-base font-semibold text-highlighted">
              {{ $t('expertTuning.training.sections.context') }}
            </h2>
            <p class="mt-2 text-sm text-muted">
              {{ caseSummary(selectedCase) }}
            </p>
          </section>

          <section class="rounded-xl border border-default bg-elevated p-4">
            <h2 class="mb-2 text-base font-semibold text-highlighted">
              {{ $t('expertTuning.training.sections.simulated') }}
            </h2>
            <ul class="flex flex-wrap gap-2">
              <li
                v-for="item in selectedCase.items_before"
                :key="item.code"
              >
                <UBadge
                  color="neutral"
                  variant="subtle"
                  :label="itemName(item)"
                />
              </li>
            </ul>
          </section>

          <section class="rounded-xl border border-default bg-elevated p-4">
            <h2 class="mb-3 text-base font-semibold text-highlighted">
              {{ $t('expertTuning.training.sections.review') }}
            </h2>
            <p class="mb-2 text-xs text-muted">
              {{ $t('expertTuning.training.fields.items') }}
            </p>
            <div class="mb-3 flex flex-col gap-2">
              <label
                v-for="opt in catalogOptions"
                :key="opt.value"
                class="flex cursor-pointer items-center gap-2 text-sm text-highlighted"
              >
                <UCheckbox
                  :model-value="itemChecked(opt.value)"
                  @update:model-value="toggleItem(opt.value, $event)"
                />
                {{ opt.label }}
              </label>
            </div>
            <div class="mb-3">
              <label class="mb-1 block text-xs text-muted">
                {{ $t('expertTuning.training.fields.reason') }}
              </label>
              <UTextarea
                v-model="draftReason"
                :placeholder="$t('expertTuning.training.fields.reasonHint')"
                :rows="3"
                class="w-full"
              />
            </div>
            <p class="mb-3 text-xs text-muted">
              {{ $t('expertTuning.training.fields.expert') }}：
              {{ expertIdentity().name }}
            </p>
            <p
              v-if="reviewError"
              class="mb-3 text-sm text-error"
            >
              {{ reviewError }}
            </p>
            <div class="flex flex-wrap gap-2">
              <UButton
                color="success"
                variant="soft"
                :disabled="batch.status === 'promoted'"
                @click="saveApprove"
              >
                {{ $t('expertTuning.training.approve') }}
              </UButton>
              <UButton
                :disabled="batch.status === 'promoted'"
                @click="saveAdjust"
              >
                {{ $t('expertTuning.training.saveAdjust') }}
              </UButton>
            </div>
            <p
              v-if="selectedCase.review.status !== 'pending'"
              class="mt-3 text-xs text-muted"
            >
              {{ reviewStatusLabel(selectedCase) }}
              · {{ selectedCase.review.expert_name }}
              · {{ selectedCase.review.reviewed_at }}
            </p>
          </section>
        </div>
      </div>

      <div class="mt-4">
        <UButton
          color="neutral"
          variant="ghost"
          :to="localePath('/expert-tuning/training')"
        >
          {{ $t('expertTuning.training.back') }}
        </UButton>
      </div>
      <p class="mt-3 text-xs text-muted">
        {{ $t('expertTuning.mockHint') }}
      </p>
    </template>
  </PageHeader>
</template>
