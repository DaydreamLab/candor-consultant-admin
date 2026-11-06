<script setup lang="ts">
import { AdminApiError } from '~/utils/admin-api'
import { operatorRoles } from '~/utils/operator-roles'
import {
  adminGetCtaScenarioMatrix,
  adminListCtaCatalog,
  adminPatchCtaCatalogItem,
  adminPatchCtaScenarioMatrix
} from '~/utils/cta-catalog-api'
import { canEditCtaCatalog } from '~/utils/cta-catalog-access'
import {
  buildCtaQuestionJsonPreview,
  ctaHasThresholdUrlFields,
  matchesCtaUiFilter,
  resolveOfferFullTestThreshold,
  resolveOfferFullTestUrl,
  type CtaUiFilter
} from '~/utils/cta-catalog-labels'
import type {
  CtaCatalogItem,
  CtaCatalogType,
  CtaDecisionFormat,
  CtaScenarioId,
  CtaScenarioMatrix
} from '~/utils/cta-catalog-types'
import {
  CTA_CATALOG_TYPES,
  CTA_DECISION_FORMATS,
  CTA_SCENARIO_IDS,
  isHardGateForbidden
} from '~/utils/cta-catalog-types'
import { readOperatorToken } from '~/utils/operator-session'

type PanelView = 'list' | 'edit' | 'matrix'

const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const canEdit = computed(() => canEditCtaCatalog(operatorRoles(session.operator)))

const view = ref<PanelView>('list')
const filter = ref<CtaUiFilter>('all')
const items = ref<CtaCatalogItem[]>([])
const matrix = ref<CtaScenarioMatrix | null>(null)
const pending = ref(true)
const error = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const editing = ref<CtaCatalogItem | null>(null)
const draftDisplayName = ref('')
const draftQuestion = ref('')
const draftFormat = ref<CtaDecisionFormat>('noul')
const draftFormatDetail = ref('')
const draftReplyType = ref<CtaCatalogType>('ask_report')
const draftReplyHint = ref('')
const draftScenarios = ref<CtaScenarioId[]>([])
const draftThreshold = ref(136)
const draftUrl = ref('')

const matrixDraft = ref<CtaScenarioMatrix | null>(null)

const filteredItems = computed(() =>
  items.value.filter(row => matchesCtaUiFilter(row.type, filter.value))
)

const formatItems = computed(() =>
  CTA_DECISION_FORMATS.map(value => ({
    label: t(`settings.guidance.format.${value}`),
    value
  }))
)

const replyTypeItems = computed(() =>
  CTA_CATALOG_TYPES.map(value => ({
    label: value,
    value
  }))
)

const filterChips = computed(() => [
  { value: 'all' as const, label: t('settings.guidance.filterAll') },
  { value: 'upload_checkup' as const, label: t('settings.guidance.filterUploadCheckup') },
  { value: 'vitals_options' as const, label: t('settings.guidance.filterVitalsOptions') }
])

const jsonPreview = computed(() => {
  if (!editing.value) {
    return ''
  }
  return buildCtaQuestionJsonPreview({
    type: editing.value.type,
    decision_question: draftQuestion.value,
    decision_format: draftFormat.value,
    format_detail: draftFormatDetail.value.trim() || null
  })
})

const editDirty = computed(() => {
  if (!editing.value) {
    return false
  }
  const e = editing.value
  const baseDirty = (
    draftDisplayName.value !== e.display_name
    || draftQuestion.value !== e.decision_question
    || draftFormat.value !== e.decision_format
    || (draftFormatDetail.value.trim() || null) !== (e.format_detail || null)
    || draftReplyType.value !== e.reply_action_type
    || draftReplyHint.value !== e.reply_action_hint
    || !sameScenarioSet(draftScenarios.value, e.scenario_ids)
  )
  if (!ctaHasThresholdUrlFields(e.type)) {
    return baseDirty
  }
  return (
    baseDirty
    || draftThreshold.value !== resolveOfferFullTestThreshold(e.threshold)
    || draftUrl.value.trim() !== resolveOfferFullTestUrl(e.url)
  )
})

const matrixDirty = computed(() => {
  if (!matrix.value || !matrixDraft.value) {
    return false
  }
  return JSON.stringify(matrixDraft.value.rows) !== JSON.stringify(matrix.value.rows)
})

if (import.meta.client) {
  void loadList()
}

