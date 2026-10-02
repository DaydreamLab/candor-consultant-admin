<script setup lang="ts">
import { WEIGHT_SET_STATUS_COLOR, type WeightSetMock } from '~/utils/expert-tuning-mock'

const localePath = useLocalePath()
const { locale } = useI18n()
const { weightSets } = useExpertTuningMockStore()

function labelOf(row: WeightSetMock) {
  return String(locale.value).startsWith('en') ? row.labelEn : row.label
}

function openRow(row: WeightSetMock) {
  void navigateTo(localePath(`/expert-tuning/weights/${encodeURIComponent(row.id)}`))
}
</script>

<template>
  <PageHeader
    :title="$t('nav.expertTuning')"
    :description="$t('expertTuning.description')"
  >
    <ExpertTuningTabs />
    <p
      v-if="!weightSets.length"
      class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
    >
      {{ $t('expertTuning.emptyList') }}
    </p>
    <AdminTable
      v-else
      compact
    >
      <template #head>
        <tr>
          <th>{{ $t('expertTuning.columns.version') }}</th>
          <th>{{ $t('expertTuning.columns.status') }}</th>
          <th>{{ $t('expertTuning.columns.label') }}</th>
          <th>{{ $t('expertTuning.columns.updatedAt') }}</th>
        </tr>
      </template>
      <tr
        v-for="row in weightSets"
        :key="row.id"
        class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
        @click="openRow(row)"
      >
        <td class="font-medium text-highlighted">
          {{ row.version }}
        </td>
        <td>
          <StatusBadge
            :label="$t(`expertTuning.status.${row.status}`)"
            :color="WEIGHT_SET_STATUS_COLOR[row.status]"
          />
        </td>
        <td>
          {{ labelOf(row) }}
        </td>
        <td class="text-muted">
          {{ row.updated_at }}
        </td>
      </tr>
    </AdminTable>
    <p class="mt-3 text-xs text-muted">
      {{ $t('expertTuning.mockHint') }}
    </p>
  </PageHeader>
</template>
