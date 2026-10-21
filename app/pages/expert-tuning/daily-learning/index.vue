<script setup lang="ts">
import {
  AdminApiError,
  adminDailyLearningConfirm,
  adminDailyLearningConfirmSafety,
  adminDailyLearningDraft,
  adminWeightSetDryRun,
  adminWeightSetPublish
} from '~/utils/admin-api'
import {
  buildDailyLearningConfirmBody,
  formatTechnicalJson,
  generalProposalsForKnowledge,
  orphanGeneralProposals,
  parseDailyLearningDraft,
  technicalHasWeightNumbers,
  type DailyLearningClassification,
  type DailyLearningDraftView,
  type DailyLearningGeneralProposal,
  type DailyLearningSafetyProposal,
  type DailyLearningStep
} from '~/utils/daily-learning'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()
const feedback = useOpsFeedback()

const busy = ref(false)
const errorMessage = ref('')
const draftDate = ref('')
const step = ref<DailyLearningStep>('idle')
const draft = ref<DailyLearningDraftView | null>(null)

/** Human classification overrides keyed by knowledge_id. */
const classificationChoice = ref<Record<string, DailyLearningClassification>>({})
/** General proposal accept flags; default true only when linked knowledge is reusable. */
const generalAccepted = ref<Record<string, boolean>>({})
/** Safety: default disagree; only true after confirm-safety succeeds. */
const safetyApplied = ref<Record<string, boolean>>({})
const safetyExpanded = ref<Record<string, boolean>>({})
const generalTechOpen = ref<Record<string, boolean>>({})

const dryRunGatePassed = ref<boolean | null>(null)
const dryRunSummary = ref('')
const publishOverride = ref('')

const safetyConfirmOpen = ref(false)
const safetyConfirmTarget = ref<DailyLearningSafetyProposal | null>(null)

const knowledgeIds = computed(() => {
  const ids = new Set<string>()
  for (const row of draft.value?.classifications ?? []) {
    ids.add(row.knowledge_id)
  }
  return ids
})

const orphanGenerals = computed(() => {
  if (!draft.value) {
    return [] as DailyLearningGeneralProposal[]
  }
  return orphanGeneralProposals(draft.value.general_proposals, knowledgeIds.value)
})

const allClassificationsLocked = computed(() => {
  const rows = draft.value?.classifications ?? []
  if (!rows.length) {
    return true
  }
  return rows.every((row) => {
    const choice = classificationChoice.value[row.knowledge_id]
    return choice === 'reusable' || choice === 'personal_risk'
  })
})

const stepIndex = computed(() => {
  switch (step.value) {
    case 'idle':
      return 0
    case 'drafted':
      return 1
    case 'general_confirmed':
      return 2
    case 'dry_run_done':
      return 3
    case 'published':
      return 4
    default:
      return 0
  }
})

watch(
  () => draft.value,
  (view) => {
    if (!view) {
      classificationChoice.value = {}
      generalAccepted.value = {}
      safetyApplied.value = {}
      safetyExpanded.value = {}
      generalTechOpen.value = {}
      return
    }
    const nextClass: Record<string, DailyLearningClassification> = {}
    for (const row of view.classifications) {
      nextClass[row.knowledge_id] = row.proposed_classification === 'pending'
        ? 'pending'
        : row.proposed_classification
    }
    classificationChoice.value = nextClass

    const nextAccept: Record<string, boolean> = {}
    for (const proposal of view.general_proposals) {
      const linked = proposal.knowledge_id
        ? nextClass[proposal.knowledge_id]
        : null
      nextAccept[proposal.id] = linked === 'reusable'
    }
    generalAccepted.value = nextAccept

    const nextSafety: Record<string, boolean> = {}
    const nextExpand: Record<string, boolean> = {}
    for (const proposal of view.safety_proposals) {
      nextSafety[proposal.id] = false
      nextExpand[proposal.id] = false
    }
    safetyApplied.value = nextSafety
    safetyExpanded.value = nextExpand
    generalTechOpen.value = {}
  },
  { immediate: true }
)