async function loadList() {
  const token = readOperatorToken()
  if (!token) {
    error.value = t('settings.guidance.loadFailed')
    pending.value = false
    return
  }
  pending.value = true
  error.value = ''
  saved.value = false
  saveError.value = ''
  try {
    items.value = await adminListCtaCatalog(config.public.apiBase, token)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('settings.guidance.loadFailed')
    items.value = []
  } finally {
    pending.value = false
  }
}

async function loadMatrix() {
  const token = readOperatorToken()
  if (!token) {
    error.value = t('settings.guidance.loadFailed')
    return
  }
  pending.value = true
  error.value = ''
  try {
    matrix.value = await adminGetCtaScenarioMatrix(config.public.apiBase, token)
    matrixDraft.value = cloneMatrix(matrix.value)
    view.value = 'matrix'
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('settings.guidance.loadFailed')
  } finally {
    pending.value = false
  }
}

function openEdit(row: CtaCatalogItem) {
  editing.value = row
  draftDisplayName.value = row.display_name
  draftQuestion.value = row.decision_question
  draftFormat.value = row.decision_format
  draftFormatDetail.value = row.format_detail ?? ''
  draftReplyType.value = row.reply_action_type
  draftReplyHint.value = row.reply_action_hint
  draftScenarios.value = [...row.scenario_ids]
  draftThreshold.value = resolveOfferFullTestThreshold(row.threshold)
  draftUrl.value = resolveOfferFullTestUrl(row.url)
  saveError.value = ''
  saved.value = false
  view.value = 'edit'
}

function cancelEdit() {
  editing.value = null
  view.value = 'list'
  saveError.value = ''
  saved.value = false
}

function backToList() {
  view.value = 'list'
  matrixDraft.value = null
  void loadList()
}

async function saveEdit() {
  const token = readOperatorToken()
  if (!token || !editing.value || !canEdit.value || saving.value || !editDirty.value) {
    return
  }
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    const patch = {
      display_name: draftDisplayName.value.trim(),
      decision_question: draftQuestion.value,
      decision_format: draftFormat.value,
      format_detail: draftFormatDetail.value.trim() || null,
      reply_action_type: draftReplyType.value,
      reply_action_hint: draftReplyHint.value,
      scenario_ids: [...draftScenarios.value],
      ...(ctaHasThresholdUrlFields(editing.value.type)
        ? {
            threshold: Number.isFinite(draftThreshold.value)
              ? draftThreshold.value
              : resolveOfferFullTestThreshold(editing.value.threshold),
            url: draftUrl.value.trim() || resolveOfferFullTestUrl(editing.value.url)
          }
        : {})
    }
    const updated = await adminPatchCtaCatalogItem(
      config.public.apiBase,
      token,
      editing.value.type,
      patch
    )
    editing.value = updated
    draftDisplayName.value = updated.display_name
    draftQuestion.value = updated.decision_question
    draftFormat.value = updated.decision_format
    draftFormatDetail.value = updated.format_detail ?? ''
    draftReplyType.value = updated.reply_action_type
    draftReplyHint.value = updated.reply_action_hint
    draftScenarios.value = [...updated.scenario_ids]
    draftThreshold.value = resolveOfferFullTestThreshold(updated.threshold)
    draftUrl.value = resolveOfferFullTestUrl(updated.url)
    const idx = items.value.findIndex(r => r.type === updated.type)
    if (idx >= 0) {
      items.value[idx] = updated
    }
    saved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    if (err instanceof AdminApiError && err.statusCode === 403) {
      saveError.value = t('settings.guidance.saveForbidden')
    } else {
      saveError.value = message || t('settings.guidance.saveFailed')
    }
  } finally {
    saving.value = false
  }
}

async function saveMatrix() {
  const token = readOperatorToken()
  if (!token || !matrixDraft.value || !canEdit.value || saving.value || !matrixDirty.value) {
    return
  }
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    matrix.value = await adminPatchCtaScenarioMatrix(
      config.public.apiBase,
      token,
      matrixDraft.value
    )
    matrixDraft.value = cloneMatrix(matrix.value)
    saved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    if (err instanceof AdminApiError && err.statusCode === 403) {
      saveError.value = t('settings.guidance.saveForbidden')
    } else {
      saveError.value = message || t('settings.guidance.saveFailed')
    }
  } finally {
    saving.value = false
  }
}

