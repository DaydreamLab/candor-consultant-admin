<script setup lang="ts">
import {
  adminListExpertCaseReviews,
  adminListKnowledgeChunks,
  adminListOrders,
  adminListUsers
} from '~/utils/admin-api'
import { CASE_STATUS_COLOR, nextAction } from '~/utils/labels'
import { canAccessKnowledge } from '~/utils/knowledge-access'
import { readOperatorToken } from '~/utils/operator-session'
import type { CaseRow } from '~/types/admin'
import {
  countPagedList,
  settledCount,
  WORKBENCH_LIST_PAGE_SIZE,
  type WorkbenchMetricKey
} from '~/utils/workbench-summary'

const localePath = useLocalePath()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const session = useSessionStore()
const ops = useOpsStore()
const { scoped, orgLabel, showOrg } = useOrgScope()

const pending = ref(true)
const loadError = ref(false)
let loadSeq = 0

const metrics = ref<Record<WorkbenchMetricKey, { value: number | null, failed: boolean }>>({
  awaitingReview: { value: null, failed: false },
  confirmedOrders: { value: null, failed: false },
  unpaidOrders: { value: null, failed: false },
  reviewedCases: { value: null, failed: false },
  membersWithOrders: { value: null, failed: false },
  pendingChunks: { value: null, failed: false }
})

const showKnowledgeTodo = computed(() => canAccessKnowledge(session.operator?.role ?? null))

const todoCards = computed(() => {
  const cards: {
    key: WorkbenchMetricKey
    labelKey: string
    to: string
    query?: Record<string, string>
  }[] = [
    {
      key: 'awaitingReview',
      labelKey: 'workbench.awaitingReview',
      to: '/expert-case-reviews',
      query: { status: 'awaiting_review' }
    },
    {
      key: 'confirmedOrders',
      labelKey: 'workbench.confirmedOrders',
      to: '/orders',
      query: { status: 'confirmed' }
    }
  ]
  if (showKnowledgeTodo.value) {
    cards.push({
      key: 'pendingChunks',
      labelKey: 'workbench.pendingChunks',
      to: '/knowledge/chunks',
      query: { status: 'pending' }
    })
  }
  return cards
})

const statusCards: {
  key: WorkbenchMetricKey
  labelKey: string
  to: string
  query: Record<string, string>
}[] = [
  {
    key: 'unpaidOrders',
    labelKey: 'workbench.unpaidOrders',
    to: '/orders',
    query: { payment_status: 'unpaid' }
  },
  {
    key: 'reviewedCases',
    labelKey: 'workbench.reviewedCases',
    to: '/expert-case-reviews',
    query: { status: 'reviewed' }
  },
  {
    key: 'membersWithOrders',
    labelKey: 'workbench.membersWithOrders',
    to: '/users',
    query: { has_orders: 'true' }
  }
]

const todoEmpty = computed(() => {
  if (pending.value) {
    return false
  }
  return todoCards.value.every((card) => {
    const metric = metrics.value[card.key]
    return !metric.failed && metric.value === 0
  })
})

const demoCounts = computed(() => workbenchCounts(
  scoped(ops.cases),
  scoped(ops.inventory),
  scoped(ops.reviews)
))

const demoSteps = computed(() => [
  { key: 'intake', to: '/cases', count: demoCounts.value.pendingCases, icon: 'i-lucide-folder-kanban' },
  { key: 'lab', to: '/labs', count: demoCounts.value.pendingLabs, icon: 'i-lucide-flask-conical' },
  { key: 'progress', to: '/progress', count: demoCounts.value.pendingProgress, icon: 'i-lucide-list-checks' },
  { key: 'selection', to: '/selections', count: demoCounts.value.pendingSelection, icon: 'i-lucide-clipboard-list' },
  { key: 'ship', to: '/shipping', count: demoCounts.value.pendingShip, icon: 'i-lucide-truck' },
  { key: 'invoice', to: '/invoices', count: demoCounts.value.pendingInvoice, icon: 'i-lucide-receipt' }
])

const demoQueue = computed(() =>
  scoped(ops.cases)
    .filter(row => !['shipped', 'invoiced'].includes(row.status))
    .slice(0, 8)
)

function cardPath(to: string, query?: Record<string, string>) {
  return localePath({ path: to, query })
}

function displayValue(key: WorkbenchMetricKey) {
  const metric = metrics.value[key]
  if (metric.failed || metric.value === null) {
    return '—'
  }
  return String(metric.value)
}

