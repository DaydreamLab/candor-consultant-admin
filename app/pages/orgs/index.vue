<script setup lang="ts">
const { locale } = useI18n()
const session = useSessionStore()
const ops = useOpsStore()
const { orgLabel, platform } = useOrgScope()
const { moduleDesc } = usePageCopy()

const rows = computed(() => {
  const orgs = platform.value
    ? ops.orgs
    : ops.orgs.filter(org => org.id === session.session?.orgId)
  return orgs.map((org) => {
    const cases = ops.cases.filter(row => row.orgId === org.id)
    const low = ops.inventory.filter(row => row.orgId === org.id && row.onHand - row.reserved <= row.reorderAt)
    return {
      ...org,
      caseCount: cases.length,
      lowStock: low.length
    }
  })
})

function city(row: (typeof rows.value)[number]) {
  return locale.value === 'en' ? row.cityEn : row.city
}
</script>

<template>
  <PageHeader
    :title="$t('nav.orgs')"
    :description="moduleDesc('orgs')"
  >
    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.city') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.contact') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.since') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.cases') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('workbench.lowStock') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ orgLabel(row.id) }}
        </td>
        <td class="px-4 py-3">
          {{ city(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.contact }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.since }}
        </td>
        <td class="px-4 py-3">
          {{ row.caseCount }}
        </td>
        <td class="px-4 py-3">
          {{ row.lowStock }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="row.status === 'active' ? 'success' : 'warning'"
          />
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
