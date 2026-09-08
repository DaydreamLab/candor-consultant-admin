<script setup lang="ts">
import type { ProgressRow } from '~/types/admin'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()

const flags = ['labScheduled', 'reportBack', 'consultDone', 'keyedIn', 'labeled', 'shipped'] as const

const rows = computed(() => scoped(ops.progress))

function missing(row: ProgressRow) {
  return locale.value === 'en' ? row.missingEn : row.missing
}

function toggle(row: ProgressRow, key: (typeof flags)[number], value: boolean | undefined) {
  if (!writable.value || row[key] === null || value === undefined) {
    return
  }
  ops.setProgressFlag(row.caseId, key, value)
  feedback.saved(row.caseId)
}
</script>

<template>
  <PageHeader
    :title="$t('nav.progress')"
    :description="moduleDesc('progress')"
  >
    <p class="mb-4 rounded-lg bg-muted px-3 py-2 text-sm text-muted">
      {{ $t('progress.tickHint') }}
    </p>

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.case') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.customer') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.plan') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.lab') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.report') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.consult') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.selection') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.label') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('progress.ship') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.missing') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.caseId"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          <div>{{ row.caseId }}</div>
          <div
            v-if="showOrg"
            class="text-xs text-dimmed"
          >
            {{ orgLabel(row.orgId) }}
          </div>
        </td>
        <td class="px-4 py-3">
          {{ row.customer }}
        </td>
        <td class="px-4 py-3">
          {{ $t(`plan.${row.planId}`) }}
        </td>
        <td
          v-for="key in flags"
          :key="key"
          class="px-4 py-3"
        >
          <UCheckbox
            v-if="row[key] !== null"
            :model-value="Boolean(row[key])"
            :disabled="!writable"
            @update:model-value="toggle(row, key, $event as boolean)"
          />
          <span
            v-else
            class="text-muted"
          >{{ $t('status.na') }}</span>
        </td>
        <td class="px-4 py-3 text-muted">
          {{ missing(row) }}
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