function cardFailed(key: WorkbenchMetricKey) {
  return metrics.value[key].failed
}

function warnTone(key: WorkbenchMetricKey) {
  const metric = metrics.value[key]
  return !metric.failed && typeof metric.value === 'number' && metric.value > 0
}

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

async function countExpertReviews(token: string, status: string) {
  return countPagedList(async (offset, limit) =>
    adminListExpertCaseReviews(config.public.apiBase, token, { status, limit, offset })
  )
}

async function countOrders(token: string, query: { status?: string, payment_status?: string }) {
  return countPagedList(async (offset, limit) =>
    adminListOrders(config.public.apiBase, token, { ...query, limit, offset })
  )
}

async function countMembersWithOrders(token: string) {
  const rows = await adminListUsers(config.public.apiBase, token, { has_orders: true })
  return rows.length
}

async function countPendingChunks(token: string) {
  return countPagedList(
    async (offset, limit) =>
      adminListKnowledgeChunks(config.public.apiBase, token, {
        status: 'pending',
        limit,
        offset
      }),
    WORKBENCH_LIST_PAGE_SIZE
  )
}

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  pending.value = true
  loadError.value = false

  if (!token) {
    metrics.value = {
      awaitingReview: { value: null, failed: true },
      confirmedOrders: { value: null, failed: true },
      unpaidOrders: { value: null, failed: true },
      reviewedCases: { value: null, failed: true },
      membersWithOrders: { value: null, failed: true },
      pendingChunks: { value: null, failed: true }
    }
    loadError.value = true
    pending.value = false
    return
  }

  const includeChunks = showKnowledgeTodo.value
  const tasks: Promise<number>[] = [
    countExpertReviews(token, 'awaiting_review'),
    countOrders(token, { status: 'confirmed' }),
    countOrders(token, { payment_status: 'unpaid' }),
    countExpertReviews(token, 'reviewed'),
    countMembersWithOrders(token)
  ]
  if (includeChunks) {
    tasks.push(countPendingChunks(token))
  }

  const results = await Promise.allSettled(tasks)
  if (seq !== loadSeq) {
    return
  }

  const next = { ...metrics.value }
  next.awaitingReview = settledCount(results[0]!)
  next.confirmedOrders = settledCount(results[1]!)
  next.unpaidOrders = settledCount(results[2]!)
  next.reviewedCases = settledCount(results[3]!)
  next.membersWithOrders = settledCount(results[4]!)
  if (includeChunks) {
    next.pendingChunks = settledCount(results[5]!)
  } else {
    next.pendingChunks = { value: 0, failed: false }
  }
  metrics.value = next
  loadError.value = Object.values(next).some(item => item.failed)
  pending.value = false
}

if (import.meta.client) {
  watch(showKnowledgeTodo, () => {
    void load()
  }, { immediate: true })
}
</script>

