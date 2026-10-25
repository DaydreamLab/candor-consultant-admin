<script setup lang="ts">
import { AdminApiError } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'
import {
  adminGetPrivacyPolicy,
  adminGetPrivacyPolicyVersion,
  adminListPrivacyPolicyVersions,
  adminPatchPrivacyPolicy,
  type PrivacyPolicy,
  type PrivacyPolicyVersionSummary
} from '~/utils/privacy-policy-api'

const { t } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()
const localePath = useLocalePath()

const canEdit = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

const policy = ref<PrivacyPolicy | null>(null)
const titleDraft = ref('')
const bodyDraft = ref('')
const pending = ref(true)
const saving = ref(false)
const error = ref('')
const saved = ref(false)
const forbiddenSave = ref(false)

const versions = ref<PrivacyPolicyVersionSummary[]>([])
const versionsPending = ref(false)
const versionsError = ref('')
const leftVersion = ref<number | undefined>(undefined)
const rightVersion = ref<number | undefined>(undefined)
const leftBody = ref('')
const rightBody = ref('')
const leftTitle = ref('')
const rightTitle = ref('')
const diffPending = ref(false)
const diffError = ref('')

const dirty = computed(() => {
  if (!policy.value) {
    return false
  }
  return titleDraft.value !== policy.value.title || bodyDraft.value !== policy.value.body
})

const saveDisabled = computed(
  () => !canEdit.value || saving.value || !dirty.value || !titleDraft.value.trim()
)

const versionItems = computed(() =>
  versions.value.map(row => ({
    label: t('settings.privacy.versionOption', {
      version: row.version,
      at: row.updated_at || '—'
    }),
    value: row.version
  }))
)

const leftLabel = computed(() => {
  if (leftVersion.value === undefined) {
    return t('settings.privacy.diffLeft')
  }
  return t('settings.privacy.diffPaneLabel', {
    version: leftVersion.value,
    title: leftTitle.value || '—'
  })
})

const rightLabel = computed(() => {
  if (rightVersion.value === undefined) {
    return t('settings.privacy.diffRight')
  }
  return t('settings.privacy.diffPaneLabel', {
    version: rightVersion.value,
    title: rightTitle.value || '—'
  })
})

if (import.meta.client) {
  void loadAll()
}

async function loadAll() {
  await loadPolicy()
  await loadVersions()
}

async function loadPolicy() {
  const token = readOperatorToken()
  if (!token) {
    error.value = t('settings.privacy.loadFailed')
    pending.value = false
    return
  }
  pending.value = true
  error.value = ''
  saved.value = false
  forbiddenSave.value = false
  try {
    policy.value = await adminGetPrivacyPolicy(config.public.apiBase, token)
    titleDraft.value = policy.value.title
    bodyDraft.value = policy.value.body
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    error.value = message || t('settings.privacy.loadFailed')
  } finally {
    pending.value = false
  }
}

async function loadVersions() {
  const token = readOperatorToken()
  if (!token) {
    return
  }
  versionsPending.value = true
  versionsError.value = ''
  try {
    versions.value = await adminListPrivacyPolicyVersions(config.public.apiBase, token)
    if (versions.value.length >= 2) {
      rightVersion.value = versions.value[0]!.version
      leftVersion.value = versions.value[1]!.version
    } else if (versions.value.length === 1) {
      rightVersion.value = versions.value[0]!.version
      leftVersion.value = versions.value[0]!.version
    }
    await loadDiffBodies()
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    versionsError.value = message || t('settings.privacy.versionsLoadFailed')
  } finally {
    versionsPending.value = false
  }
}

async function loadDiffBodies() {
  const token = readOperatorToken()
  if (!token || leftVersion.value === undefined || rightVersion.value === undefined) {
    leftBody.value = ''
    rightBody.value = ''
    return
  }
  diffPending.value = true
  diffError.value = ''
  try {
    const [left, right] = await Promise.all([
      adminGetPrivacyPolicyVersion(config.public.apiBase, token, leftVersion.value),
      adminGetPrivacyPolicyVersion(config.public.apiBase, token, rightVersion.value)
    ])
    leftBody.value = left.body
    rightBody.value = right.body
    leftTitle.value = left.title
    rightTitle.value = right.title
  } catch (err) {
    const message = err instanceof AdminApiError ? err.message.trim() : ''
    diffError.value = message || t('settings.privacy.diffLoadFailed')
    leftBody.value = ''
    rightBody.value = ''
  } finally {
    diffPending.value = false
  }
}

async function onVersionChange() {
  await loadDiffBodies()
}

