<script setup lang="ts">
import {
  CASE_DIALOGUE_MOCK,
  TRAINING_BATCH_STATUS_COLOR,
  batchReviewProgress,
  type TrainingBatchMock
} from '~/utils/expert-tuning-mock'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const { batches, weightSets, createBatch } = useExpertTuningMockStore()

const creating = ref(false)
const formName = ref('')
const formCount = ref(3)
const formWeightId = ref(weightSets.value.find(row => row.status === 'published')?.id
  ?? weightSets.value[0]?.id
  ?? '')
const selectedCases = ref<string[]>(CASE_DIALOGUE_MOCK.slice(0, 2).map(row => row.id))
const formError = ref('')

const weightOptions = computed(() =>
  weightSets.value.map(row => ({
    label: `${row.version} · ${String(locale.value).startsWith('en') ? row.labelEn : row.label}`,
    value: row.id
  }))
)

const caseOptions = computed(() =>
  CASE_DIALOGUE_MOCK.map(row => ({
    label: String(locale.value).startsWith('en') ? row.titleEn : row.title,
    value: row.id,
    description: String(locale.value).startsWith('en') ? row.summaryEn : row.summary
  }))
)

function caseChecked(id: string) {
  return selectedCases.value.includes(id)
}

function toggleCase(id: string, checked: boolean | 'indeterminate') {
  const on = checked === true
  if (on && !selectedCases.value.includes(id)) {
    selectedCases.value = [...selectedCases.value, id]
    return
  }
  if (!on) {
    selectedCases.value = selectedCases.value.filter(row => row !== id)
  }
}

function openBatch(row: TrainingBatchMock) {
  void navigateTo(localePath(`/expert-tuning/training/${encodeURIComponent(row.id)}`))
}

function nameOf(row: TrainingBatchMock) {
  return String(locale.value).startsWith('en') ? row.nameEn : row.name
}

function progressOf(row: TrainingBatchMock) {
  const { done, total } = batchReviewProgress(row)
  return t('expertTuning.training.progress', { done, total })
}

function submitCreate() {
  formError.value = ''
  const name = formName.value.trim()
  if (!name) {
    formError.value = t('expertTuning.training.errors.name')
    return
  }
  if (!selectedCases.value.length) {
    formError.value = t('expertTuning.training.errors.cases')
    return
  }
  const weight = weightSets.value.find(row => row.id === formWeightId.value)
  if (!weight) {
    formError.value = t('expertTuning.training.errors.weight')
    return
  }
  const count = Math.max(1, Math.min(50, Number(formCount.value) || 50))
  const batch = createBatch({
    name,
    nameEn: name,
    weight_set_id: weight.id,
    weight_version: weight.version,
    case_count: count,
    selected_case_ids: [...selectedCases.value],
    localeEn: String(locale.value).startsWith('en')
  })
  creating.value = false
  formName.value = ''
  void navigateTo(localePath(`/expert-tuning/training/${encodeURIComponent(batch.id)}`))
}
</script>

<template>
  <PageHeader
    :title="$t('nav.expertTuning')"
    :description="$t('expertTuning.training.description')"
  >
    <ExpertTuningTabs />
    <div class="mb-4 flex justify-end">
      <UButton
        icon="i-lucide-plus"
        @click="creating = !creating"
      >
        {{ $t('expertTuning.training.create') }}
      </UButton>
    </div>

    <div
      v-if="creating"
      class="mb-6 rounded-xl border border-default bg-elevated p-4"
    >
      <p class="mb-3 text-sm font-semibold text-highlighted">
        {{ $t('expertTuning.training.createTitle') }}
      </p>
      <div class="flex flex-col gap-3">
        <div>
          <label class="mb-1 block text-xs text-muted">
            {{ $t('expertTuning.training.fields.name') }}
          </label>
          <UInput
            v-model="formName"
            class="w-full max-w-md"
          />
        </div>
        <div class="max-w-md">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('expertTuning.training.fields.weight') }}
          </label>
          <USelect
            v-model="formWeightId"
            :items="weightOptions"
            value-key="value"
            class="w-full"
          />
        </div>
        <div class="max-w-xs">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('expertTuning.training.fields.count') }}
          </label>
          <UInput
            v-model.number="formCount"
            type="number"
            :min="1"
            :max="50"
            class="w-full"
          />
          <p class="mt-1 text-xs text-muted">
            {{ $t('expertTuning.training.fields.countHint') }}
          </p>
        </div>
        <div>
          <label class="mb-2 block text-xs text-muted">
            {{ $t('expertTuning.training.fields.cases') }}
          </label>
          <div class="flex flex-col gap-2">
            <label
              v-for="opt in caseOptions"
              :key="opt.value"
              class="flex cursor-pointer items-start gap-2 rounded-lg border border-default px-3 py-2 hover:bg-muted/40"
            >
              <UCheckbox
                :model-value="caseChecked(opt.value)"
                class="mt-0.5"
                @update:model-value="toggleCase(opt.value, $event)"
              />
              <span>
                <span class="block text-sm font-medium text-highlighted">
                  {{ opt.label }}
                </span>
                <span class="block text-xs text-muted">
                  {{ opt.description }}
                </span>
              </span>
            </label>
          </div>
        </div>
        <p
          v-if="formError"
          class="text-sm text-error"
        >
          {{ formError }}
        </p>
        <div class="flex gap-2">
          <UButton @click="submitCreate">
            {{ $t('expertTuning.training.generate') }}
          </UButton>
          <UButton
            color="neutral"
            variant="ghost"
            @click="creating = false"
          >
            {{ $t('actions.cancel') }}
          </UButton>
        </div>
      </div>
    </div>

    <p
      v-if="!batches.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('expertTuning.training.empty') }}
    </p>
    <AdminTable
      v-else
      compact
    >
      <template #head>
        <tr>
          <th>{{ $t('expertTuning.training.columns.name') }}</th>
          <th>{{ $t('expertTuning.training.columns.weight') }}</th>
          <th>{{ $t('expertTuning.training.columns.count') }}</th>
          <th>{{ $t('expertTuning.training.columns.progress') }}</th>
          <th>{{ $t('expertTuning.training.columns.status') }}</th>
        </tr>
      </template>
      <tr
        v-for="row in batches"
        :key="row.id"
        class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
        @click="openBatch(row)"
      >
        <td class="font-medium text-highlighted">
          {{ nameOf(row) }}
        </td>
        <td class="text-highlighted">
          {{ row.weight_version }}
        </td>
        <td class="tabular-nums text-highlighted">
          {{ row.case_count }}
        </td>
        <td class="text-muted">
          {{ progressOf(row) }}
        </td>
        <td>
          <StatusBadge
            :label="$t(`expertTuning.training.status.${row.status}`)"
            :color="TRAINING_BATCH_STATUS_COLOR[row.status]"
          />
        </td>
      </tr>
    </AdminTable>
    <p class="mt-3 text-xs text-muted">
      {{ $t('expertTuning.mockHint') }}
    </p>
  </PageHeader>
</template>
