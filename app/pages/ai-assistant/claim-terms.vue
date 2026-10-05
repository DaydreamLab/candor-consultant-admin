<script setup lang="ts">
import {
  AdminApiError,
  adminCreateClaimGuardTerm,
  adminListClaimGuardTerms,
  adminPatchClaimGuardTerm,
  type AdminClaimGuardTerm
} from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()

const items = ref<AdminClaimGuardTerm[]>([])
const pending = ref(true)
const error = ref('')
const slideoverOpen = ref(false)
const mode = ref<'create' | 'edit'>('create')
const editingId = ref<string | null>(null)
const draftTerm = ref('')
const draftSeverity = ref<'blocked' | 'rewritten'>('rewritten')
const draftPattern = ref('')
const draftReplacement = ref('')
const draftNote = ref('')
const draftActive = ref(true)
const saving = ref(false)
const saveError = ref('')
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
    error.value = t('aiAssistant.claimTerms.loadFailed')
    pending.value = false
    return
  }
  pending.value = true
  error.value = ''
  try {
    items.value = await adminListClaimGuardTerms(config.public.apiBase, token)
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('aiAssistant.claimTerms.loadFailed')
  } finally {
    pending.value = false
  }
}

function openCreate() {
  mode.value = 'create'
  editingId.value = null
  draftTerm.value = ''
  draftSeverity.value = 'rewritten'
  draftPattern.value = ''
  draftReplacement.value = ''
  draftNote.value = ''
  draftActive.value = true
  saveError.value = ''
  saved.value = false
  slideoverOpen.value = true
}

function openEdit(row: AdminClaimGuardTerm) {
  mode.value = 'edit'
  editingId.value = row.id
  draftTerm.value = row.term
  draftSeverity.value = row.severity
  draftPattern.value = row.pattern ?? ''
  draftReplacement.value = row.replacement ?? ''
  draftNote.value = row.note ?? ''
  draftActive.value = row.active
  saveError.value = ''
  saved.value = false
  slideoverOpen.value = true
}

async function save() {
  const token = readOperatorToken()
  if (!token || saving.value || !canEdit.value) {
    return
  }
  saving.value = true
  saveError.value = ''
  saved.value = false
  const payload = {
    term: draftTerm.value.trim(),
    severity: draftSeverity.value,
    pattern: draftPattern.value.trim() || null,
    replacement: draftReplacement.value.trim() || null,
    note: draftNote.value.trim() || null,
    active: draftActive.value
  }
  try {
    if (mode.value === 'create') {
      const created = await adminCreateClaimGuardTerm(config.public.apiBase, token, payload)
      items.value = [created, ...items.value]
      editingId.value = created.id
      mode.value = 'edit'
    } else if (editingId.value) {
      const updated = await adminPatchClaimGuardTerm(
        config.public.apiBase,
        token,
        editingId.value,
        payload
      )
      items.value = items.value.map(item => (item.id === updated.id ? updated : item))
    }
    saved.value = true
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    saveError.value = message || t('aiAssistant.claimTerms.saveFailed')
  } finally {
    saving.value = false
  }
}

const togglingIds = ref<Set<string>>(new Set())

function isToggling(id: string) {
  return togglingIds.value.has(id)
}

async function toggleActive(row: AdminClaimGuardTerm, next: boolean) {
  const token = readOperatorToken()
  if (!token || !canEdit.value || next === row.active || isToggling(row.id)) {
    return
  }
  togglingIds.value = new Set(togglingIds.value).add(row.id)
  try {
    const updated = await adminPatchClaimGuardTerm(config.public.apiBase, token, row.id, {
      active: next
    })
    items.value = items.value.map(item => (item.id === updated.id ? updated : item))
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('aiAssistant.claimTerms.saveFailed')
  } finally {
    const nextSet = new Set(togglingIds.value)
    nextSet.delete(row.id)
    togglingIds.value = nextSet
  }
}
</script>

<template>
  <PageHeader
    :title="$t('nav.aiAssistant')"
    :description="$t('aiAssistant.description')"
  >
    <AiAssistantTabs />
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted">
        {{ $t('aiAssistant.claimTerms.hint') }}
      </p>
      <UButton
        v-if="canEdit"
        size="sm"
        :label="$t('actions.add')"
        data-testid="ai-assistant-claim-add"
        @click="openCreate"
      />
    </div>
    <p
      v-if="error"
      class="mb-4 text-sm text-error"
      data-testid="ai-assistant-claim-error"
    >
      {{ error }}
    </p>
    <p
      v-else-if="pending"
      class="mb-4 text-sm text-muted"
    >
      {{ $t('aiAssistant.loading') }}
    </p>
    <AdminTable
      v-else
      :empty="!items.length"
      compact
    >
      <template #head>
        <tr>
          <th class="w-16">
            {{ $t('aiAssistant.claimTerms.columns.active') }}
          </th>
          <th>{{ $t('aiAssistant.claimTerms.columns.term') }}</th>
          <th>{{ $t('aiAssistant.claimTerms.columns.severity') }}</th>
          <th />
        </tr>
      </template>
      <tr
        v-for="row in items"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td>
          <USwitch
            :model-value="row.active"
            :disabled="!canEdit || isToggling(row.id)"
            :aria-label="$t('aiAssistant.claimTerms.columns.active')"
            data-testid="ai-assistant-claim-active"
            @update:model-value="toggleActive(row, $event)"
          />
        </td>
        <td class="font-medium text-highlighted">
          {{ row.term }}
        </td>
        <td class="text-muted">
          {{ row.severity }}
        </td>
        <td class="text-right">
          <UButton
            size="sm"
            variant="ghost"
            :label="$t('actions.edit')"
            @click="openEdit(row)"
          />
        </td>
      </tr>
    </AdminTable>

    <USlideover
      v-model:open="slideoverOpen"
      :title="mode === 'create' ? $t('aiAssistant.claimTerms.createTitle') : $t('aiAssistant.claimTerms.editTitle')"
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
              {{ $t('aiAssistant.claimTerms.columns.term') }}
            </span>
            <input
              v-model="draftTerm"
              type="text"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
            >
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.claimTerms.columns.severity') }}
            </span>
            <select
              v-model="draftSeverity"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
            >
              <option value="rewritten">
                rewritten
              </option>
              <option value="blocked">
                blocked
              </option>
            </select>
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.claimTerms.fields.pattern') }}
            </span>
            <input
              v-model="draftPattern"
              type="text"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
            >
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.claimTerms.fields.replacement') }}
            </span>
            <input
              v-model="draftReplacement"
              type="text"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
            >
          </label>
          <label class="text-sm">
            <span class="mb-1.5 block text-muted">
              {{ $t('aiAssistant.claimTerms.fields.note') }}
            </span>
            <input
              v-model="draftNote"
              type="text"
              class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
              :disabled="!canEdit || saving"
            >
          </label>
          <label class="flex items-center gap-2 text-sm text-highlighted">
            <input
              v-model="draftActive"
              type="checkbox"
              :disabled="!canEdit || saving"
            >
            {{ $t('aiAssistant.claimTerms.columns.active') }}
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
            data-testid="ai-assistant-claim-save"
            @click="save"
          />
        </div>
      </template>
    </USlideover>
  </PageHeader>
</template>
