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
    <p class="mb-6 max-w-3xl text-base text-muted">
      {{ $t('settings.intro') }}
    </p>

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
