<script setup lang="ts">
import { AdminApiError, adminListExpertCaseReviews } from '~/utils/admin-api'
import {
  expertCaseMemberName,
  expertCaseUserId,
  formatExpertCaseListTime,
  isExpertCaseDemoRow,
  shortExpertCaseId
} from '~/utils/expert-case-list-display'
import { caseStatusLabel } from '~/utils/expert-case-labels'
import { readOperatorToken } from '~/utils/operator-session'

const FILTER_ANY = 'all'
const PAGE_SIZE = 20
const STATUS_FILTERS = new Set(['awaiting_review', 'reviewed'])

const config = useRuntimeConfig()
const localePath = useLocalePath()
const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const rows = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')

function statusFromQuery() {
  const raw = route.query.status
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  if (typeof value === 'string' && STATUS_FILTERS.has(value)) {
    return value
  }
  return FILTER_ANY
}

const filterStatus = ref(statusFromQuery())
let loadSeq = 0

const filterChips = computed(() => [
  { label: t('expertCaseReviews.filterAll'), value: FILTER_ANY },
  { label: t('expertCaseReviews.filterAwaiting'), value: 'awaiting_review' },
  { label: t('expertCaseReviews.filterReviewed'), value: 'reviewed' }
])

if (import.meta.client) {
  watch(filterStatus, () => {
    void load()
  }, { immediate: true })
}

