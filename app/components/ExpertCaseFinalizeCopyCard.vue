<script setup lang="ts">
import {
  AdminApiError,
  adminGenerateExpertCaseFinalizeCopy
} from '~/utils/admin-api'
import {
  isExpertFinalizeCopyMockEnabled,
  isFinalizeCopyDirty,
  mockGenerateExpertFinalizeCopy
} from '~/utils/expert-finalize-copy'
import { readOperatorToken } from '~/utils/operator-session'

const props = defineProps<{
  caseId: string
  /** When true, card is read-only locked (reviewed). */
  locked: boolean
  reportHighlights: string
  expertOpinion: string
}>()

const emit = defineEmits<{
  'update:reportHighlights': [value: string]
  'update:expertOpinion': [value: string]
  'generatingChange': [value: boolean]
}>()

const config = useRuntimeConfig()
const { t } = useI18n()
const feedback = useOpsFeedback()

const generating = ref(false)
const cacheHitChip = ref(false)
const baselineHighlights = ref('')
const baselineOpinion = ref('')
const overwriteOpen = ref(false)
const hasDraft = computed(() => {
  return Boolean(props.reportHighlights.trim() || props.expertOpinion.trim())
})

const dirty = computed(() => {
  if (!hasDraft.value || props.locked) {
    return false
  }
  return isFinalizeCopyDirty(
    props.reportHighlights,
    props.expertOpinion,
    baselineHighlights.value,
    baselineOpinion.value
  )
})

const ledeKey = computed(() => {
  if (props.locked) {
    return 'expertCaseReviews.finalizeCopyLedeLocked'
  }
  if (generating.value) {
    return 'expertCaseReviews.finalizeCopyLedeGenerating'
  }
  if (hasDraft.value) {
    return 'expertCaseReviews.finalizeCopyLedeDraft'
  }
  return 'expertCaseReviews.finalizeCopyLedeEmpty'
})

watch(generating, (value) => {
  emit('generatingChange', value)
})

function applyDraft(reportHighlights: string, expertOpinion: string, cacheHit: boolean) {
  emit('update:reportHighlights', reportHighlights)
  emit('update:expertOpinion', expertOpinion)
  baselineHighlights.value = reportHighlights
  baselineOpinion.value = expertOpinion
  cacheHitChip.value = cacheHit
}

async function runGenerate(force: boolean) {
  if (props.locked || generating.value || !props.caseId) {
    return
  }
  generating.value = true
  cacheHitChip.value = false
  try {
    if (isExpertFinalizeCopyMockEnabled()) {
      const mock = mockGenerateExpertFinalizeCopy(props.caseId, force)
      // Brief delay so skeleton state is visible in mock demos.
      await new Promise(resolve => setTimeout(resolve, 350))
      applyDraft(mock.report_highlights, mock.expert_opinion, mock.cache_hit)
      return
    }
    const token = readOperatorToken()
    if (!token) {
      throw new AdminApiError(401, '')
    }
    const data = await adminGenerateExpertCaseFinalizeCopy(
      config.public.apiBase,
      token,
      props.caseId,
      { force }
    )
    // cache_hit → soft chip only; never toast
    applyDraft(data.report_highlights, data.expert_opinion, data.cache_hit)
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('expertCaseReviews.finalizeCopyGenerateFailed'),
      color: 'error'
    })
  } finally {
    generating.value = false
  }
}

function onGenerateClick() {
  void runGenerate(false)
}

function onRegenerateClick() {
  if (dirty.value) {
    overwriteOpen.value = true
    return
  }
  void runGenerate(true)
}

function confirmOverwrite() {
  overwriteOpen.value = false
  void runGenerate(true)
}

function onHighlightsInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  emit('update:reportHighlights', target?.value ?? '')
  cacheHitChip.value = false
}

function onOpinionInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  emit('update:expertOpinion', target?.value ?? '')
  cacheHitChip.value = false
}

/**
 * Hydrate baseline from parent (GET detail / locked fields) once content
 * arrives without a local generate — so dirty tracking starts clean.
 */
