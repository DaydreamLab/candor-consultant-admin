<script setup lang="ts">
import { DEMO_LABELS } from '~/utils/demo'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { platform, currentOrg } = useOrgScope()

const org = computed(() => currentOrg())

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
    <div class="mb-6 grid gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="font-medium text-highlighted">
          {{ $t('settings.notice') }}
        </p>
        <p class="mt-3 text-sm text-muted">
          {{ $t('settings.noticeEmail') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ platform ? 'owner@candor.local' : (org?.contact ?? '—') }}
        </p>
        <p class="mt-3 text-sm text-muted">
          {{ $t('settings.warehouse') }}
        </p>
        <p class="mt-1 text-sm text-highlighted">
          {{ warehouseName() }}
        </p>
      </div>
      <div class="rounded-xl border border-default bg-elevated p-4">
        <p class="font-medium text-highlighted">
          {{ $t('settings.labels') }}
        </p>
        <p class="mt-1 text-sm text-muted">
          {{ platform ? $t('settings.labelsHintPlatform') : $t('settings.labelsHintFirm') }}
        </p>
      </div>
    </div>

    <AdminTable :empty="!DEMO_LABELS.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            ID
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.name') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.effective') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.current') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in DEMO_LABELS"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ row.id }}
        </td>
        <td class="px-4 py-3">
          {{ labelName(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.effective }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="row.current ? $t('status.yes') : $t('status.no')"
            :color="row.current ? 'success' : 'neutral'"
          />
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
