<script setup lang="ts">
import { readLlmUsage } from '~/utils/admin-api'
import {
  buildLlmUsageDetailRows,
  canShowLlmUsageTwd,
  displayTotalCostTwd,
  displayTotalCostUsd,
  formatLlmUsageCostPair,
  formatLlmUsageFxNote,
  formatLlmUsageTokens,
  hasLlmUsageDetails,
  purposeLabelOf,
  totalTokensOf,
  type LlmUsageDetailRow
} from '~/utils/llm-usage-display'

const props = defineProps<{
  usage?: Record<string, unknown> | null
  /** 截圖／示範用：掛載時展開明細 */
  defaultDetailsOpen?: boolean
  /** 截圖用：預設收合的用途 key（其餘用途展開） */
  defaultCollapsedPurposes?: string[]
}>()

const { t } = useI18n()

const summary = computed(() => readLlmUsage(props.usage ?? null))
const detailsOpen = ref(Boolean(props.defaultDetailsOpen))
/** 點擊或 defaultDetailsOpen 時釘住，避免 mouseleave 立刻收合 */
const detailsPinned = ref(Boolean(props.defaultDetailsOpen))
/** 收合中的用途列 key；預設全展開。 */
const collapsedPurposes = ref<Set<string>>(
  new Set(props.defaultCollapsedPurposes ?? [])
)

const showDetails = computed(() => hasLlmUsageDetails(summary.value))

const totalTokens = computed(() => (summary.value ? totalTokensOf(summary.value) : 0))

const showTwd = computed(() => (summary.value ? canShowLlmUsageTwd(summary.value) : false))

const totalCostLabel = computed(() => {
  if (!summary.value) {
    return 'US$0'
  }
  const usd = displayTotalCostUsd(summary.value)
  return formatLlmUsageCostPair({
    usd: usd.amount,
    twd: displayTotalCostTwd(summary.value),
    incomplete: usd.incomplete,
    showTwd: showTwd.value
  })
})

const allDetailRows = computed(() => {
  if (!summary.value) {
    return [] as LlmUsageDetailRow[]
  }
  return buildLlmUsageDetailRows(summary.value, {
    category: (category) => {
      const key = `llmUsage.categories.${category}`
      const label = t(key)
      return label === key ? category : label
    },
    model: model => model || t('llmUsage.unknownModel'),
    purpose: (purpose) => {
      const mapped = purposeLabelOf(purpose)
      if (mapped !== purpose) {
        return mapped
      }
      const key = `llmUsage.purposes.${purpose}`
      const label = t(key)
      return label === key ? purpose : label
    },
    total: t('llmUsage.tableTotal')
  })
})

const detailRows = computed(() =>
  allDetailRows.value.filter((row) => {
    if (row.kind !== 'model' || !row.purpose_key) {
      return true
    }
    return !collapsedPurposes.value.has(row.purpose_key)
  })
)

const showIncompleteNote = computed(() =>
  allDetailRows.value.some(row => row.cost_incomplete)
)

const fxNote = computed(() => {
  if (!summary.value) {
    return null
  }
  return formatLlmUsageFxNote(summary.value.fx)
})

function costCell(row: LlmUsageDetailRow): string {
  if (row.cost_unknown_label) {
    return t('llmUsage.costUnknown')
  }
  return formatLlmUsageCostPair({
    usd: row.estimated_cost_usd,
    twd: row.cost_twd,
    incomplete: row.cost_incomplete,
    showTwd: showTwd.value
  })
}

function isPurposeCollapsed(key: string): boolean {
  return collapsedPurposes.value.has(key)
}

