<script setup lang="ts">
import {
  AdminApiError,
  adminGetClientConfig,
  adminPatchClientConfig,
  type AdminClientConfigLink
} from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const YOUNGER_TESTS_KEY = 'younger-tests'

const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const items = ref<AdminClientConfigLink[]>([
  { key: YOUNGER_TESTS_KEY, url: '' }
])
const pending = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

const canEdit = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    error.value = t('aiAssistant.site.loadFailed')
    pending.value = false
    return
  }
  pending.value = true
  error.value = ''
  saved.value = false
  try {
    const data = await adminGetClientConfig(config.public.apiBase, token)
    items.value = ensureYoungerTests(data.items)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('aiAssistant.site.loadFailed')
  } finally {
    pending.value = false
  }
}

function ensureYoungerTests(rows: AdminClientConfigLink[]): AdminClientConfigLink[] {
  const next = rows.map(row => ({ key: row.key, url: row.url }))
  if (!next.some(row => row.key === YOUNGER_TESTS_KEY)) {
    next.unshift({ key: YOUNGER_TESTS_KEY, url: '' })
  }
  return next
}

function addRow() {
  items.value.push({ key: '', url: '' })
}

function removeRow(index: number) {
  const row = items.value[index]
  if (!row || row.key === YOUNGER_TESTS_KEY) {
    return
  }
  items.value.splice(index, 1)
}

async function save() {
  const token = readOperatorToken()
  if (!token || saving.value || !canEdit.value) {
    return
  }
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const payload = {
      items: items.value.map(row => ({
        key: row.key.trim(),
        url: row.url.trim()
      }))
    }
    const data = await adminPatchClientConfig(config.public.apiBase, token, payload)
    items.value = ensureYoungerTests(data.items)
    saved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('aiAssistant.site.saveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <PageHeader
    :title="$t('nav.aiAssistant')"
    :description="$t('aiAssistant.description')"
  >
    <AiAssistantTabs />
    <section class="rounded-xl border border-default bg-elevated p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-highlighted">
            {{ $t('aiAssistant.site.title') }}
          </h2>
          <p class="mt-2 text-sm text-muted">
            {{ $t('aiAssistant.site.hint') }}
          </p>
        </div>
        <UButton
          v-if="canEdit"
          size="sm"
          variant="soft"
          :label="$t('aiAssistant.site.addRow')"
          :disabled="pending || saving"
          data-testid="ai-assistant-site-add"
          @click="addRow"
        />
      </div>
      <p
        v-if="!canEdit"
        class="mt-3 text-sm text-muted"
      >
        {{ $t('actions.readOnly') }}
      </p>
      <p
        v-if="error"
        class="mt-3 text-sm text-error"
        data-testid="ai-assistant-site-error"
      >
        {{ error }}
      </p>
      <p
        v-else-if="saved"
        class="mt-3 text-sm text-success"
        data-testid="ai-assistant-site-saved"
      >
        {{ $t('actions.saved') }}
      </p>

      <div class="mt-4 space-y-3">
        <div
          v-for="(row, index) in items"
          :key="`${row.key}-${index}`"
          class="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end"
        >
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.site.key') }}
            </span>
            <input
              v-model="row.key"
              type="text"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 font-mono text-sm text-highlighted"
              :disabled="pending || saving || !canEdit || row.key === YOUNGER_TESTS_KEY"
              data-testid="ai-assistant-link-key"
            >
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.site.url') }}
            </span>
            <input
              v-model="row.url"
              type="url"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :placeholder="$t('aiAssistant.site.urlPlaceholder')"
              :disabled="pending || saving || !canEdit"
              data-testid="ai-assistant-link-url"
            >
          </label>
          <UButton
            v-if="canEdit && row.key !== YOUNGER_TESTS_KEY"
            size="sm"
            color="neutral"
            variant="ghost"
            :label="$t('actions.delete')"
            :disabled="pending || saving"
            @click="removeRow(index)"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          type="button"
          class="app-btn app-btn-primary"
          :disabled="pending || saving || !canEdit"
          data-testid="ai-assistant-site-save"
          @click="save"
        >
          {{ saving ? $t('aiAssistant.saving') : $t('actions.save') }}
        </button>
      </div>
      <p class="mt-2 text-xs text-dimmed">
        {{ $t('aiAssistant.site.help') }}
      </p>
    </section>
  </PageHeader>
</template>