async function load() {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rows.value = []
    errorMessage.value = t('expertCaseReviews.failed')
    pending.value = false
    return
  }
  pending.value = true
  errorMessage.value = ''
  try {
    const query: { status?: string, limit: number } = { limit: PAGE_SIZE }
    if (filterStatus.value !== FILTER_ANY) {
      query.status = filterStatus.value
    }
    const list = await adminListExpertCaseReviews(config.public.apiBase, token, query)
    if (seq !== loadSeq) {
      return
    }
    rows.value = list
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    rows.value = []
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('expertCaseReviews.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function statusDisplay(status: unknown) {
  return caseStatusLabel(status, t)
}

function statusColor(status: unknown): 'success' | 'warning' | 'neutral' {
  if (status === 'reviewed') {
    return 'success'
  }
  if (status === 'awaiting_review') {
    return 'warning'
  }
  return 'neutral'
}

function detailPath(row: Record<string, unknown>) {
  return localePath(`/expert-case-reviews/${row.id}`)
}

function openRow(row: Record<string, unknown>) {
  void router.push(detailPath(row))
}
</script>

<template>
  <PageHeader
    :title="$t('expertCaseReviews.title')"
    :description="$t('expertCaseReviews.subtitle')"
  >
    <div
      v-if="errorMessage"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      data-testid="expert-case-error"
    >
      <div class="flex min-w-0 items-center gap-2">
        <UIcon
          name="i-lucide-triangle-alert"
          class="size-4 shrink-0"
        />
        <span>{{ errorMessage }}</span>
      </div>
      <UButton
        color="neutral"
        variant="soft"
        size="sm"
        data-testid="expert-case-retry"
        @click="load"
      >
        {{ $t('expertCaseReviews.retry') }}
      </UButton>
    </div>

    <div
      class="mb-4 flex flex-wrap items-center gap-2"
      role="group"
      :aria-label="$t('expertCaseReviews.filterGroup')"
      data-testid="expert-case-status-filter"
    >
      <UButton
        v-for="chip in filterChips"
        :key="chip.value"
        size="sm"
        :color="filterStatus === chip.value ? 'primary' : 'neutral'"
        :variant="filterStatus === chip.value ? 'soft' : 'outline'"
        :data-testid="`expert-case-filter-${chip.value}`"
        @click="filterStatus = chip.value"
      >
        {{ chip.label }}
      </UButton>
    </div>

    <div
      v-if="pending"
      class="overflow-hidden rounded-xl border border-default bg-elevated"
      data-testid="expert-case-loading"
    >
      <table class="app-table w-full min-w-[40rem] text-left text-base">
        <thead class="border-b border-default bg-muted/40 text-sm text-muted">
          <tr>
            <th>{{ $t('expertCaseReviews.colUser') }}</th>
            <th>{{ $t('expertCaseReviews.colStatus') }}</th>
            <th>{{ $t('expertCaseReviews.colCreated') }}</th>
            <th>{{ $t('expertCaseReviews.colReviewed') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="n in 5"
            :key="n"
            class="border-b border-default last:border-0"
          >
            <td class="py-3">
              <USkeleton class="mb-2 h-4 w-28" />
              <USkeleton class="h-3 w-40" />
            </td>
            <td><USkeleton class="h-6 w-24 rounded-full" /></td>
            <td><USkeleton class="h-4 w-32" /></td>
            <td><USkeleton class="h-4 w-32" /></td>
            <td><USkeleton class="ml-auto h-8 w-16" /></td>
          </tr>
        </tbody>
      </table>
    </div>

    <EmptyPanel
      v-else-if="errorMessage"
      dashed
      :title="$t('expertCaseReviews.errorTitle')"
      :description="$t('expertCaseReviews.errorBody')"
      data-testid="expert-case-error-empty"
    >
      <UButton
        icon="i-lucide-refresh-cw"
        @click="load"
      >
        {{ $t('expertCaseReviews.refresh') }}
      </UButton>
    </EmptyPanel>

    <EmptyPanel
      v-else-if="!rows.length"
      dashed
      :title="$t('expertCaseReviews.emptyTitle')"
      :description="$t('expertCaseReviews.emptyBody')"
      data-testid="expert-case-empty"
    >
      <UButton
        icon="i-lucide-refresh-cw"
        variant="soft"
        @click="load"
      >
        {{ $t('expertCaseReviews.refresh') }}
      </UButton>
    </EmptyPanel>

    <div
      v-else
      class="overflow-hidden rounded-xl border border-default bg-elevated"
      data-testid="expert-case-table"
    >
      <div class="overflow-x-auto">
        <table class="app-table w-full min-w-[40rem] text-left text-base">
          <thead class="border-b border-default bg-muted/40 text-sm text-muted">
            <tr>
              <th class="w-[32%]">
                {{ $t('expertCaseReviews.colUser') }}
              </th>
              <th>{{ $t('expertCaseReviews.colStatus') }}</th>
              <th>{{ $t('expertCaseReviews.colCreated') }}</th>
              <th>{{ $t('expertCaseReviews.colReviewed') }}</th>
              <th class="text-end">
                {{ $t('col.actions') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="String(row.id)"
              class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
              :data-testid="`expert-case-row-${row.id}`"
              @click="openRow(row)"
            >
              <td class="py-3">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="font-semibold text-highlighted">
                    {{ expertCaseMemberName(row) }}
                  </p>
                  <UBadge
                    v-if="isExpertCaseDemoRow(row)"
                    color="neutral"
                    variant="subtle"
                    class="text-xs font-medium"
                    data-testid="expert-case-demo-chip"
                  >
                    {{ $t('expertCaseReviews.demoChip') }}
                  </UBadge>
                </div>
                <p class="mt-0.5 font-mono text-xs text-muted">
                  {{ shortExpertCaseId(expertCaseUserId(row) || row.user_id) }}
                </p>
              </td>
              <td>
                <span :title="statusDisplay(row.status).title || undefined">
                  <StatusBadge
                    :label="statusDisplay(row.status).text"
                    :color="statusColor(row.status)"
                  />
                </span>
              </td>
              <td class="whitespace-nowrap text-sm text-muted">
                {{ formatExpertCaseListTime(row.created_at) }}
              </td>
              <td class="whitespace-nowrap text-sm text-muted">
                {{ formatExpertCaseListTime(row.reviewed_at) }}
              </td>
              <td
                class="text-end"
                @click.stop
              >
                <UButton
                  size="sm"
                  variant="soft"
                  :to="detailPath(row)"
                  data-testid="expert-case-open"
                >
                  {{ $t('expertCaseReviews.open') }}
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </PageHeader>
</template>