watch(
  () => [props.reportHighlights, props.expertOpinion] as const,
  ([highlights, opinion]) => {
    if (!baselineHighlights.value && !baselineOpinion.value && (highlights || opinion)) {
      baselineHighlights.value = highlights
      baselineOpinion.value = opinion
    }
  },
  { immediate: true }
)
</script>

<template>
  <section
    class="mb-8 rounded-xl border border-default bg-elevated p-4"
    :class="{ 'bg-default/40': locked }"
    data-testid="expert-case-finalize-copy"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 flex-1">
        <h2 class="flex flex-wrap items-center gap-2 text-lg font-semibold text-highlighted">
          <span>{{ $t('expertCaseReviews.finalizeCopyTitle') }}</span>
          <UBadge
            v-if="locked"
            color="success"
            variant="subtle"
            data-testid="expert-case-finalize-copy-locked-chip"
          >
            {{ $t('expertCaseReviews.finalizeCopyLockedChip') }}
          </UBadge>
          <UBadge
            v-else-if="cacheHitChip && hasDraft && !generating"
            color="info"
            variant="subtle"
            data-testid="expert-case-finalize-copy-cache-chip"
          >
            {{ $t('expertCaseReviews.finalizeCopyCacheChip') }}
          </UBadge>
          <UIcon
            v-if="locked"
            name="i-lucide-lock"
            class="size-4 text-warning"
            data-testid="expert-case-finalize-copy-lock-icon"
          />
        </h2>
        <p class="mt-1 max-w-3xl text-xs text-muted">
          {{ $t(ledeKey) }}
        </p>
      </div>
      <div
        v-if="!locked"
        class="flex shrink-0 items-center gap-2"
      >
        <UButton
          v-if="!hasDraft || generating"
          color="primary"
          :loading="generating"
          :disabled="generating"
          data-testid="expert-case-finalize-copy-generate"
          @click="onGenerateClick"
        >
          {{ generating
            ? $t('expertCaseReviews.finalizeCopyGenerating')
            : $t('expertCaseReviews.finalizeCopyGenerate') }}
        </UButton>
        <UButton
          v-else
          color="neutral"
          variant="outline"
          :disabled="generating"
          data-testid="expert-case-finalize-copy-regenerate"
          @click="onRegenerateClick"
        >
          {{ $t('expertCaseReviews.finalizeCopyRegenerate') }}
        </UButton>
      </div>
    </div>

    <!-- Generating skeletons -->
    <template v-if="generating">
      <div
        class="mt-4 rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-skel-report"
      >
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('expertCaseReviews.finalizeCopyReportTitle') }}
        </h3>
        <div class="mt-3 space-y-2">
          <div class="h-3 w-[90%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[70%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[55%] animate-pulse rounded bg-default" />
        </div>
      </div>
      <div
        class="mt-3 min-h-[220px] rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-skel-opinion"
      >
        <h3 class="text-sm font-semibold text-highlighted">
          {{ $t('expertCaseReviews.finalizeCopyOpinionTitle') }}
        </h3>
        <div class="mt-3 space-y-2">
          <div class="h-3 w-[90%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[90%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[70%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[55%] animate-pulse rounded bg-default" />
          <div class="h-3 w-[40%] animate-pulse rounded bg-default" />
        </div>
      </div>
    </template>

    <!-- Locked read-only preview -->
    <template v-else-if="locked">
      <div
        class="mt-4 rounded-lg border border-default bg-default/30 p-3"
        data-testid="expert-case-finalize-copy-locked-report"
      >
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyReportTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopyReadonly') }}
          </span>
        </div>
        <MarkdownPreview
          v-if="reportHighlights.trim()"
          :source="reportHighlights"
        />
        <p
          v-else
          class="text-sm text-muted"
        >
          {{ $t('expertCaseReviews.finalizeCopyLockedEmpty') }}
        </p>
      </div>
      <div
        class="mt-3 min-h-[160px] rounded-lg border border-default bg-default/30 p-3"
        data-testid="expert-case-finalize-copy-locked-opinion"
      >
        <div class="mb-2 flex flex-wrap items-center gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyOpinionTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopyReadonly') }}
          </span>
        </div>
        <MarkdownPreview
          v-if="expertOpinion.trim()"
          :source="expertOpinion"
        />
        <p
          v-else
          class="text-sm text-muted"
        >
          {{ $t('expertCaseReviews.finalizeCopyLockedEmpty') }}
        </p>
      </div>
    </template>

    <!-- Empty placeholders -->
    <template v-else-if="!hasDraft">
      <div
        class="mt-4 rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-empty-report"
      >
        <div class="mb-2 flex flex-wrap items-baseline gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyReportTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopyReportHint') }}
          </span>
        </div>
        <div
          class="min-h-[120px] rounded-lg border border-dashed border-muted bg-default/40 px-4 py-4 text-xs text-muted"
        >
          {{ $t('expertCaseReviews.finalizeCopyReportPlaceholder') }}
        </div>
      </div>
      <div
        class="mt-3 rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-empty-opinion"
      >
        <div class="mb-2 flex flex-wrap items-baseline gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyOpinionTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopyOpinionHint') }}
          </span>
        </div>
        <div
          class="min-h-[220px] rounded-lg border border-dashed border-muted bg-default/40 px-4 py-4 text-xs text-muted"
        >
          {{ $t('expertCaseReviews.finalizeCopyOpinionPlaceholder') }}
        </div>
      </div>
    </template>

    <!-- Draft: side-by-side MD edit / preview -->
    <template v-else>
      <div
        class="mt-4 rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-draft-report"
      >
        <div class="mb-2 flex flex-wrap items-baseline gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyReportTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopySplitHint') }}
          </span>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default">
            <div class="border-b border-default bg-default/40 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              {{ $t('expertCaseReviews.finalizeCopyEditPane') }}
            </div>
            <textarea
              class="min-h-[120px] flex-1 resize-y bg-elevated px-3 py-2 font-mono text-xs leading-relaxed text-highlighted outline-none"
              :value="reportHighlights"
              data-testid="expert-case-finalize-copy-report-textarea"
              @input="onHighlightsInput"
            />
          </div>
          <div class="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default">
            <div class="border-b border-default bg-default/40 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              {{ $t('expertCaseReviews.finalizeCopyPreviewPane') }}
            </div>
            <div class="min-h-[120px] flex-1 bg-elevated px-3 py-2">
              <MarkdownPreview :source="reportHighlights" />
            </div>
          </div>
        </div>
      </div>
      <div
        class="mt-3 rounded-lg border border-default p-3"
        data-testid="expert-case-finalize-copy-draft-opinion"
      >
        <div class="mb-2 flex flex-wrap items-baseline gap-2">
          <h3 class="text-sm font-semibold text-highlighted">
            {{ $t('expertCaseReviews.finalizeCopyOpinionTitle') }}
          </h3>
          <span class="text-[11px] text-muted">
            {{ $t('expertCaseReviews.finalizeCopyOpinionEditHint') }}
          </span>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div class="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default">
            <div class="border-b border-default bg-default/40 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              {{ $t('expertCaseReviews.finalizeCopyEditPane') }}
            </div>
            <textarea
              class="min-h-[220px] flex-1 resize-y bg-elevated px-3 py-2 font-mono text-xs leading-relaxed text-highlighted outline-none"
              :value="expertOpinion"
              data-testid="expert-case-finalize-copy-opinion-textarea"
              @input="onOpinionInput"
            />
          </div>
          <div class="flex min-w-0 flex-col overflow-hidden rounded-lg border border-default">
            <div class="border-b border-default bg-default/40 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
              {{ $t('expertCaseReviews.finalizeCopyPreviewPane') }}
            </div>
            <div class="min-h-[220px] flex-1 bg-elevated px-3 py-2">
              <MarkdownPreview :source="expertOpinion" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <UModal
      v-model:open="overwriteOpen"
      :title="$t('expertCaseReviews.finalizeCopyOverwriteTitle')"
      :description="$t('expertCaseReviews.finalizeCopyOverwriteBody')"
      :ui="{ footer: 'justify-end gap-2' }"
    >
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          data-testid="expert-case-finalize-copy-overwrite-cancel"
          @click="close()"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          color="error"
          data-testid="expert-case-finalize-copy-overwrite-confirm"
          @click="confirmOverwrite"
        >
          {{ $t('expertCaseReviews.finalizeCopyOverwriteConfirm') }}
        </UButton>
      </template>
    </UModal>
  </section>
</template>
