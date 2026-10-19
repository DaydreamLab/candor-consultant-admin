<script setup lang="ts">
import {
  AdminApiError,
  adminGetKnowledgeConfig,
  adminKnowledgeRetrievalPreview
} from '~/utils/admin-api'
import type { KnowledgeGapReason, KnowledgeRetrievalMode } from '~/types/knowledge'
import { readOperatorToken } from '~/utils/operator-session'
import { useKnowledgeDatasetGroupFilter } from '~/composables/useKnowledgeDatasetGroupFilter'
import { readConfigTopK } from '~/utils/knowledge-overview'
import {
  knowledgeGapDetailRows,
  retrievalHitDatasetLabel,
  retrievalHitIsRescue,
  retrievalHitScoreLines,
  retrievalHitSourceLabel
} from '~/utils/knowledge-retrieval-parse'

const config = useRuntimeConfig()
const { t } = useI18n()
const { filterGroup, groupSelectItems, groupQueryValue } = useKnowledgeDatasetGroupFilter()

const queryText = ref('')
const corpus = ref<'public_knowledge'>('public_knowledge')
const mode = ref<KnowledgeRetrievalMode>('hybrid')
const topK = ref<number | null>(null)
const topKSource = ref<'config' | 'fallback'>('fallback')
const pending = ref(false)
const errorMessage = ref('')
const result = ref<Awaited<ReturnType<typeof adminKnowledgeRetrievalPreview>> | null>(null)

const corpusOptions = computed(() => [
  { label: t('knowledge.retrievalPreview.corpus.public_knowledge'), value: 'public_knowledge' }
])

const modeOptions = computed(() => [
  { label: t('knowledge.retrievalPreview.mode.hybrid'), value: 'hybrid' },
  { label: t('knowledge.retrievalPreview.mode.vector'), value: 'vector' },
  { label: t('knowledge.retrievalPreview.mode.keyword'), value: 'keyword' }
])

const gapReason = computed<KnowledgeGapReason | null>(() => {
  const gap = result.value?.knowledge_gap
  const reason = gap?.reason
  if (reason === 'no_matching_hits'
    || reason === 'insufficient_multi_nutrient_hits'
    || reason === 'partial_multi_nutrient_hits') {
    return reason
  }
  return null
})

const gapPayload = computed(() => result.value?.knowledge_gap ?? null)

const gapDetailRows = computed(() => {
  const gap = gapPayload.value
  if (!gap || !isRecord(gap)) {
    return []
  }
  return knowledgeGapDetailRows(gap, reason => t(`knowledge.retrievalPreview.gap.${reason}.title`))
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

if (import.meta.client) {
  void loadConfigDefaults()
}

async function loadConfigDefaults() {
  const token = readOperatorToken()
  if (!token) {
    topK.value = 5
    topKSource.value = 'fallback'
    return
  }
  try {
    const cfg = await adminGetKnowledgeConfig(config.public.apiBase, token)
    const fromConfig = readConfigTopK(cfg)
    if (fromConfig != null) {
      topK.value = fromConfig
      topKSource.value = 'config'
      return
    }
  } catch {
    // ignore — use fallback
  }
  topK.value = 5
  topKSource.value = 'fallback'
}

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
  const filters: Record<string, unknown> = {}
  const group = groupQueryValue.value
  if (group) {
    filters.group = group
  }
  try {
    result.value = await adminKnowledgeRetrievalPreview(config.public.apiBase, token, {
      corpus: corpus.value,
      query: q,
      mode: mode.value,
      top_k: topK.value && topK.value > 0 ? topK.value : undefined,
      filters: Object.keys(filters).length ? filters : undefined
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
    plain
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
        <UFormField :label="$t('knowledge.retrievalPreview.corpusLabel')">
          <USelect
            v-model="corpus"
            :items="corpusOptions"
            value-key="value"
            label-key="label"
          />
        </UFormField>
        <UFormField :label="$t('knowledge.datasets.filterGroup')">
          <USelect
            v-model="filterGroup"
            :items="groupSelectItems"
            value-key="value"
            label-key="label"
          />
        </UFormField>
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
          <p class="mt-1 text-xs text-muted">
            {{
              topKSource === 'config'
                ? $t('knowledge.retrievalPreview.topKFromConfig')
                : $t('knowledge.retrievalPreview.topKFallback')
            }}
          </p>
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
        class="mb-4 rounded-xl border border-default bg-elevated p-3 text-sm"
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
      <div
        v-if="gapDetailRows.length"
        class="mb-4 rounded-xl border border-default bg-muted/20 p-3 text-sm"
      >
        <p class="font-medium text-highlighted">
          {{ $t('knowledge.retrievalPreview.gapDetailTitle') }}
        </p>
        <dl class="mt-2 space-y-2">
          <div
            v-for="(row, rowIndex) in gapDetailRows"
            :key="`gap-row-${rowIndex}`"
          >
            <dt class="text-xs text-muted">
              {{ $t(row.labelKey) }}
            </dt>
            <dd class="mt-0.5 whitespace-pre-wrap text-highlighted">
              {{ row.value }}
            </dd>
          </div>
        </dl>
      </div>
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
        class="rounded-xl border border-default bg-elevated p-6 text-center text-sm text-muted"
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
          class="bg-elevated"
        >
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span>#{{ index + 1 }}</span>
            <UBadge
              v-if="retrievalHitIsRescue(hit)"
              color="warning"
              variant="subtle"
              size="sm"
            >
              {{ $t('knowledge.retrievalPreview.rescueBadge') }}
            </UBadge>
            <template
              v-for="line in retrievalHitScoreLines(hit)"
              :key="line.key"
            >
              <span v-if="line.value">
                {{ $t(line.labelKey) }}: {{ line.value }}
              </span>
              <span
                v-else-if="line.missingLabelKey && !retrievalHitIsRescue(hit)"
                class="text-warning"
              >
                {{ $t(line.labelKey) }}: {{ $t(line.missingLabelKey) }}
              </span>
            </template>
            <span v-if="retrievalHitDatasetLabel(hit)">
              {{ $t('knowledge.retrievalPreview.hitDataset') }}: {{ retrievalHitDatasetLabel(hit) }}
            </span>
            <span v-if="retrievalHitSourceLabel(hit)">
              {{ $t('knowledge.retrievalPreview.hitSource') }}: {{ retrievalHitSourceLabel(hit) }}
            </span>
            <span v-if="typeof hit.heading_path === 'string' && hit.heading_path.trim()">
              {{ $t('knowledge.retrievalPreview.headingPath') }}: {{ hit.heading_path }}
            </span>
          </div>
          <p class="mt-2 text-sm whitespace-pre-wrap">
            {{ hitPreview(hit) }}
          </p>
        </UCard>
      </div>
    </template>
  </PageHeader>
</template>
