<script setup lang="ts">
import { readLlmUsage } from '~/utils/admin-api'

const props = defineProps<{
  usage?: Record<string, unknown> | null
}>()

const { t } = useI18n()

const summary = computed(() => readLlmUsage(props.usage ?? null))

const inputTokens = computed(() => summary.value?.input_tokens ?? 0)
const outputTokens = computed(() => summary.value?.output_tokens ?? 0)
const costNtd = computed(() => summary.value?.estimated_cost_ntd ?? '0.00')
const costUsd = computed(() => summary.value?.estimated_cost_usd ?? '0.0000')
const byModel = computed(() => summary.value?.by_model ?? [])

function modelLabel(model: string): string {
  return model || t('llmUsage.unknownModel')
}
</script>

<template>
  <div
    class="flex flex-col gap-1 text-sm font-normal text-muted"
    data-testid="llm-usage-summary"
  >
    <div
      v-for="(row, index) in byModel"
      :key="`${row.model}-${index}`"
      class="flex flex-wrap items-center gap-x-3 gap-y-1"
      data-testid="llm-usage-by-model"
    >
      <span class="font-medium text-highlighted">{{ modelLabel(row.model) }}</span>
      <span>
        {{ t('llmUsage.input') }}:
        <span class="tabular-nums">{{ t('llmUsage.tokens', { n: row.input_tokens }) }}</span>
      </span>
      <span>
        {{ t('llmUsage.output') }}:
        <span class="tabular-nums">{{ t('llmUsage.tokens', { n: row.output_tokens }) }}</span>
      </span>
      <span>
        {{ t('llmUsage.cost') }}:
        <span class="tabular-nums">{{ t('llmUsage.ntd', { amount: row.estimated_cost_ntd }) }} ({{ t('llmUsage.usd', { amount: row.estimated_cost_usd }) }})</span>
      </span>
    </div>
    <div
      class="flex flex-wrap items-center gap-x-3 gap-y-1"
      data-testid="llm-usage-total"
    >
      <span
        v-if="byModel.length"
        class="font-medium text-highlighted"
      >{{ t('llmUsage.total') }}</span>
      <span>
        {{ t('llmUsage.input') }}:
        <span class="tabular-nums">{{ t('llmUsage.tokens', { n: inputTokens }) }}</span>
      </span>
      <span>
        {{ t('llmUsage.output') }}:
        <span class="tabular-nums">{{ t('llmUsage.tokens', { n: outputTokens }) }}</span>
      </span>
      <span>
        {{ t('llmUsage.cost') }}:
        <span class="tabular-nums">{{ t('llmUsage.ntd', { amount: costNtd }) }} ({{ t('llmUsage.usd', { amount: costUsd }) }})</span>
      </span>
    </div>
  </div>
</template>
