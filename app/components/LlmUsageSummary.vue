<script setup lang="ts">
const props = defineProps<{
  usage?: Record<string, unknown> | null
}>()

const { t } = useI18n()

function asInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value))
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Math.max(0, Math.trunc(Number(value)))
  }
  return 0
}

function costText(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toFixed(4)
  }
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value)
    if (Number.isFinite(n)) {
      return n.toFixed(4)
    }
    return value.trim()
  }
  return '0.0000'
}

const inputTokens = computed(() => asInt(props.usage?.input_tokens))
const outputTokens = computed(() => asInt(props.usage?.output_tokens))
const costUsd = computed(() => costText(props.usage?.estimated_cost_usd))
</script>

<template>
  <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
    <span>
      {{ t('llmUsage.input') }}:
      <span class="tabular-nums text-highlighted">{{ t('llmUsage.tokens', { n: inputTokens }) }}</span>
    </span>
    <span>
      {{ t('llmUsage.output') }}:
      <span class="tabular-nums text-highlighted">{{ t('llmUsage.tokens', { n: outputTokens }) }}</span>
    </span>
    <span>
      {{ t('llmUsage.cost') }}:
      <span class="tabular-nums text-highlighted">{{ t('llmUsage.usd', { amount: costUsd }) }}</span>
    </span>
  </div>
</template>
