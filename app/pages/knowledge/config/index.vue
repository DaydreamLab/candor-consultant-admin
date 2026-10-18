<script setup lang="ts">
import { AdminApiError, adminGetKnowledgeConfig } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'
import { readConfigTopK } from '~/utils/knowledge-overview'
import { buildKnowledgeConfigSections } from '~/utils/knowledge-config-display'

const config = useRuntimeConfig()
const { t } = useI18n()

const settings = ref<Record<string, unknown> | null>(null)
const pending = ref(true)
const errorMessage = ref('')

const sections = computed(() => {
  if (!settings.value) {
    return []
  }
  return buildKnowledgeConfigSections(settings.value)
})

const configTopK = computed(() => readConfigTopK(settings.value))

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    settings.value = null
    errorMessage.value = t('knowledge.config.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    settings.value = await adminGetKnowledgeConfig(config.public.apiBase, token)
  } catch (error) {
    settings.value = null
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('knowledge.config.failed')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <PageHeader
    :title="$t('knowledge.config.title')"
    :description="$t('knowledge.config.subtitle')"
    plain
  >
    <KnowledgeTabs />

    <p
      v-if="configTopK != null"
      class="mb-4 text-sm text-muted"
    >
      {{ $t('knowledge.config.topKHint', { value: configTopK }) }}
    </p>

    <p
      v-if="pending"
      class="text-sm text-muted"
    >
      {{ $t('knowledge.config.loading') }}
    </p>
    <p
      v-else-if="errorMessage"
      class="text-sm text-error"
    >
      {{ errorMessage }}
    </p>
    <EmptyPanel
      v-else-if="!sections.length"
      :title="$t('knowledge.config.emptyTitle')"
      :description="$t('knowledge.config.empty')"
    />
    <div
      v-else
      class="grid max-w-3xl gap-4"
    >
      <UCard
        v-for="section in sections"
        :key="section.id"
        class="bg-elevated"
      >
        <template #header>
          <h2 class="text-sm font-semibold">
            {{ $t(section.titleKey) }}
          </h2>
        </template>
        <dl class="divide-y divide-default">
          <div
            v-for="row in section.rows"
            :key="`${section.id}-${row.key}`"
            class="grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[10rem_1fr]"
          >
            <dt class="text-sm font-medium">
              {{ row.labelKey === 'knowledge.config.fields.unknown.label' ? row.key : $t(row.labelKey) }}
            </dt>
            <dd class="text-sm">
              <p class="text-muted text-xs mb-1">
                {{ $t(row.descKey, { key: row.key }) }}
              </p>
              <p
                class="break-all font-mono text-xs whitespace-pre-wrap"
                :class="typeof row.value === 'object' ? 'rounded-lg bg-muted/30 p-2' : ''"
              >
                {{ row.display }}
              </p>
            </dd>
          </div>
        </dl>
      </UCard>
    </div>
  </PageHeader>
</template>
