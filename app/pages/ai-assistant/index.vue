<script setup lang="ts">
import {
  AdminApiError,
  adminListConversationCopies,
  adminPatchConversationCopy,
  type AdminConversationCopy
} from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const items = ref<AdminConversationCopy[]>([])
const pending = ref(true)
const error = ref('')
const slideoverOpen = ref(false)
const editing = ref<AdminConversationCopy | null>(null)
const draftZh = ref('')
const draftEn = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const canEdit = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

const categories = ['greeting', 'option', 'prompt'] as const

const grouped = computed(() =>
  categories.map(category => ({
    category,
    items: items.value.filter(row => row.category === category)
  }))
)

if (import.meta.client) {
  void load()
}

async function load() {
  const token = readOperatorToken()
  if (!token) {
    error.value = t('aiAssistant.loadFailed')
    pending.value = false
    return
  }
  pending.value = true
  error.value = ''
  try {
    items.value = await adminListConversationCopies(config.public.apiBase, token)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('aiAssistant.loadFailed')
  } finally {
    pending.value = false
  }
}

function openEdit(row: AdminConversationCopy) {
  editing.value = row
  draftZh.value = row.text_zh
  draftEn.value = row.text_en
  saveError.value = ''
  saved.value = false
  slideoverOpen.value = true
}

async function save() {
  const token = readOperatorToken()
  const row = editing.value
  if (!token || !row || saving.value || !canEdit.value) {
    return
  }
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    const updated = await adminPatchConversationCopy(config.public.apiBase, token, row.code, {
      text_zh: draftZh.value,
      text_en: draftEn.value
    })
    items.value = items.value.map(item => (item.code === updated.code ? updated : item))
    editing.value = updated
    saved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    saveError.value = message || t('aiAssistant.saveFailed')
  } finally {
    saving.value = false
  }
}

function preview(text: string) {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= 36) {
    return oneLine
  }
  return `${oneLine.slice(0, 36)}…`
}
</script>

<template>
  <PageHeader
    :title="$t('nav.aiAssistant')"
    :description="$t('aiAssistant.description')"
  >
    <AiAssistantTabs />
    <p
      v-if="error"
      class="mb-4 text-sm text-error"
      data-testid="ai-assistant-copies-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="pending"
      class="mb-4 text-sm text-muted"
    >
      {{ $t('aiAssistant.loading') }}
    </p>
    <div
      v-else-if="!items.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('table.empty') }}
    </div>
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <section
        v-for="group in grouped"
        :key="group.category"
        class="rounded-xl border border-default bg-elevated p-4"
      >
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t(`aiAssistant.categories.${group.category}`) }}
        </h2>
        <p class="mt-1 text-xs text-dimmed">
          {{ $t(`aiAssistant.categoryHints.${group.category}`) }}
        </p>
        <ul class="mt-3 divide-y divide-default">
          <li
            v-for="row in group.items"
            :key="row.code"
            class="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0"
          >
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-highlighted">
                {{ row.code }}
              </p>
              <p class="truncate text-xs text-muted">
                {{ preview(row.text_zh) }}
              </p>
            </div>
            <UButton
              size="sm"
              variant="ghost"
              :label="$t('actions.edit')"
              data-testid="ai-assistant-copy-edit"
              @click="openEdit(row)"
            />
          </li>
          <li
            v-if="!group.items.length"
            class="py-4 text-sm text-muted"
          >
            {{ $t('table.empty') }}
          </li>
        </ul>
      </section>
    </div>

    <USlideover
      v-model:open="slideoverOpen"
      :title="editing?.code ?? $t('actions.edit')"
    >
      <template #body>
        <div class="flex flex-col gap-4 p-1">
          <p
            v-if="!canEdit"
            class="text-sm text-muted"
          >
            {{ $t('actions.readOnly') }}
          </p>
          <p
            v-if="saveError"
            class="text-sm text-error"
          >
            {{ saveError }}
          </p>
          <p
            v-else-if="saved"
            class="text-sm text-success"
          >
            {{ $t('actions.saved') }}
          </p>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.fields.textZh') }}
            </span>
            <textarea
              v-model="draftZh"
              rows="10"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
              data-testid="ai-assistant-copy-zh"
            />
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.fields.textEn') }}
            </span>
            <textarea
              v-model="draftEn"
              rows="10"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
              data-testid="ai-assistant-copy-en"
            />
          </label>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            :label="$t('actions.close')"
            @click="slideoverOpen = false"
          />
          <UButton
            :label="saving ? $t('aiAssistant.saving') : $t('actions.save')"
            :disabled="!canEdit || saving"
            data-testid="ai-assistant-copy-save"
            @click="save"
          />
        </div>
      </template>
    </USlideover>
  </PageHeader>
</template>