function toggleScenario(id: CtaScenarioId, checked: boolean) {
  if (!canEdit.value) {
    return
  }
  if (checked) {
    if (!draftScenarios.value.includes(id)) {
      draftScenarios.value = [...draftScenarios.value, id]
    }
  } else {
    draftScenarios.value = draftScenarios.value.filter(s => s !== id)
  }
}

function isMatrixChecked(scenario: CtaScenarioId, type: CtaCatalogType): boolean {
  const row = matrixDraft.value?.rows.find(r => r.scenario === scenario)
  return Boolean(row?.types.includes(type))
}

function matrixNote(scenario: CtaScenarioId, type: CtaCatalogType): string {
  const row = matrixDraft.value?.rows.find(r => r.scenario === scenario)
  return row?.notes?.[type] ?? ''
}

function toggleMatrixCell(scenario: CtaScenarioId, type: CtaCatalogType) {
  if (!canEdit.value || !matrixDraft.value || isHardGateForbidden(scenario, type)) {
    return
  }
  matrixDraft.value = {
    ...matrixDraft.value,
    rows: matrixDraft.value.rows.map((row) => {
      if (row.scenario !== scenario) {
        return row
      }
      const has = row.types.includes(type)
      return {
        ...row,
        types: has ? row.types.filter(t => t !== type) : [...row.types, type]
      }
    })
  }
}