watch(
  classificationChoice,
  (choices) => {
    if (!draft.value) {
      return
    }
    const next = { ...generalAccepted.value }
    for (const proposal of draft.value.general_proposals) {
      if (!proposal.knowledge_id) {
        continue
      }
      if (choices[proposal.knowledge_id] !== 'reusable') {
        next[proposal.id] = false
      }
    }
    generalAccepted.value = next
  },
  { deep: true }
)

function classificationOptions(knowledgeId: string) {
  const proposed = draft.value?.classifications
    .find(row => row.knowledge_id === knowledgeId)
    ?.proposed_classification
  return [
    {
      label: t('expertTuning.dailyLearning.classification.reusable'),
      value: 'reusable'
    },
    {
      label: t('expertTuning.dailyLearning.classification.personal_risk'),
      value: 'personal_risk'
    },
    ...(proposed === 'pending'
      ? [{
          label: t('expertTuning.dailyLearning.classification.pending'),
          value: 'pending'
        }]
      : [])
  ]
}

function generalsFor(knowledgeId: string) {
  return draft.value
    ? generalProposalsForKnowledge(draft.value.general_proposals, knowledgeId)
    : []
}

function canAcceptGeneral(proposal: DailyLearningGeneralProposal) {
  if (!proposal.knowledge_id) {
    return true
  }
  return classificationChoice.value[proposal.knowledge_id] === 'reusable'
}

function apiErrorMessage(error: unknown) {
  if (error instanceof AdminApiError && error.message) {
    return error.message
  }
  return t('expertTuning.dailyLearning.failed')
}

async function generateDraft() {
  const token = readOperatorToken()
  if (!token) {
    errorMessage.value = t('expertTuning.dailyLearning.failed')
    return
  }
  busy.value = true
  errorMessage.value = ''
  dryRunGatePassed.value = null
  dryRunSummary.value = ''
  try {
    const payload: { date?: string } = {}
    if (draftDate.value.trim()) {
      payload.date = draftDate.value.trim()
    }
    const data = await adminDailyLearningDraft(
      config.public.apiBase,
      token,
      payload
    )
    const view = parseDailyLearningDraft(data)
    if (!view) {
      throw new AdminApiError(500, t('expertTuning.dailyLearning.parseFailed'))
    }
    draft.value = view
    step.value = 'drafted'
    feedback.notify({
      title: t('expertTuning.dailyLearning.draftOk'),
      color: 'success'
    })
  } catch (error) {
    draft.value = null
    step.value = 'idle'
    errorMessage.value = apiErrorMessage(error)
  } finally {
    busy.value = false
  }
}

async function confirmGeneral() {
  const token = readOperatorToken()
  const view = draft.value
  if (!token || !view) {
    return
  }
  if (!allClassificationsLocked.value) {
    feedback.notify({
      title: t('expertTuning.dailyLearning.needClassification'),
      color: 'warning'
    })
    return
  }

  const acceptedIds = view.general_proposals
    .filter((row) => {
      if (!generalAccepted.value[row.id]) {
        return false
      }
      return canAcceptGeneral(row)
    })
    .map(row => row.id)

  const body = buildDailyLearningConfirmBody({
    classifications: view.classifications.map(row => ({
      knowledge_id: row.knowledge_id,
      classification: classificationChoice.value[row.knowledge_id] ?? 'pending'
    })),
    acceptedGeneralProposalIds: acceptedIds
  })

  if (!body.confirmations.length && view.classifications.length) {
    feedback.notify({
      title: t('expertTuning.dailyLearning.needClassification'),
      color: 'warning'
    })
    return
  }

  busy.value = true
  errorMessage.value = ''
  try {
    await adminDailyLearningConfirm(
      config.public.apiBase,
      token,
      view.weight_set.id,
      body
    )
    step.value = 'general_confirmed'
    feedback.notify({
      title: t('expertTuning.dailyLearning.confirmOk'),
      color: 'success'
    })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error)
  } finally {
    busy.value = false
  }
}

function openSafetyConfirm(proposal: DailyLearningSafetyProposal) {
  if (step.value === 'idle' || step.value === 'drafted') {
    feedback.notify({
      title: t('expertTuning.dailyLearning.safetyNeedGeneralFirst'),
      color: 'warning'
    })
    return
  }
  if (!safetyExpanded.value[proposal.id]) {
    feedback.notify({
      title: t('expertTuning.dailyLearning.safetyExpandFirst'),
      color: 'warning'
    })
    return
  }
  if (safetyApplied.value[proposal.id]) {
    return
  }
  safetyConfirmTarget.value = proposal
  safetyConfirmOpen.value = true
}

