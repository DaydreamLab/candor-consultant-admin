<script setup lang="ts">
import { readLlmUsage } from '~/utils/admin-api'
import {
  buildLlmUsageDetailRows,
  displayTotalCostUsd,
  formatLlmUsageTokens,
  formatLlmUsageUsd,
  hasLlmUsageDetails,
  totalTokensOf
} from '~/utils/llm-usage-display'

const props = defineProps<{
  usage?: Record<string, unknown> | null
  /** 截圖／示範用：掛載時展開明細 */
  defaultDetailsOpen?: boolean
}>()

const { t } = useI18n()

const summary = computed(() => readLlmUsage(props.usage ?? null))
const detailsOpen = ref(Boolean(props.defaultDetailsOpen))
/** 點擊或 defaultDetailsOpen 時釘住，避免 mouseleave 立刻收合 */
const detailsPinned = ref(Boolean(props.defaultDetailsOpen))

const showDetails = computed(() => hasLlmUsageDetails(summary.value))

const totalTokens = computed(() => (summary.value ? totalTokensOf(summary.value) : 0))

const totalCost = computed(() => {
  if (!summary.value) {
    return { amount: '0.0000' as string | null, incomplete: false }
  }
  return displayTotalCostUsd(summary.value)
})

const totalCostLabel = computed(() => {
  const formatted = formatLlmUsageUsd(totalCost.value.amount, totalCost.value.incomplete)
  if (formatted) {
    return formatted
  }
  return totalCost.value.incomplete ? '*' : 'US$0'
})

const detailRows = computed(() => {
  if (!summary.value) {
    return []
  }
  return buildLlmUsageDetailRows(summary.value, {
    category: (category) => {
      const key = `llmUsage.categories.${category}`
      const label = t(key)
      return label === key ? category : label
    },
    model: model => model || t('llmUsage.unknownModel'),
    total: t('llmUsage.tableTotal')
  })
})

const showIncompleteNote = computed(() =>
  detailRows.value.some(row => row.cost_incomplete)
)

function costCell(row: { cost_unknown_label: boolean, estimated_cost_usd: string | null, cost_incomplete: boolean }): string {
  if (row.cost_unknown_label) {
    return t('llmUsage.costUnknown')
  }
  return formatLlmUsageUsd(row.estimated_cost_usd, row.cost_incomplete) ?? '—'
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
      class="mt-3 w-max min-w-[34rem] max-w-[min(100vw-2rem,40rem)] rounded-lg border border-primary/30 bg-default p-3 shadow-lg"
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
            :data-testid="row.kind === 'total' ? 'llm-usage-detail-total' : row.kind === 'group' ? 'llm-usage-detail-group' : 'llm-usage-detail-model'"
            :class="{
              'bg-primary/10 font-semibold': row.kind === 'group',
              'font-bold border-t-2 border-default': row.kind === 'total'
            }"
          >
            <td
              class="border-b border-muted/40 px-1.5 py-1.5"
              :class="row.kind === 'model' ? 'ps-4 font-normal text-toned' : ''"
            >
              {{ row.label }}
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
    </div>
  </div>
</template>