<template>
  <PageHeader
    :title="$t('workbench.title')"
    :description="$t('workbench.subtitle')"
    plain
  >
    <div
      v-if="loadError && !pending"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      data-testid="workbench-error"
    >
      <span>{{ $t('workbench.partialError') }}</span>
      <UButton
        color="error"
        variant="outline"
        size="sm"
        data-testid="workbench-retry"
        @click="load"
      >
        {{ $t('workbench.retry') }}
      </UButton>
    </div>

    <h2 class="mb-3 text-sm font-semibold text-highlighted">
      {{ $t('workbench.todoTitle') }}
    </h2>

    <div
      v-if="pending"
      class="mb-6 grid gap-3 sm:grid-cols-2"
      :class="showKnowledgeTodo ? 'xl:grid-cols-3' : ''"
      data-testid="workbench-todo-loading"
    >
      <div
        v-for="n in todoCards.length"
        :key="`todo-skel-${n}`"
        class="h-[7.75rem] animate-pulse rounded-xl border border-default bg-muted/40"
      />
    </div>

    <EmptyPanel
      v-else-if="todoEmpty"
      class="mb-6"
      dashed
      :title="$t('workbench.emptyTitle')"
      :description="$t('workbench.emptyBody')"
      data-testid="workbench-todo-empty"
    >
      <UButton
        color="primary"
        :to="localePath('/expert-case-reviews')"
      >
        {{ $t('workbench.openReviews') }}
      </UButton>
    </EmptyPanel>

    <div
      v-else
      class="mb-6 grid gap-3 sm:grid-cols-2"
      :class="showKnowledgeTodo ? 'xl:grid-cols-3' : ''"
      data-testid="workbench-todo-grid"
    >
      <NuxtLink
        v-for="card in todoCards"
        :key="card.key"
        :to="cardPath(card.to, card.query)"
        class="rounded-xl border border-default bg-elevated p-5 transition hover:border-primary/40"
        :data-testid="`workbench-todo-${card.key}`"
      >
        <p class="text-sm font-semibold text-muted">
          {{ $t(card.labelKey) }}
        </p>
        <p
          class="mt-2 text-4xl font-extrabold tabular-nums tracking-tight"
          :class="warnTone(card.key) ? 'text-warning' : 'text-highlighted'"
        >
          {{ displayValue(card.key) }}
        </p>
        <p class="mt-2 text-xs text-dimmed">
          {{ cardFailed(card.key) ? $t('workbench.loadFailed') : $t('workbench.openList') }}
        </p>
      </NuxtLink>
    </div>

    <h2 class="mb-3 text-sm font-semibold text-highlighted">
      {{ $t('workbench.statusTitle') }}
    </h2>

    <div
      v-if="pending"
      class="mb-6 grid gap-2.5 sm:grid-cols-3"
      data-testid="workbench-status-loading"
    >
      <div
        v-for="n in 3"
        :key="`status-skel-${n}`"
        class="h-24 animate-pulse rounded-xl border border-default bg-muted/40"
      />
    </div>

    <div
      v-else
      class="mb-6 grid gap-2.5 sm:grid-cols-3"
      data-testid="workbench-status-grid"
    >
      <NuxtLink
        v-for="card in statusCards"
        :key="card.key"
        :to="cardPath(card.to, card.query)"
        class="rounded-xl border border-default bg-elevated p-3.5 transition hover:border-primary/40"
        :data-testid="`workbench-status-${card.key}`"
      >
        <p class="text-xs font-semibold text-muted">
          {{ $t(card.labelKey) }}
        </p>
        <p class="mt-1 text-2xl font-extrabold tabular-nums text-highlighted">
          {{ displayValue(card.key) }}
        </p>
        <p class="mt-1.5 text-[10px] text-dimmed">
          {{ cardFailed(card.key) ? $t('workbench.loadFailed') : $t('workbench.openList') }}
        </p>
      </NuxtLink>
    </div>

    <p
      v-if="pending"
      class="mb-4 text-xs text-dimmed"
    >
      {{ $t('workbench.loading') }}
    </p>

    <details
      class="rounded-xl border border-default bg-elevated px-3 py-2 text-sm text-muted"
      data-testid="workbench-demo-details"
    >
      <summary class="cursor-pointer font-semibold text-default">
        {{ $t('workbench.demoDetails') }}
      </summary>
      <p class="mt-2 text-xs text-dimmed">
        {{ $t('workbench.demoHint') }}
      </p>

      <h3 class="mt-4 mb-3 text-sm font-semibold text-highlighted">
        {{ $t('workbench.flowTitle') }}
      </h3>
      <div class="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
        <template
          v-for="(step, index) in demoSteps"
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

      <h3 class="mb-3 text-sm font-semibold text-highlighted">
        {{ $t('table.queue') }}
      </h3>
      <AdminTable :empty="!demoQueue.length">
        <template #head>
          <tr>
            <th class="whitespace-nowrap">
              {{ $t('col.case') }}
            </th>
            <th>{{ $t('col.customer') }}</th>
            <th class="whitespace-nowrap">
              {{ $t('col.plan') }}
            </th>
            <th
              v-if="showOrg"
            >
              {{ $t('col.org') }}
            </th>
            <th class="whitespace-nowrap">
              {{ $t('col.status') }}
            </th>
            <th class="whitespace-nowrap">
              {{ $t('col.next') }}
            </th>
          </tr>
        </template>
        <tr
          v-for="row in demoQueue"
          :key="row.id"
          class="border-b border-default last:border-0"
        >
          <td class="whitespace-nowrap font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td>
            <div>{{ customerName(row) }}</div>
            <div class="text-sm text-dimmed">
              {{ row.appointmentAt }}
            </div>
          </td>
          <td class="whitespace-nowrap">
            {{ $t(`plan.${row.planId}`) }}
          </td>
          <td
            v-if="showOrg"
            class="text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td class="whitespace-nowrap">
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="CASE_STATUS_COLOR[row.status]"
            />
          </td>
          <td class="whitespace-nowrap">
            <NextActionButton
              :to="nextTo(row.status)"
              :label="nextLabel(row.status)"
            />
          </td>
        </tr>
      </AdminTable>
    </details>
  </PageHeader>
</template>