async function confirmSafetyOne() {
  const token = readOperatorToken()
  const view = draft.value
  const target = safetyConfirmTarget.value
  if (!token || !view || !target) {
    return
  }
  busy.value = true
  errorMessage.value = ''
  try {
    await adminDailyLearningConfirmSafety(
      config.public.apiBase,
      token,
      view.weight_set.id,
      target.id
    )
    safetyApplied.value = {
      ...safetyApplied.value,
      [target.id]: true
    }
    safetyConfirmOpen.value = false
    safetyConfirmTarget.value = null
    // Safety changes require a fresh dry-run before publish.
    if (step.value === 'dry_run_done' || step.value === 'published') {
      step.value = 'general_confirmed'
      dryRunGatePassed.value = null
      dryRunSummary.value = ''
    }
    feedback.notify({
      title: t('expertTuning.dailyLearning.safetyConfirmOk'),
      color: 'success'
    })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error)
  } finally {
    busy.value = false
  }
}

async function runDryRun() {
  const token = readOperatorToken()
  const view = draft.value
  if (!token || !view) {
    return
  }
  if (step.value === 'idle' || step.value === 'drafted') {
    feedback.notify({
      title: t('expertTuning.dailyLearning.dryRunNeedConfirm'),
      color: 'warning'
    })
    return
  }
  busy.value = true
  errorMessage.value = ''
  try {
    const data = await adminWeightSetDryRun(
      config.public.apiBase,
      token,
      view.weight_set.id
    )
    const passed = typeof data.gate_passed === 'boolean' ? data.gate_passed : null
    dryRunGatePassed.value = passed
    const top3 = typeof data.top3_change_total === 'number' ? data.top3_change_total : null
    const max = typeof data.max_top3_changes === 'number' ? data.max_top3_changes : null
    dryRunSummary.value = passed === true
      ? t('expertTuning.dailyLearning.dryRunPassed', {
          top3: top3 ?? '—',
          max: max ?? '—'
        })
      : t('expertTuning.dailyLearning.dryRunFailed', {
          top3: top3 ?? '—',
          max: max ?? '—'
        })
    step.value = 'dry_run_done'
  } catch (error) {
    errorMessage.value = apiErrorMessage(error)
  } finally {
    busy.value = false
  }
}

async function publishDraft() {
  const token = readOperatorToken()
  const view = draft.value
  if (!token || !view) {
    return
  }
  if (step.value !== 'dry_run_done' && step.value !== 'published') {
    feedback.notify({
      title: t('expertTuning.dailyLearning.publishNeedDryRun'),
      color: 'warning'
    })
    return
  }
  busy.value = true
  errorMessage.value = ''
  try {
    const payload: { override_reason?: string } = {}
    if (dryRunGatePassed.value === false && publishOverride.value.trim()) {
      payload.override_reason = publishOverride.value.trim()
    }
    await adminWeightSetPublish(
      config.public.apiBase,
      token,
      view.weight_set.id,
      payload
    )
    step.value = 'published'
    feedback.notify({
      title: t('expertTuning.dailyLearning.publishOk'),
      color: 'success'
    })
  } catch (error) {
    errorMessage.value = apiErrorMessage(error)
  } finally {
    busy.value = false
  }
}

function safetyKindLabel(kind: DailyLearningSafetyProposal['kind']) {
  return t(`expertTuning.dailyLearning.safetyKind.${kind}`)
}

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}
</script>

