<script setup lang="ts">
import { CASE_STATUS_COLOR, nextAction } from '~/utils/labels'
import type { CaseRow } from '~/types/admin'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const ops = useOpsStore()
const { scoped, orgLabel, showOrg, platform } = useOrgScope()

const counts = computed(() => workbenchCounts(
  scoped(ops.cases),
  scoped(ops.inventory),
  scoped(ops.reviews)
))

const steps = computed(() => [
  { key: 'intake', to: '/cases', count: counts.value.pendingCases },
  { key: 'lab', to: '/labs', count: counts.value.pendingLabs },
  { key: 'progress', to: '/progress', count: counts.value.pendingProgress },
  { key: 'selection', to: '/selections', count: counts.value.pendingSelection },
  { key: 'ship', to: '/shipping', count: counts.value.pendingShip },
  { key: 'invoice', to: '/invoices', count: counts.value.pendingInvoice }
])

const cards = [
  { key: 'pendingReview', to: '/reviews', icon: 'i-lucide-badge-check' },
  { key: 'lowStock', to: '/products', icon: 'i-lucide-package' }
] as const

const queue = computed(() =>
  scoped(ops.cases)
    .filter(row => !['shipped', 'invoiced'].includes(row.status))
    .slice(0, 8)
)

function customerName(row: CaseRow) {
  return locale.value === 'en' ? row.customerEn : row.customer
}

function nextLabel(status: CaseRow['status']) {
  const action = nextAction(status)
  return action ? t(action.key) : t('status.na')
}

function nextTo(status: CaseRow['status']) {
  const action = nextAction(status)
  return action ? localePath(action.to) : localePath('/cases')
}
</script>

<template>
  <PageHeader
    :title="$t('workbench.title')"
    :description="platform ? $t('workbench.subtitlePlatform') : $t('workbench.subtitleFirm')"
  >
    <h2 class="mb-3 text-sm font-semibold text-highlighted">
      {{ $t('workbench.flowTitle') }}
    </h2>
    <div class="mb-8 grid gap-2 sm:grid-cols-3 xl:grid-cols-6">
      <NuxtLink
        v-for="(step, index) in steps"
        :key="step.key"
        :to="localePath(step.to)"
        class="rounded-xl border border-default bg-elevated p-4 transition hover:border-primary/40"
      >
        <p class="text-xs text-dimmed">
          {{ index + 1 }}
        </p>
        <p class="mt-1 font-medium text-highlighted">
          {{ $t(`flow.${step.key}`) }}
        </p>
        <p class="mt-3 text-2xl font-semibold text-primary">
          {{ step.count }}
        </p>
      </NuxtLink>
    </div>

    <div class="mb-8 grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="card in cards"
        :key="card.key"
        :to="localePath(card.to)"
        class="rounded-xl border border-default bg-elevated p-4 transition hover:border-primary/40"
      >
        <div class="flex items-center justify-between">
          <UIcon
            :name="card.icon"
            class="size-5 text-primary"
          />
          <span class="text-2xl font-semibold text-highlighted">
            {{ counts[card.key] }}
          </span>
        </div>
        <p class="mt-3 text-sm text-muted">
          {{ $t(`workbench.${card.key}`) }}
        </p>
      </NuxtLink>
    </div>

    <h2 class="mb-3 text-sm font-semibold text-highlighted">
      {{ $t('table.queue') }}
    </h2>
    <AdminTable :empty="!queue.length">
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
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.next') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in queue"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          {{ row.id }}
        </td>
        <td class="px-4 py-3">
          {{ customerName(row) }}
        </td>
        <td class="px-4 py-3">
          {{ $t(`plan.${row.planId}`) }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="CASE_STATUS_COLOR[row.status]"
          />
        </td>
        <td class="px-4 py-3">
          <NuxtLink
            :to="nextTo(row.status)"
            class="text-sm font-medium text-primary hover:underline"
          >
            {{ nextLabel(row.status) }}
          </NuxtLink>
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