function sameScenarioSet(a: CtaScenarioId[], b: CtaScenarioId[]) {
  if (a.length !== b.length) {
    return false
  }
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

function cloneMatrix(source: CtaScenarioMatrix): CtaScenarioMatrix {
  return {
    updated_at: source.updated_at ?? null,
    rows: source.rows.map(row => ({
      scenario: row.scenario,
      types: [...row.types],
      notes: row.notes ? { ...row.notes } : undefined
    }))
  }
}
</script>

<template>
  <div data-testid="cta-catalog-settings">
    <!-- List header / matrix header / edit header -->
    <div
      v-if="view === 'edit' && editing"
      class="mb-4 flex flex-wrap items-center justify-between gap-3"
    >
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.guidance.title') }}
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <span class="inline-flex rounded-full bg-forest-100 px-2.5 py-0.5 text-xs font-semibold text-forest-700">
          {{ $t('settings.guidance.seeded') }}
        </span>
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="cancelEdit"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          v-if="canEdit"
          color="primary"
          size="sm"
          :disabled="saving || !editDirty"
          :loading="saving"
          data-testid="cta-catalog-save"
          @click="saveEdit"
        >
          {{ $t('actions.save') }}
        </UButton>
      </div>
    </div>

    <div
      v-else-if="view === 'matrix'"
      class="mb-4 flex flex-wrap items-center justify-between gap-3"
    >
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.guidance.matrixTitle') }}
      </h2>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          color="neutral"
          variant="outline"
          size="sm"
          @click="backToList"
        >
          {{ $t('settings.guidance.backToList') }}
        </UButton>
        <UButton
          v-if="canEdit"
          color="primary"
          size="sm"
          :disabled="saving || !matrixDirty"
          :loading="saving"
          data-testid="cta-catalog-matrix-save"
          @click="saveMatrix"
        >
          {{ $t('settings.guidance.saveMatrix') }}
        </UButton>
      </div>
    </div>

    <template v-else>
      <p class="mb-4 max-w-3xl text-sm text-muted">
        {{ $t('settings.guidance.hint') }}
      </p>
    </template>

    <div
      v-if="!canEdit"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm text-warning"
      data-testid="cta-catalog-readonly-banner"
    >
      <span>{{ $t('settings.guidance.readonlyBanner') }}</span>
    </div>

    <div
      v-if="error"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      data-testid="cta-catalog-error"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon
          name="i-lucide-triangle-alert"
          class="size-4 shrink-0"
        />
        <span>{{ error }}</span>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        data-testid="cta-catalog-retry"
        @click="view === 'matrix' ? loadMatrix() : loadList()"
      >
        {{ $t('settings.guidance.retry') }}
      </UButton>
    </div>

    <div
      v-if="saveError"
      class="mb-4 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      data-testid="cta-catalog-save-error"
    >
      {{ saveError }}
    </div>
    <p
      v-if="saved"
      class="mb-4 text-sm text-success"
      data-testid="cta-catalog-saved"
    >
      {{ $t('actions.saved') }}
    </p>

    <!-- LOADING -->
    <div
      v-if="pending && view === 'list'"
      class="overflow-hidden rounded-xl border border-default bg-elevated p-5"
      data-testid="cta-catalog-loading"
    >
      <USkeleton
        v-for="n in 5"
        :key="n"
        class="mb-3 h-3.5"
        :class="n % 2 === 0 ? 'w-4/5' : 'w-full'"
      />
      <p class="mt-2 text-sm text-brand-600">
        {{ $t('settings.guidance.loading') }}
      </p>
    </div>

    <!-- LIST ERROR EMPTY SHELL -->
    <EmptyPanel
      v-else-if="error && view === 'list'"
      dashed
      :title="$t('settings.guidance.errorTitle')"
      :description="$t('settings.guidance.errorBody')"
      data-testid="cta-catalog-error-empty"
    />

    <!-- LIST EMPTY -->
    <EmptyPanel
      v-else-if="view === 'list' && !pending && !items.length"
      dashed
      :title="$t('settings.guidance.emptyTitle')"
      :description="$t('settings.guidance.emptyBody')"
      data-testid="cta-catalog-empty"
    >
      <UButton
        color="primary"
        size="sm"
        icon="i-lucide-refresh-cw"
        @click="loadList"
      >
        {{ $t('settings.guidance.refresh') }}
      </UButton>
    </EmptyPanel>

    <!-- LIST -->
    <template v-else-if="view === 'list'">
      <div class="mb-4 flex flex-wrap items-center gap-2">
        <div
          class="inline-flex overflow-hidden rounded-full border border-default bg-elevated"
          role="group"
          :aria-label="$t('settings.guidance.filterGroup')"
        >
          <button
            v-for="chip in filterChips"
            :key="chip.value"
            type="button"
            class="px-3 py-1.5 text-xs font-semibold text-muted"
            :class="filter === chip.value ? 'bg-brand-100 text-brand-700' : ''"
            :data-testid="`cta-filter-${chip.value}`"
            @click="filter = chip.value"
          >
            {{ chip.label }}
          </button>
        </div>
        <UButton
          class="ms-auto"
          color="primary"
          variant="soft"
          size="sm"
          data-testid="cta-catalog-open-matrix"
          @click="loadMatrix"
        >
          {{ $t('settings.guidance.scenarioSubset') }}
        </UButton>
      </div>

      <div class="overflow-hidden rounded-xl border border-default bg-elevated">
        <div class="overflow-x-auto">
          <table class="app-table w-full min-w-[48rem] text-left text-sm">
            <thead class="border-b border-default bg-muted/40 text-xs text-muted">
              <tr>
                <th>{{ $t('settings.guidance.colIdentity') }}</th>
                <th>{{ $t('settings.guidance.colQuestion') }}</th>
                <th>{{ $t('settings.guidance.colFormat') }}</th>
                <th>{{ $t('settings.guidance.colHitUi') }}</th>
                <th>{{ $t('settings.guidance.colScenarios') }}</th>
                <th>{{ $t('settings.guidance.colActions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in filteredItems"
                :key="row.type"
                class="cursor-pointer border-b border-default last:border-0 hover:bg-brand-50/60"
                :data-testid="`cta-row-${row.type}`"
                @click="openEdit(row)"
              >
                <td class="py-3">
                  <div class="font-semibold text-highlighted">
                    {{ row.display_name }}
                    <span
                      v-if="row.is_sample"
                      class="ms-1 inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-sand-700"
                    >{{ $t('settings.guidance.sample') }}</span>
                  </div>
                  <div class="font-mono text-[11px] text-muted">
                    {{ row.type }}
                  </div>
                </td>
                <td class="max-w-xs truncate text-default">
                  {{ row.decision_question }}
                </td>
                <td>
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
                    :class="row.decision_format === 'choice'
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-lagoon-100 text-lagoon-700'"
                  >
                    {{ $t(`settings.guidance.format.${row.decision_format}`) }}
                  </span>
                </td>
                <td>
                  <span class="inline-flex rounded-full bg-forest-100 px-2 py-0.5 text-[11px] font-bold text-forest-700">
                    {{ $t(`settings.guidance.hitUi.${row.type}`) }}
                  </span>
                </td>
                <td>
                  <span
                    v-for="sid in row.scenario_ids"
                    :key="sid"
                    class="me-1 mb-1 inline-flex rounded-full bg-mist-100 px-2 py-0.5 text-[11px] font-bold text-mist-600"
                  >
                    {{ $t(`settings.guidance.scenario.${sid}`) }}
                  </span>
                </td>
                <td @click.stop>
                  <UButton
                    color="primary"
                    variant="soft"
                    size="sm"
                    @click="openEdit(row)"
                  >
                    {{ canEdit ? $t('actions.edit') : $t('settings.guidance.view') }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-3 text-xs text-muted">
        {{ $t('settings.guidance.listFooter') }}
      </p>
    </template>

    <!-- EDIT -->
    <template v-else-if="view === 'edit' && editing">
      <div class="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
        {{ $t('settings.guidance.editBanner') }}
      </div>

      <div class="max-w-3xl space-y-4">
        <section class="rounded-xl border border-default bg-elevated p-4">
          <h3 class="mb-3 text-sm font-semibold text-highlighted">
            {{ $t('settings.guidance.sectionIdentity') }}
            <span class="ms-2 inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-sand-700">
              {{ $t('settings.guidance.sample') }} · {{ editing.type }}
            </span>
          </h3>
          <UFormField
            :label="$t('settings.guidance.fieldType')"
            class="mb-3"
          >
            <UInput
              :model-value="editing.type"
              disabled
              class="font-mono"
            />
          </UFormField>
          <UFormField :label="$t('settings.guidance.fieldDisplayName')">
            <UInput
              v-model="draftDisplayName"
              :disabled="!canEdit || saving"
              data-testid="cta-edit-display-name"
            />
          </UFormField>
        </section>

        <section class="rounded-xl border border-default bg-elevated p-4">
          <h3 class="mb-3 text-sm font-semibold text-highlighted">
            {{ $t('settings.guidance.sectionDecision') }}
          </h3>
          <UFormField
            :label="$t('settings.guidance.fieldQuestion')"
            class="mb-3"
          >
            <UTextarea
              v-model="draftQuestion"
              :rows="3"
              :disabled="!canEdit || saving"
              data-testid="cta-edit-question"
            />
          </UFormField>
          <UFormField
            :label="$t('settings.guidance.fieldFormat')"
            class="mb-3"
          >
            <USelect
              v-model="draftFormat"
              :items="formatItems"
              value-key="value"
              :disabled="!canEdit || saving"
            />
          </UFormField>
          <UFormField
            v-if="draftFormat === 'choice' || draftFormat === 'score'"
            :label="draftFormat === 'choice'
              ? $t('settings.guidance.fieldChoiceCriteria')
              : $t('settings.guidance.fieldScoreLevels')"
            class="mb-3"
          >
            <UInput
              v-model="draftFormatDetail"
              :disabled="!canEdit || saving"
            />
          </UFormField>
          <div
            v-if="editing.type === 'ask_vitals'"
            class="mb-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning"
            data-testid="cta-ask-vitals-info"
          >
            {{ $t('settings.guidance.askVitalsInfo') }}
          </div>
          <details class="text-xs text-muted">
            <summary class="cursor-pointer font-semibold">
              {{ $t('settings.guidance.jsonPreview') }}
            </summary>
            <pre class="mt-2 overflow-auto rounded-lg border border-default bg-muted/30 p-3 font-mono text-[11px]">{{ jsonPreview }}</pre>
          </details>
        </section>

        <section class="rounded-xl border border-default bg-elevated p-4">
          <h3 class="mb-3 text-sm font-semibold text-highlighted">
            {{ $t('settings.guidance.sectionHitUi') }}
          </h3>
          <UFormField
            :label="$t('settings.guidance.fieldReplyType')"
            class="mb-3"
          >
            <USelect
              v-model="draftReplyType"
              :items="replyTypeItems"
              value-key="value"
              :disabled="!canEdit || saving"
            />
          </UFormField>
          <UFormField
            :label="$t('settings.guidance.fieldReplyHint')"
            class="mb-3"
          >
            <UInput
              v-model="draftReplyHint"
              :disabled="!canEdit || saving"
            />
          </UFormField>
          <template v-if="ctaHasThresholdUrlFields(editing.type)">
            <div
              class="mb-3 rounded-xl border border-warning/20 bg-warning/10 px-3 py-2 text-sm text-warning"
              data-testid="cta-offer-full-test-info"
            >
              {{ $t('settings.guidance.offerFullTestInfo') }}
            </div>
            <UFormField
              :label="$t('settings.guidance.fieldThreshold')"
              :help="$t('settings.guidance.fieldThresholdHelp')"
              class="mb-3"
            >
              <UInput
                v-model.number="draftThreshold"
                type="number"
                :min="0"
                :disabled="!canEdit || saving"
                data-testid="cta-edit-threshold"
              />
            </UFormField>
            <UFormField
              :label="$t('settings.guidance.fieldUrl')"
              :help="$t('settings.guidance.fieldUrlHelp')"
            >
              <UInput
                v-model="draftUrl"
                type="url"
                :disabled="!canEdit || saving"
                data-testid="cta-edit-url"
              />
            </UFormField>
          </template>
        </section>

        <section class="rounded-xl border border-default bg-elevated p-4">
          <h3 class="mb-3 text-sm font-semibold text-highlighted">
            {{ $t('settings.guidance.sectionScenarios') }}
          </h3>
          <div class="grid gap-2">
            <label
              v-for="sid in CTA_SCENARIO_IDS"
              :key="sid"
              class="flex items-center gap-2 text-sm text-default"
            >
              <input
                type="checkbox"
                class="size-4 rounded border-default"
                :checked="draftScenarios.includes(sid)"
                :disabled="!canEdit || saving || (editing.type === 'offer_checkup' && sid === 'question_rule')"
                @change="toggleScenario(sid, ($event.target as HTMLInputElement).checked)"
              >
              {{ $t(`settings.guidance.scenario.${sid}`) }}
            </label>
          </div>
          <p class="mt-3 text-xs text-muted">
            {{ $t('settings.guidance.scenariosHint') }}
          </p>
          <div
            v-if="editing.type === 'ask_report' || editing.type === 'offer_checkup'"
            class="mt-3 rounded-xl border border-default bg-muted/30 px-3 py-2 text-sm text-muted"
            data-testid="cta-lab-merge-note"
          >
            {{ $t('settings.guidance.labMergeNote') }}
          </div>
        </section>
      </div>
    </template>

    <!-- MATRIX -->
    <template v-else-if="view === 'matrix' && matrixDraft">
      <p class="mb-4 max-w-3xl text-sm text-muted">
        {{ $t('settings.guidance.matrixHint') }}
      </p>
      <div class="overflow-hidden rounded-xl border border-default bg-elevated">
        <div class="overflow-x-auto p-2">
          <table class="w-full min-w-[48rem] text-center text-xs">
            <thead class="border-b border-default bg-muted/40 text-muted">
              <tr>
                <th class="px-2 py-2 text-left">
                  {{ $t('settings.guidance.colScenario') }}
                </th>
                <th
                  v-for="type in CTA_CATALOG_TYPES"
                  :key="type"
                  class="px-2 py-2 font-mono"
                >
                  {{ type }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in matrixDraft.rows"
                :key="row.scenario"
                class="border-b border-default last:border-0"
              >
                <td class="px-2 py-3 text-left font-semibold text-highlighted">
                  {{ $t(`settings.guidance.scenario.${row.scenario}`) }}
                  <span
                    v-if="row.scenario === 'open_dialog'"
                    class="ms-1 inline-flex rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-sand-700"
                  >{{ $t('settings.guidance.openAll') }}</span>
                </td>
                <td
                  v-for="type in CTA_CATALOG_TYPES"
                  :key="type"
                  class="px-2 py-3"
                >
                  <template v-if="isHardGateForbidden(row.scenario, type)">
                    <span
                      class="inline-flex cursor-not-allowed rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-bold text-sand-700"
                      :title="$t('settings.guidance.hardGateTooltip')"
                      data-testid="cta-matrix-hard-gate"
                    >
                      {{ $t('settings.guidance.forbidden') }}
                    </span>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      class="inline-flex min-w-8 flex-col items-center gap-0.5 rounded px-1 py-0.5 text-sm"
                      :class="canEdit ? 'hover:bg-brand-50' : 'cursor-default'"
                      :disabled="!canEdit"
                      :aria-pressed="isMatrixChecked(row.scenario, type)"
                      :data-testid="`cta-matrix-${row.scenario}-${type}`"
                      @click="toggleMatrixCell(row.scenario, type)"
                    >
                      <span>{{ isMatrixChecked(row.scenario, type) ? '✓' : '—' }}</span>
                      <span
                        v-if="matrixNote(row.scenario, type)"
                        class="text-[10px] text-muted"
                      >{{ matrixNote(row.scenario, type) }}</span>
                    </button>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p class="mt-3 text-xs text-muted">
        {{ $t('settings.guidance.matrixFooter') }}
      </p>
    </template>
  </div>
</template>