async function save() {
  const token = readOperatorToken()
  if (!token || saving.value || !canEdit.value || saveDisabled.value) {
    return
  }
  saving.value = true
  error.value = ''
  saved.value = false
  forbiddenSave.value = false
  try {
    policy.value = await adminPatchPrivacyPolicy(config.public.apiBase, token, {
      title: titleDraft.value.trim(),
      body: bodyDraft.value
    })
    titleDraft.value = policy.value.title
    bodyDraft.value = policy.value.body
    saved.value = true
    await loadVersions()
  } catch (err) {
    if (err instanceof AdminApiError && err.statusCode === 403) {
      forbiddenSave.value = true
      error.value = t('settings.privacy.saveForbidden')
    } else {
      const message = err instanceof AdminApiError ? err.message.trim() : ''
      error.value = message || t('settings.privacy.saveFailed')
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section
    id="settings-privacy"
    class="mb-6 rounded-xl border border-default bg-elevated p-5"
    data-testid="settings-privacy"
  >
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('settings.privacy.title') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.privacy.hint') }}
        </p>
      </div>
      <NuxtLink
        class="text-sm font-medium text-primary underline underline-offset-2"
        :to="localePath('/privacy-policy')"
        target="_blank"
      >
        {{ $t('settings.privacy.publicLink') }}
      </NuxtLink>
    </div>

    <p
      v-if="pending"
      class="mt-4 text-sm text-muted"
    >
      {{ $t('settings.privacy.loading') }}
    </p>
    <p
      v-else-if="error && !policy"
      class="mt-4 text-sm text-error"
    >
      {{ error }}
    </p>
    <template v-else-if="policy">
      <p class="mt-4 text-sm text-muted">
        {{ $t('settings.privacy.meta', {
          version: policy.version,
          at: policy.updated_at || '—',
          by: policy.updated_by || '—'
        }) }}
      </p>

      <div
        class="mt-4 grid h-[min(36rem,70vh)] w-full min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-default"
        data-testid="privacy-policy-editor-split"
      >
        <div class="flex min-h-0 min-w-0 flex-col gap-3 lg:pe-4">
          <UFormField
            class="w-full shrink-0"
            :label="$t('settings.privacy.fieldTitle')"
          >
            <UInput
              v-model="titleDraft"
              class="w-full"
              :disabled="!canEdit || saving"
              data-testid="privacy-policy-title"
              @input="saved = false; forbiddenSave = false"
            />
          </UFormField>
          <UFormField
            class="flex min-h-0 w-full flex-1 flex-col"
            :label="$t('settings.privacy.fieldBody')"
            :help="$t('settings.privacy.fieldBodyHelp')"
            :ui="{ container: 'flex-1 min-h-0 flex flex-col' }"
          >
            <textarea
              v-model="bodyDraft"
              rows="18"
              class="min-h-0 w-full flex-1 resize-none overflow-y-auto rounded-md border border-default bg-default px-3 py-2 font-mono text-sm text-highlighted outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75"
              :disabled="!canEdit || saving"
              data-testid="privacy-policy-body"
              @input="saved = false; forbiddenSave = false"
            />
          </UFormField>
        </div>
        <div class="flex min-h-0 min-w-0 flex-col lg:ps-4">
          <p class="mb-1.5 text-sm font-medium text-default">
            {{ $t('settings.privacy.previewLabel') }}
          </p>
          <p class="mb-2 text-xs text-muted">
            {{ $t('settings.privacy.previewHint') }}
          </p>
          <div
            class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-default bg-default p-4"
            data-testid="privacy-policy-live-preview"
          >
            <MarkdownPreview
              :title="titleDraft"
              :source="bodyDraft"
            />
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <UButton
          color="primary"
          size="sm"
          :disabled="saveDisabled"
          :loading="saving"
          data-testid="privacy-policy-save"
          @click="save"
        >
          {{ $t('actions.save') }}
        </UButton>
        <p
          v-if="!canEdit"
          class="text-sm text-muted"
        >
          {{ $t('actions.readOnly') }}
        </p>
        <p
          v-if="forbiddenSave"
          class="text-sm text-error"
        >
          {{ $t('settings.privacy.saveForbidden') }}
        </p>
        <p
          v-else-if="error && policy"
          class="text-sm text-error"
        >
          {{ error }}
        </p>
        <p
          v-if="saved"
          class="text-sm text-success"
        >
          {{ $t('actions.saved') }}
        </p>
      </div>
    </template>

    <div
      id="settings-privacy-diff"
      class="mt-8 border-t border-default pt-6"
      data-testid="settings-privacy-diff"
    >
      <h3 class="text-sm font-semibold text-highlighted">
        {{ $t('settings.privacy.diffTitle') }}
      </h3>
      <p class="mt-2 text-sm text-muted">
        {{ $t('settings.privacy.diffHint') }}
      </p>

      <p
        v-if="versionsPending"
        class="mt-4 text-sm text-muted"
      >
        {{ $t('settings.privacy.versionsLoading') }}
      </p>
      <p
        v-else-if="versionsError"
        class="mt-4 text-sm text-error"
      >
        {{ versionsError }}
      </p>
      <template v-else-if="versions.length">
        <div class="mt-4 grid w-full gap-3 sm:grid-cols-2">
          <UFormField
            class="w-full"
            :label="$t('settings.privacy.diffLeft')"
          >
            <USelect
              v-model="leftVersion"
              class="w-full"
              :items="versionItems"
              value-key="value"
              label-key="label"
              data-testid="privacy-diff-left"
              @update:model-value="onVersionChange"
            />
          </UFormField>
          <UFormField
            class="w-full"
            :label="$t('settings.privacy.diffRight')"
          >
            <USelect
              v-model="rightVersion"
              class="w-full"
              :items="versionItems"
              value-key="value"
              label-key="label"
              data-testid="privacy-diff-right"
              @update:model-value="onVersionChange"
            />
          </UFormField>
        </div>
        <div class="mt-4 w-full min-w-0">
          <PrivacyPolicyDiff
            :left-label="leftLabel"
            :right-label="rightLabel"
            :left-body="leftBody"
            :right-body="rightBody"
            :pending="diffPending"
            :error="diffError"
          />
        </div>
      </template>
      <p
        v-else
        class="mt-4 text-sm text-muted"
      >
        {{ $t('settings.privacy.versionsEmpty') }}
      </p>
    </div>
  </section>
</template>
