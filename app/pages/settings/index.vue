<script setup lang="ts">
import { DEMO_LABELS } from '~/utils/demo'
import { AdminApiError, adminGetClientConfig, adminPatchClientConfig } from '~/utils/admin-api'
import { readOperatorToken } from '~/utils/operator-session'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { platform, currentOrg } = useOrgScope()
const config = useRuntimeConfig()

const org = computed(() => currentOrg())

const individualTestsUrl = ref('')
const configPending = ref(true)
const configSaving = ref(false)
const configError = ref('')
const configSaved = ref(false)

if (import.meta.client) {
  void loadClientConfig()
}

async function loadClientConfig() {
  const token = readOperatorToken()
  if (!token) {
    configError.value = t('settings.clientConfigFailed')
    configPending.value = false
    return
  }

  configPending.value = true
  configError.value = ''
  configSaved.value = false
  try {
    const data = await adminGetClientConfig(config.public.apiBase, token)
    individualTestsUrl.value = data.individual_tests_url
  } catch (error) {
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    configError.value = message || t('settings.clientConfigFailed')
  } finally {
    configPending.value = false
  }
}

async function saveClientConfig() {
  const token = readOperatorToken()
  if (!token || configSaving.value) {
    return
  }

  configSaving.value = true
  configError.value = ''
  configSaved.value = false
  try {
    const data = await adminPatchClientConfig(config.public.apiBase, token, {
      individual_tests_url: individualTestsUrl.value.trim()
    })
    individualTestsUrl.value = data.individual_tests_url
    configSaved.value = true
  } catch (error) {
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    configError.value = message || t('settings.clientConfigSaveFailed')
  } finally {
    configSaving.value = false
  }
}

function labelName(row: (typeof DEMO_LABELS)[number]) {
  return locale.value === 'en' ? row.nameEn : row.name
}

function warehouseName() {
  if (!org.value) {
    return locale.value === 'en' ? 'Candor platform' : '坦見平台'
  }
  return locale.value === 'en' ? org.value.warehouseEn : org.value.warehouse
}
</script>

<template>
  <PageHeader
    :title="$t('nav.settings')"
    :description="moduleDesc('settings')"
  >
    <p class="mb-6 max-w-3xl text-base text-muted">
      {{ $t('settings.intro') }}
    </p>

    <section class="mb-6 rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.clientConfig') }}
      </h2>
      <p class="mt-2 text-sm text-muted">
        {{ $t('settings.clientConfigHint') }}
      </p>
      <p
        v-if="configError"
        class="mt-3 text-sm text-error"
        data-testid="settings-client-config-error"
      >
        {{ configError }}
      </p>
      <p
        v-else-if="configSaved"
        class="mt-3 text-sm text-success"
        data-testid="settings-client-config-saved"
      >
        {{ $t('actions.saved') }}
      </p>
      <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label class="min-w-0 flex-1 text-sm">
          <span class="mb-1.5 block text-muted">
            {{ $t('settings.individualTestsUrl') }}
          </span>
          <input
            v-model="individualTestsUrl"
            type="url"
            class="w-full rounded-lg border border-default bg-default px-3 py-2 text-sm text-highlighted"
            :placeholder="$t('settings.individualTestsUrlPlaceholder')"
            :disabled="configPending || configSaving"
            data-testid="settings-individual-tests-url"
          >
        </label>
        <button
          type="button"
          class="app-btn app-btn-primary shrink-0"
          :disabled="configPending || configSaving"
          data-testid="settings-client-config-save"
          @click="saveClientConfig"
        >
          {{ configSaving ? $t('settings.saving') : $t('actions.save') }}
        </button>
      </div>
      <p class="mt-2 text-xs text-dimmed">
        {{ $t('settings.individualTestsUrlHelp') }}
      </p>
    </section>

    <div class="mb-6 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('settings.notice') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.noticeHint') }}
        </p>
        <p class="mt-4 text-sm text-dimmed">
          {{ $t('settings.noticeEmail') }}
        </p>
        <p class="mt-1 text-base font-medium text-highlighted">
          {{ platform ? 'owner@candor.local' : (org?.contact ?? '—') }}
        </p>
      </section>
      <section class="rounded-xl border border-default bg-elevated p-5">
        <h2 class="text-base font-semibold text-highlighted">
          {{ $t('settings.warehouse') }}
        </h2>
        <p class="mt-2 text-sm text-muted">
          {{ $t('settings.warehouseHint') }}
        </p>
        <p class="mt-4 text-base font-medium text-highlighted">
          {{ warehouseName() }}
        </p>
      </section>
    </div>

    <section class="rounded-xl border border-default bg-elevated p-5">
      <h2 class="text-base font-semibold text-highlighted">
        {{ $t('settings.labels') }}
      </h2>
      <p class="mt-2 mb-4 text-sm text-muted">
        {{ platform ? $t('settings.labelsHintPlatform') : $t('settings.labelsHintFirm') }}
      </p>
      <AdminTable :empty="!DEMO_LABELS.length">
        <template #head>
          <tr>
            <th>ID</th>
            <th>{{ $t('col.name') }}</th>
            <th>{{ $t('col.effective') }}</th>
            <th>{{ $t('col.current') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in DEMO_LABELS"
          :key="row.id"
          class="border-b border-default last:border-0"
        >
          <td class="font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td>
            {{ labelName(row) }}
          </td>
          <td class="text-muted">
            {{ row.effective }}
          </td>
          <td>
            <StatusBadge
              :label="row.current ? $t('status.yes') : $t('status.no')"
              :color="row.current ? 'success' : 'neutral'"
            />
          </td>
        </tr>
      </AdminTable>
    </section>
  </PageHeader>
</template>
