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
  { key: 'intake', to: '/cases', count: counts.value.pendingCases, icon: 'i-lucide-folder-kanban' },
  { key: 'lab', to: '/labs', count: counts.value.pendingLabs, icon: 'i-lucide-flask-conical' },
  { key: 'progress', to: '/progress', count: counts.value.pendingProgress, icon: 'i-lucide-list-checks' },
  { key: 'selection', to: '/selections', count: counts.value.pendingSelection, icon: 'i-lucide-clipboard-list' },
  { key: 'ship', to: '/shipping', count: counts.value.pendingShip, icon: 'i-lucide-truck' },
  { key: 'invoice', to: '/invoices', count: counts.value.pendingInvoice, icon: 'i-lucide-receipt' }
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
  return action ? localePath(action.to) : undefined
}
</script>

<template>
  <PageHeader
    :title="$t('workbench.title')"
    :description="platform ? $t('workbench.subtitlePlatform') : $t('workbench.subtitleFirm')"
  >
    <h2 class="mb-4 text-base font-semibold text-highlighted">
      {{ $t('workbench.flowTitle') }}
    </h2>
    <div class="mb-8 flex items-center gap-2 overflow-x-auto pb-1">
      <template
        v-for="(step, index) in steps"
        :key="step.key"
      >
        <UIcon
          v-if="index > 0"
          name="i-lucide-chevron-right"
          class="hidden size-5 shrink-0 text-primary sm:block"
        />
        <NuxtLink
          :to="localePath(step.to)"
          class="flex min-w-36 flex-1 flex-col items-center justify-center rounded-xl border border-default bg-elevated p-4 text-center transition hover:border-primary/40"
        >
          <div class="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
            <UIcon
              :name="step.icon"
              class="size-5"
            />
          </div>
          <p class="mt-3 text-sm text-dimmed">
            {{ index + 1 }}
          </p>
          <p class="mt-0.5 font-medium text-highlighted">
            {{ $t(`flow.${step.key}`) }}
          </p>
          <p class="mt-3 text-2xl font-semibold text-primary">
            {{ step.count }}
          </p>
        </NuxtLink>
      </template>
    </div>

    <div class="mb-8 grid gap-3 sm:grid-cols-2">
      <NuxtLink
        v-for="card in cards"
        :key="card.key"
        :to="localePath(card.to)"
        class="rounded-xl border border-default bg-elevated p-5 transition hover:border-primary/40"
      >
        <div class="flex items-center justify-between">
          <UIcon
            :name="card.icon"
            class="size-6 text-primary"
          />
          <span class="text-2xl font-semibold text-highlighted">
            {{ counts[card.key] }}
          </span>
        </div>
        <p class="mt-3 text-base text-muted">
          {{ $t(`workbench.${card.key}`) }}
        </p>
      </NuxtLink>
    </div>

    <h2 class="mb-3 text-base font-semibold text-highlighted">
      {{ $t('table.queue') }}
    </h2>
    <AdminTable :empty="!queue.length">
      <template #head>
        <tr>
          <th>{{ $t('col.case') }}</th>
          <th>{{ $t('col.customer') }}</th>
          <th>{{ $t('col.plan') }}</th>
          <th
            v-if="showOrg"
          >
            {{ $t('col.org') }}
          </th>
          <th>{{ $t('col.status') }}</th>
          <th>{{ $t('col.next') }}</th>
        </tr>
      </template>
      <tr
        v-for="row in queue"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="font-medium text-highlighted">
          {{ row.id }}
        </td>
        <td>
          <div>{{ customerName(row) }}</div>
          <div class="text-sm text-dimmed">
            {{ row.appointmentAt }}
          </div>
        </td>
        <td>
          {{ $t(`plan.${row.planId}`) }}
        </td>
        <td
          v-if="showOrg"
          class="text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td>
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="CASE_STATUS_COLOR[row.status]"
          />
        </td>
        <td>
          <NextActionButton
            :to="nextTo(row.status)"
            :label="nextLabel(row.status)"
          />
        </td>
      </tr>
    </AdminTable>
  </PageHeader>
</template>