function togglePurpose(key: string, event: Event) {
  event.preventDefault()
  event.stopPropagation()
  const next = new Set(collapsedPurposes.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  collapsedPurposes.value = next
}

function openDetails() {
  if (showDetails.value) {
    detailsOpen.value = true
  }
}

function closeDetails() {
  if (!detailsPinned.value) {
    detailsOpen.value = false
  }
}

function toggleDetails(event: Event) {
  event.preventDefault()
  event.stopPropagation()
  if (!showDetails.value) {
    return
  }
  if (detailsOpen.value && detailsPinned.value) {
    detailsPinned.value = false
    detailsOpen.value = false
    return
  }
  detailsPinned.value = true
  detailsOpen.value = true
}
</script>

<template>
  <div
    class="text-sm font-normal text-default"
    data-testid="llm-usage-summary"
    @mouseleave="closeDetails"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm text-toned">{{ t('llmUsage.title') }}</span>
      <span
        v-if="showDetails"
        role="button"
        tabindex="0"
        class="inline-flex h-[18px] w-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary text-[11px] font-bold leading-none text-primary select-none"
        :class="detailsOpen ? 'bg-primary text-white' : 'bg-transparent'"
        :aria-expanded="detailsOpen"
        :aria-label="t('llmUsage.detailsToggle')"
        data-testid="llm-usage-info"
        @click="toggleDetails"
        @mouseenter="openDetails"
        @keydown.enter.prevent="toggleDetails"
        @keydown.space.prevent="toggleDetails"
      >i</span>
    </div>

    <div
      class="mt-2.5 flex flex-wrap gap-7"
      data-testid="llm-usage-total"
    >
      <div>
        <span class="block text-xs text-muted">{{ t('llmUsage.totalTokens') }}</span>
        <span class="text-xl font-semibold tabular-nums text-highlighted">{{ formatLlmUsageTokens(totalTokens) }}</span>
      </div>
      <div>
        <span class="block text-xs text-muted">{{ t('llmUsage.estimatedCost') }}</span>
        <span
          class="text-xl font-semibold tabular-nums text-highlighted"
          data-testid="llm-usage-total-cost"
        >{{ totalCostLabel }}</span>
      </div>
    </div>

    <div
      v-if="detailsOpen && showDetails"
      class="mt-3 w-max min-w-[34rem] max-w-[min(100vw-2rem,48rem)] rounded-lg border border-primary/30 bg-default p-3 shadow-lg"
      data-testid="llm-usage-details"
      @click.stop
      @mouseenter="openDetails"
    >
      <table class="w-full border-collapse text-[12.5px]">
        <thead>
          <tr class="text-muted">
            <th class="border-b border-default px-1.5 py-1.5 text-left font-medium">
              {{ t('llmUsage.colCategoryModel') }}
            </th>
            <th class="border-b border-default px-1.5 py-1.5 text-right font-medium">
              {{ t('llmUsage.colInput') }}
            </th>
            <th class="border-b border-default px-1.5 py-1.5 text-right font-medium">
              {{ t('llmUsage.colOutput') }}
            </th>
            <th class="border-b border-default px-1.5 py-1.5 text-right font-medium">
              {{ t('llmUsage.colCacheRead') }}
            </th>
            <th class="border-b border-default px-1.5 py-1.5 text-right font-medium">
              {{ t('llmUsage.colCacheWrite') }}
            </th>
            <th class="border-b border-default px-1.5 py-1.5 text-right font-medium">
              {{ t('llmUsage.colCost') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in detailRows"
            :key="row.key"
            :data-testid="row.kind === 'total'
              ? 'llm-usage-detail-total'
              : row.kind === 'group'
                ? 'llm-usage-detail-group'
                : row.kind === 'purpose'
                  ? 'llm-usage-detail-purpose'
                  : 'llm-usage-detail-model'"
            :data-purpose-key="row.purpose_key || undefined"
            :class="{
              'bg-primary/10 font-semibold': row.kind === 'group',
              'bg-muted/40 font-medium': row.kind === 'purpose',
              'font-bold border-t-2 border-default': row.kind === 'total'
            }"
          >
            <td
              class="border-b border-muted/40 px-1.5 py-1.5"
              :class="{
                'ps-4 font-normal text-toned': row.kind === 'model' && !row.purpose_key,
                'ps-8 font-normal text-toned': row.kind === 'model' && row.purpose_key,
                'ps-4': row.kind === 'purpose'
              }"
            >
              <button
                v-if="row.kind === 'purpose' && row.purpose_key"
                type="button"
                class="inline-flex items-center gap-1 text-left"
                :aria-expanded="!isPurposeCollapsed(row.purpose_key)"
                data-testid="llm-usage-purpose-toggle"
                @click="togglePurpose(row.purpose_key, $event)"
              >
                <span
                  class="inline-block w-3 text-[10px] text-muted"
                  aria-hidden="true"
                >{{ isPurposeCollapsed(row.purpose_key) ? '▸' : '▾' }}</span>
                <span>{{ row.label }}</span>
              </button>
              <template v-else>
                {{ row.label }}
              </template>
            </td>
            <td class="border-b border-muted/40 px-1.5 py-1.5 text-right tabular-nums">
              {{ formatLlmUsageTokens(row.input_tokens) }}
            </td>
            <td class="border-b border-muted/40 px-1.5 py-1.5 text-right tabular-nums">
              {{ formatLlmUsageTokens(row.output_tokens) }}
            </td>
            <td class="border-b border-muted/40 px-1.5 py-1.5 text-right tabular-nums">
              {{ formatLlmUsageTokens(row.cache_read_tokens) }}
            </td>
            <td class="border-b border-muted/40 px-1.5 py-1.5 text-right tabular-nums">
              {{ formatLlmUsageTokens(row.cache_write_tokens) }}
            </td>
            <td
              class="border-b border-muted/40 px-1.5 py-1.5 text-right tabular-nums"
              :class="row.cost_unknown_label ? 'text-warning' : ''"
            >
              {{ costCell(row) }}
            </td>
          </tr>
        </tbody>
      </table>
      <p
        v-if="showIncompleteNote"
        class="mt-2 text-[11.5px] text-muted"
        data-testid="llm-usage-incomplete-note"
      >
        {{ t('llmUsage.incompleteNote') }}
      </p>
      <p
        v-if="fxNote"
        class="mt-1 text-[11.5px] text-muted"
        data-testid="llm-usage-fx-note"
      >
        {{ t('llmUsage.fxNote', {
          rate: fxNote.rate,
          date: fxNote.date || '—',
          source: fxNote.source || '—'
        }) }}
      </p>
    </div>
  </div>
</template>