<template>
  <PageHeader
    :title="$t('expertTuning.dailyLearning.title')"
    :description="$t('expertTuning.dailyLearning.description')"
  >
    <ExpertTuningTabs />

    <ol
      class="mb-6 flex flex-wrap gap-2 text-xs"
      data-testid="daily-learning-steps"
    >
      <li
        v-for="(labelKey, index) in [
          'stepClone',
          'stepConfirm',
          'stepSafety',
          'stepDryRun',
          'stepPublish'
        ]"
        :key="labelKey"
        class="rounded-md border px-2.5 py-1"
        :class="stepIndex >= index
          ? 'border-primary/40 bg-primary/5 text-highlighted'
          : 'border-default text-muted'"
      >
        {{ index + 1 }}. {{ $t(`expertTuning.dailyLearning.${labelKey}`) }}
      </li>
    </ol>

    <section class="mb-6 space-y-3 rounded-xl border border-default bg-elevated p-4">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('expertTuning.dailyLearning.generateTitle') }}
      </h2>
      <p class="text-sm text-muted">
        {{ $t('expertTuning.dailyLearning.generateHint') }}
      </p>
      <div class="flex flex-wrap items-end gap-3">
        <UFormField
          :label="$t('expertTuning.dailyLearning.dateLabel')"
          class="min-w-[12rem]"
        >
          <UInput
            v-model="draftDate"
            type="date"
            data-testid="daily-learning-date"
          />
        </UFormField>
        <UButton
          color="primary"
          :loading="busy"
          data-testid="daily-learning-generate"
          @click="generateDraft"
        >
          {{ $t('expertTuning.dailyLearning.generate') }}
        </UButton>
      </div>
      <p
        v-if="draft"
        class="text-sm text-muted"
        data-testid="daily-learning-draft-meta"
      >
        {{ $t('expertTuning.dailyLearning.draftMeta', {
          version: draft.weight_set.version,
          date: draft.date,
          status: draft.weight_set.status
        }) }}
      </p>
    </section>

    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
      data-testid="daily-learning-error"
    >
      {{ errorMessage }}
    </p>

    <template v-if="draft">
      <!-- General zone -->
      <section
        class="mb-8 space-y-4"
        data-testid="daily-learning-general"
      >
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('expertTuning.dailyLearning.generalTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ $t('expertTuning.dailyLearning.generalHint') }}
          </p>
        </div>

        <p
          v-if="!draft.classifications.length && !draft.general_proposals.length"
          class="rounded-lg border border-dashed border-default px-4 py-6 text-center text-sm text-muted"
        >
          {{ $t('expertTuning.dailyLearning.generalEmpty') }}
        </p>

        <article
          v-for="row in draft.classifications"
          :key="row.knowledge_id"
          class="rounded-xl border border-default bg-elevated p-4"
          :data-testid="`daily-learning-class-${row.knowledge_id}`"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1 space-y-1">
              <p class="text-sm font-medium text-highlighted">
                {{ row.package_plan_code || shortId(row.knowledge_id) }}
                <span
                  v-if="row.decision"
                  class="ms-2 font-normal text-muted"
                >· {{ row.decision }}</span>
              </p>
              <p class="text-sm text-muted">
                {{ row.rationale || $t('expertTuning.dailyLearning.noRationale') }}
              </p>
              <p class="text-xs text-muted">
                {{ $t('expertTuning.dailyLearning.aiSuggested', {
                  value: $t(`expertTuning.dailyLearning.classification.${row.proposed_classification}`)
                }) }}
              </p>
            </div>
            <UFormField
              :label="$t('expertTuning.dailyLearning.yourJudgement')"
              class="w-44"
            >
              <USelect
                v-model="classificationChoice[row.knowledge_id]"
                :items="classificationOptions(row.knowledge_id)"
                value-key="value"
                :disabled="busy || step !== 'drafted'"
                data-testid="daily-learning-class-select"
              />
            </UFormField>
          </div>

          <div
            v-if="generalsFor(row.knowledge_id).length"
            class="mt-4 space-y-3 border-t border-default pt-4"
          >
            <p class="text-xs font-semibold uppercase tracking-wide text-muted">
              {{ $t('expertTuning.dailyLearning.linkedGenerals') }}
            </p>
            <div
              v-for="proposal in generalsFor(row.knowledge_id)"
              :key="proposal.id"
              class="rounded-lg border border-default/80 bg-default/30 p-3"
              :data-testid="`daily-learning-general-${proposal.id}`"
            >
              <p class="text-sm text-highlighted">
                {{ proposal.plain_language
                  || $t('expertTuning.dailyLearning.generalFallbackPlain', {
                    ingredient: proposal.ingredient_label || '—',
                    domain: proposal.domain_label || '—',
                    kind: proposal.kind || '—'
                  }) }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                <UCheckbox
                  v-model="generalAccepted[proposal.id]"
                  :disabled="busy
                    || step !== 'drafted'
                    || !canAcceptGeneral(proposal)"
                  :label="$t('expertTuning.dailyLearning.acceptGeneral')"
                  data-testid="daily-learning-general-accept"
                />
                <span
                  v-if="!canAcceptGeneral(proposal)"
                  class="text-xs text-muted"
                >
                  {{ $t('expertTuning.dailyLearning.generalOnlyReusable') }}
                </span>
              </div>
              <div
                v-if="technicalHasWeightNumbers(proposal.technical)
                  || Object.keys(proposal.technical).length"
                class="mt-2"
              >
                <button
                  type="button"
                  class="text-xs text-muted underline-offset-2 hover:underline"
                  data-testid="daily-learning-tech-summary"
                  @click="generalTechOpen[proposal.id] = !generalTechOpen[proposal.id]"
                >
                  {{ generalTechOpen[proposal.id]
                    ? $t('expertTuning.dailyLearning.techDetailsHide')
                    : $t('expertTuning.dailyLearning.techDetails') }}
                </button>
                <pre
                  v-if="generalTechOpen[proposal.id]"
                  class="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-xs text-muted"
                  data-testid="daily-learning-tech-body"
                >{{ formatTechnicalJson(proposal.technical) }}</pre>
              </div>
            </div>
          </div>
        </article>

        <article
          v-for="proposal in orphanGenerals"
          :key="`orphan-${proposal.id}`"
          class="rounded-xl border border-default bg-elevated p-4"
          :data-testid="`daily-learning-general-${proposal.id}`"
        >
          <p class="text-sm text-highlighted">
            {{ proposal.plain_language
              || $t('expertTuning.dailyLearning.generalFallbackPlain', {
                ingredient: proposal.ingredient_label || '—',
                domain: proposal.domain_label || '—',
                kind: proposal.kind || '—'
              }) }}
          </p>
          <div class="mt-2">
            <UCheckbox
              v-model="generalAccepted[proposal.id]"
              :disabled="busy || step !== 'drafted'"
              :label="$t('expertTuning.dailyLearning.acceptGeneral')"
            />
          </div>
          <div
            v-if="Object.keys(proposal.technical).length"
            class="mt-2"
          >
            <button
              type="button"
              class="text-xs text-muted underline-offset-2 hover:underline"
              @click="generalTechOpen[proposal.id] = !generalTechOpen[proposal.id]"
            >
              {{ generalTechOpen[proposal.id]
                ? $t('expertTuning.dailyLearning.techDetailsHide')
                : $t('expertTuning.dailyLearning.techDetails') }}
            </button>
            <pre
              v-if="generalTechOpen[proposal.id]"
              class="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-xs text-muted"
            >{{ formatTechnicalJson(proposal.technical) }}</pre>
          </div>
        </article>

        <UButton
          color="primary"
          :loading="busy"
          :disabled="step !== 'drafted'"
          data-testid="daily-learning-confirm-general"
          @click="confirmGeneral"
        >
          {{ $t('expertTuning.dailyLearning.confirmGeneral') }}
        </UButton>
      </section>

      <!-- Safety zone -->
      <section
        class="mb-8 space-y-4 rounded-xl border border-warning/50 bg-warning/5 p-4"
        data-testid="daily-learning-safety"
      >
        <div>
          <h2 class="text-lg font-semibold text-highlighted">
            {{ $t('expertTuning.dailyLearning.safetyTitle') }}
          </h2>
          <p class="mt-1 text-sm text-muted">
            {{ $t('expertTuning.dailyLearning.safetyHint') }}
          </p>
          <p class="mt-1 text-xs font-medium text-warning">
            {{ $t('expertTuning.dailyLearning.safetyRiskBadge') }}
          </p>
        </div>

        <p
          v-if="!draft.safety_proposals.length"
          class="text-sm text-muted"
        >
          {{ $t('expertTuning.dailyLearning.safetyEmpty') }}
        </p>

        <article
          v-for="proposal in draft.safety_proposals"
          :key="proposal.id"
          class="rounded-lg border border-warning/40 bg-elevated p-4"
          :data-testid="`daily-learning-safety-${proposal.id}`"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
              {{ safetyKindLabel(proposal.kind) }}
            </span>
            <span class="text-xs text-muted">
              {{ safetyApplied[proposal.id]
                ? $t('expertTuning.dailyLearning.safetyStatusApplied')
                : $t('expertTuning.dailyLearning.safetyStatusDefault') }}
            </span>
          </div>

          <button
            type="button"
            class="mt-3 w-full rounded-md border border-default px-3 py-2 text-left text-sm hover:bg-muted/30"
            data-testid="daily-learning-safety-expand"
            @click="safetyExpanded[proposal.id] = !safetyExpanded[proposal.id]"
          >
            {{ safetyExpanded[proposal.id]
              ? $t('expertTuning.dailyLearning.safetyCollapse')
              : $t('expertTuning.dailyLearning.safetyExpand') }}
          </button>

          <div
            v-if="safetyExpanded[proposal.id]"
            class="mt-3 space-y-2"
            data-testid="daily-learning-safety-body"
          >
            <p class="text-sm text-highlighted">
              {{ proposal.risk_text || $t('expertTuning.dailyLearning.safetyNoRiskText') }}
            </p>
            <p
              v-if="proposal.from_label || proposal.to_label"
              class="text-xs text-muted"
            >
              {{ proposal.from_label || '—' }} → {{ proposal.to_label || '—' }}
            </p>
            <details
              v-if="Object.keys(proposal.technical).length"
              class="text-xs"
            >
              <summary class="cursor-pointer text-muted">
                {{ $t('expertTuning.dailyLearning.techDetails') }}
              </summary>
              <pre class="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-muted">{{ formatTechnicalJson(proposal.technical) }}</pre>
            </details>
            <UButton
              color="warning"
              variant="soft"
              size="sm"
              :disabled="busy
                || safetyApplied[proposal.id]
                || step === 'idle'
                || step === 'drafted'
                || step === 'published'"
              data-testid="daily-learning-safety-confirm-btn"
              @click="openSafetyConfirm(proposal)"
            >
              {{ $t('expertTuning.dailyLearning.safetyConfirmOne') }}
            </UButton>
          </div>
        </article>
      </section>

      <!-- Dry-run / publish -->
      <section
        class="space-y-4 rounded-xl border border-default bg-elevated p-4"
        data-testid="daily-learning-apply"
      >
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('expertTuning.dailyLearning.applyTitle') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('expertTuning.dailyLearning.applyHint') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <UButton
            color="neutral"
            variant="soft"
            :loading="busy"
            :disabled="step === 'idle' || step === 'drafted' || step === 'published'"
            data-testid="daily-learning-dry-run"
            @click="runDryRun"
          >
            {{ $t('expertTuning.dailyLearning.dryRun') }}
          </UButton>
          <UButton
            color="primary"
            :loading="busy"
            :disabled="step !== 'dry_run_done'"
            data-testid="daily-learning-publish"
            @click="publishDraft"
          >
            {{ $t('expertTuning.dailyLearning.publish') }}
          </UButton>
        </div>
        <p
          v-if="dryRunSummary"
          class="text-sm"
          :class="dryRunGatePassed ? 'text-success' : 'text-warning'"
          data-testid="daily-learning-dry-run-summary"
        >
          {{ dryRunSummary }}
        </p>
        <UFormField
          v-if="dryRunGatePassed === false"
          :label="$t('expertTuning.dailyLearning.overrideReason')"
          class="max-w-md"
        >
          <UInput
            v-model="publishOverride"
            data-testid="daily-learning-override"
          />
        </UFormField>
      </section>
    </template>

    <ConfirmDelete
      v-model:open="safetyConfirmOpen"
      color="warning"
      :double="true"
      :title="$t('expertTuning.dailyLearning.safetyDialogTitle')"
      :description="safetyConfirmTarget
        ? (safetyConfirmTarget.risk_text
          || $t('expertTuning.dailyLearning.safetyNoRiskText'))
        : ''"
      :confirm-label="$t('expertTuning.dailyLearning.safetyDialogConfirm')"
      @confirm="confirmSafetyOne"
    />
  </PageHeader>
</template>
