<script setup lang="ts">
import { AdminApiError, adminKnowledgeRetrievalPreview } from '~/utils/admin-api'
import type { KnowledgeGapReason, KnowledgeRetrievalMode } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'

const config = useRuntimeConfig()
const { t } = useI18n()

const queryText = ref('')
const mode = ref<KnowledgeRetrievalMode>('hybrid')
const topK = ref<number | null>(10)
const pending = ref(false)
const errorMessage = ref('')
const result = ref<Awaited<ReturnType<typeof adminKnowledgeRetrievalPreview>> | null>(null)

const modeOptions = computed(() => [
  { label: t('knowledge.retrievalPreview.mode.hybrid'), value: 'hybrid' },
  { label: t('knowledge.retrievalPreview.mode.vector'), value: 'vector' },
  { label: t('knowledge.retrievalPreview.mode.keyword'), value: 'keyword' }
])

const gapReason = computed<KnowledgeGapReason | null>(() => {
  const reason = result.value?.knowledge_gap?.reason
  if (reason === 'no_matching_hits'
    || reason === 'insufficient_multi_nutrient_hits'
    || reason === 'partial_multi_nutrient_hits') {
    return reason
  }
  return null
})

const detectedNutrients = computed(() => {
  const info = result.value?.query_info
  if (!info || !Array.isArray(info.detected_nutrients)) {
    return [] as unknown[]
  }
  return info.detected_nutrients
})

const showBComplexPartialHint = computed(() => {
  if (gapReason.value !== 'partial_multi_nutrient_hits') {
    return false
  }
  const q = queryText.value.toLowerCase()
  if (q.includes('b群') || q.includes('維生素b') || q.includes('vitamin b')) {
    return true
  }
  return detectedNutrients.value.some((item) => {
    const text = typeof item === 'string'
      ? item
      : isRecord(item)
        ? JSON.stringify(item)
        : ''
    const lower = text.toLowerCase()
    return lower.includes('b_complex') || lower.includes('vitamin_b') || lower.includes('b6')
  })
})

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function nutrientLabel(item: unknown) {
  if (typeof item === 'string') {
    return item
  }
  if (isRecord(item)) {
    const key = item.nutrient_key ?? item.key ?? item.code
    const name = item.name ?? item.label
    if (typeof key === 'string' && typeof name === 'string') {
      return `${name} (${key})`
    }
    if (typeof key === 'string') {
      return key
    }
    if (typeof name === 'string') {
      return name
    }
  }
  return String(item ?? '')
}

async function runPreview() {
  const token = readOperatorToken()
  const q = queryText.value.trim()
  if (!token || !q || pending.value) {
    return
  }
  pending.value = true
  errorMessage.value = ''
  result.value = null
  try {
    result.value = await adminKnowledgeRetrievalPreview(config.public.apiBase, token, {
      corpus: 'public_knowledge',
      query: q,
      mode: mode.value,
      top_k: topK.value && topK.value > 0 ? topK.value : undefined
    })
  } catch (error) {
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.retrievalPreview.failed')
  } finally {
    pending.value = false
  }
}

function hitPreview(row: Record<string, unknown>) {
  const text = row.text_preview ?? row.text ?? row.content
  if (typeof text === 'string') {
    return text.length > 280 ? `${text.slice(0, 280)}…` : text
  }
  return '—'
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.retrievalPreview.title')"
    :description="$t('knowledge.retrievalPreview.subtitle')"
  >
    <KnowledgeTabs />

    <form
      class="mb-6 grid max-w-2xl gap-4"
      @submit.prevent="runPreview"
    >
      <UFormField
        :label="$t('knowledge.retrievalPreview.query')"
        required
      >
        <UTextarea
          v-model="queryText"
          :rows="3"
        />
      </UFormField>
      <div class="grid gap-4 sm:grid-cols-2">
        <UFormField :label="$t('knowledge.retrievalPreview.modeLabel')">
          <USelect
            v-model="mode"
            :items="modeOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>
        <UFormField :label="$t('knowledge.retrievalPreview.topK')">
          <UInput
            v-model.number="topK"
            type="number"
            min="1"
          />
        </UFormField>
      </div>
      <UButton
        type="submit"
        :loading="pending"
      >
        {{ $t('knowledge.retrievalPreview.run') }}
      </UButton>
    </form>

    <p
      v-if="errorMessage"
      class="mb-4 text-sm text-error"
    >
      {{ errorMessage }}
    </p>

    <template v-if="result">
      <div
        v-if="detectedNutrients.length"
        class="mb-4 rounded-lg border border-default bg-muted/20 p-3 text-sm"
      >
        <p class="font-medium">
          {{ $t('knowledge.retrievalPreview.detectedNutrients') }}
        </p>
        <ul class="mt-1 list-disc pl-5 text-muted">
          <li
            v-for="(item, index) in detectedNutrients"
            :key="`nutrient-${index}`"
          >
            {{ nutrientLabel(item) }}
          </li>
        </ul>
      </div>

      <UAlert
        v-if="gapReason"
        color="warning"
        variant="subtle"
        class="mb-4"
        :title="$t(`knowledge.retrievalPreview.gap.${gapReason}.title`)"
        :description="$t(`knowledge.retrievalPreview.gap.${gapReason}.body`)"
      />
      <UAlert
        v-if="showBComplexPartialHint"
        color="warning"
        variant="outline"
        class="mb-4"
        :title="$t('knowledge.retrievalPreview.gap.partialBComplex.title')"
        :description="$t('knowledge.retrievalPreview.gap.partialBComplex.body')"
      />

      <p
        v-if="!result.hits.length"
        class="text-sm text-muted"
      >
        {{ $t('knowledge.retrievalPreview.noHits') }}
      </p>
      <div
        v-else
        class="space-y-3"
      >
        <UCard
          v-for="(hit, index) in result.hits"
          :key="String(hit.id ?? hit.chunk_id ?? index)"
        >
          <p class="text-xs text-muted">
            #{{ index + 1 }}
            <span v-if="hit.dataset_code"> · {{ hit.dataset_code }}</span>
          </p>
          <p class="mt-2 text-sm whitespace-pre-wrap">
            {{ hitPreview(hit) }}
          </p>
        </UCard>
      </div>
    </template>
  </PageHeader>
</template>
