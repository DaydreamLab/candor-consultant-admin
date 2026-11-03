<script setup lang="ts">
import {
  AdminApiError,
  adminConfirmRefundRequest,
  adminListRefundRequests,
  adminRejectRefundRequest
} from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { money } from '~/utils/format'
import { readOperatorToken } from '~/utils/operator-session'

type RefundColumn = 'order' | 'status' | 'amount' | 'createdAt' | 'actions'
type ColumnAlign = 'left' | 'center' | 'right'

const FILTER_ANY = 'all'
const PAGE_SIZE = 10
const FETCH_SIZE = 50
const REFUND_STATUSES = ['requested', 'refunded', 'rejected'] as const
const STATUS_FILTERS = new Set<string>(REFUND_STATUSES)

const config = useRuntimeConfig()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()
const session = useSessionStore()
const feedback = useOpsFeedback()

const rowsAll = ref<Record<string, unknown>[]>([])
const pending = ref(true)
const errorMessage = ref('')
const page = ref(1)
const hasMore = ref(false)
const actionId = ref<string | null>(null)
let loadSeq = 0
let nextOffset = 0

const canOps = computed(() => {
  const role = session.operator?.role
  return role === 'ops' || role === 'admin'
})

function queryString(name: string) {
  const raw = route.query[name]
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  return typeof value === 'string' ? value : ''
}

const filterStatus = ref(
  STATUS_FILTERS.has(queryString('status')) ? queryString('status') : FILTER_ANY
)

const columns: { key: RefundColumn, align: ColumnAlign, width?: string }[] = [
  { key: 'order', align: 'left', width: 'w-[28%]' },
  { key: 'status', align: 'left', width: 'w-[8rem]' },
  { key: 'amount', align: 'right', width: 'w-[8rem]' },
  { key: 'createdAt', align: 'left', width: 'w-[10rem]' },
  { key: 'actions', align: 'right', width: 'w-[14rem]' }
]

const statusOptions = computed(() => [
  { label: t('refundRequests.filters.any'), value: FILTER_ANY },
  { label: t('refundRequests.status.requested'), value: 'requested' },
  { label: t('refundRequests.status.refunded'), value: 'refunded' },
  { label: t('refundRequests.status.rejected'), value: 'rejected' }
])

const rows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return rowsAll.value.slice(start, start + PAGE_SIZE)
})
const paginationTotal = computed(() => rowsAll.value.length + (hasMore.value ? 1 : 0))

if (import.meta.client) {
  watch(filterStatus, () => {
    void load(true)
  }, { immediate: true })
}

async function load(reset: boolean) {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    rowsAll.value = []
    hasMore.value = false
    errorMessage.value = t('refundRequests.failed')
    pending.value = false
    return
  }

  if (reset) {
    rowsAll.value = []
    page.value = 1
    nextOffset = 0
    hasMore.value = false
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const fetched = await adminListRefundRequests(config.public.apiBase, token, {
      status: filterStatus.value === FILTER_ANY ? undefined : filterStatus.value,
      limit: FETCH_SIZE,
      offset: nextOffset
    })
    if (seq !== loadSeq) {
      return
    }
    if (!reset && fetched.length === 0) {
      hasMore.value = false
      page.value = Math.max(1, Math.ceil(rowsAll.value.length / PAGE_SIZE))
      return
    }
    rowsAll.value = reset ? fetched : [...rowsAll.value, ...fetched]
    nextOffset += fetched.length
    hasMore.value = fetched.length >= FETCH_SIZE
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    rowsAll.value = []
    hasMore.value = false
    errorMessage.value = error instanceof AdminApiError && error.message
      ? error.message
      : t('refundRequests.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function goToPage(next: number) {
  if (pending.value || next < 1 || next === page.value) {
    return
  }
  page.value = next
  const start = (next - 1) * PAGE_SIZE
  if (start >= rowsAll.value.length && hasMore.value) {
    void load(false)
  }
}

function columnLabel(key: RefundColumn) {
  switch (key) {
    case 'order':
      return t('refundRequests.columns.order')
    case 'status':
      return t('refundRequests.columns.status')
    case 'amount':
      return t('refundRequests.columns.amount')
    case 'createdAt':
      return t('refundRequests.columns.createdAt')
    case 'actions':
      return t('col.actions')
  }
}

function alignClass(align: ColumnAlign) {
  if (align === 'center') {
    return 'text-center'
  }
  if (align === 'right') {
    return 'text-right'
  }
  return ''
}

function rowKey(row: Record<string, unknown>, index: number) {
  const id = row.id
  return typeof id === 'string' && id.trim() ? id : `refund-${index}`
}

function refundId(row: Record<string, unknown>) {
  return typeof row.id === 'string' ? row.id : ''
}

function orderLabel(row: Record<string, unknown>) {
  const orderNo = textOf(row.order_no) || textOf(row.order_number)
  const orderId = textOf(row.order_id)
  return orderNo || orderId || t('status.na')
}

function orderPath(row: Record<string, unknown>) {
  const orderId = textOf(row.order_id)
  return orderId ? localePath(`/orders/${encodeURIComponent(orderId)}`) : undefined
}

function statusLabel(status: unknown) {
  const key = typeof status === 'string' ? status.trim() : ''
  if (!key) {
    return t('status.na')
  }
  const path = `refundRequests.status.${key}`
  const translated = t(path)
  return translated === path ? key : translated
}

function statusColor(status: unknown): 'warning' | 'success' | 'error' | 'neutral' {
  if (status === 'requested') {
    return 'warning'
  }
  if (status === 'refunded') {
    return 'success'
  }
  if (status === 'rejected') {
    return 'error'
  }
  return 'neutral'
}

function amountOf(row: Record<string, unknown>) {
  const n = numberOf(row.amount ?? row.amount_total ?? row.order_amount)
  return n == null ? t('status.na') : money(n)
}

function canAct(row: Record<string, unknown>) {
  return canOps.value && row.status === 'requested'
}

async function onConfirm(row: Record<string, unknown>) {
  const id = refundId(row)
  const token = readOperatorToken()
  if (!id || !token || !canAct(row) || actionId.value) {
    return
  }
  actionId.value = id
  try {
    const updated = await adminConfirmRefundRequest(config.public.apiBase, token, id)
    replaceRow(id, updated)
    feedback.notify({
      title: t('refundRequests.confirmOk'),
      color: 'success'
    })
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('refundRequests.confirmFailed'),
      color: 'error'
    })
  } finally {
    actionId.value = null
  }
}

async function onReject(row: Record<string, unknown>) {
  const id = refundId(row)
  const token = readOperatorToken()
  if (!id || !token || !canAct(row) || actionId.value) {
    return
  }
  actionId.value = id
  try {
    const updated = await adminRejectRefundRequest(config.public.apiBase, token, id)
    replaceRow(id, updated)
    feedback.notify({
      title: t('refundRequests.rejectOk'),
      color: 'success'
    })
  } catch (error) {
    feedback.notify({
      title: error instanceof AdminApiError && error.message
        ? error.message
        : t('refundRequests.rejectFailed'),
      color: 'error'
    })
  } finally {
    actionId.value = null
  }
}

function replaceRow(id: string, updated: Record<string, unknown>) {
  rowsAll.value = rowsAll.value.map((row) => {
    return refundId(row) === id ? { ...row, ...updated } : row
  })
}

function textOf(value: unknown) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }
  return ''
}

function numberOf(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
    return Number(value)
  }
  return null
}
</script>

<template>
  <PageHeader
    :title="$t('nav.refundRequests')"
    :description="$t('refundRequests.description')"
    plain
  >
    <div
      class="flex flex-col gap-4"
      data-testid="refund-requests-page"
    >
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <div
          class="min-w-36"
          data-testid="refund-requests-status-filter"
        >
          <label class="mb-1 block text-xs text-muted">
            {{ $t('refundRequests.filters.status') }}
          </label>
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            class="w-full"
          />
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
        data-testid="refund-requests-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending && !rowsAll.length"
        class="text-sm text-muted"
        data-testid="refund-requests-loading"
      >
        {{ $t('refundRequests.loading') }}
      </p>
      <template v-else>
        <p
          v-if="!rowsAll.length"
          class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
          data-testid="refund-requests-empty"
        >
          {{ $t('refundRequests.empty') }}
        </p>
        <AdminTable
          v-else
          compact
          fixed
          data-testid="refund-requests-table"
        >
          <template #colgroup>
            <colgroup>
              <col
                v-for="column in columns"
                :key="column.key"
                :class="column.width"
              >
            </colgroup>
          </template>
          <template #head>
            <tr>
              <th
                v-for="column in columns"
                :key="column.key"
                :class="[column.width, alignClass(column.align)]"
              >
                {{ columnLabel(column.key) }}
              </th>
            </tr>
          </template>
          <tr
            v-for="(row, index) in rows"
            :key="rowKey(row, index)"
            class="border-b border-default last:border-0"
            :data-testid="`refund-request-row-${refundId(row) || index}`"
          >
            <td class="py-3">
              <NuxtLink
                v-if="orderPath(row)"
                :to="orderPath(row)"
                class="font-semibold text-primary hover:underline"
              >
                {{ orderLabel(row) }}
              </NuxtLink>
              <span
                v-else
                class="font-semibold text-highlighted"
              >{{ orderLabel(row) }}</span>
            </td>
            <td>
              <StatusBadge
                :label="statusLabel(row.status)"
                :color="statusColor(row.status)"
              />
            </td>
            <td class="tabular-money text-right font-medium text-highlighted">
              {{ amountOf(row) }}
            </td>
            <td class="whitespace-nowrap text-sm text-muted">
              {{ formatLocalDateTime(row.created_at, { style: 'full' }) }}
            </td>
            <td class="text-end">
              <div
                v-if="canAct(row)"
                class="inline-flex flex-wrap items-center justify-end gap-2"
              >
                <UButton
                  size="sm"
                  color="warning"
                  variant="soft"
                  :loading="actionId === refundId(row)"
                  :disabled="Boolean(actionId) && actionId !== refundId(row)"
                  data-testid="refund-request-confirm"
                  @click="onConfirm(row)"
                >
                  {{ $t('refundRequests.actions.confirm') }}
                </UButton>
                <UButton
                  size="sm"
                  color="neutral"
                  variant="outline"
                  :loading="actionId === refundId(row)"
                  :disabled="Boolean(actionId) && actionId !== refundId(row)"
                  data-testid="refund-request-reject"
                  @click="onReject(row)"
                >
                  {{ $t('refundRequests.actions.reject') }}
                </UButton>
              </div>
              <span
                v-else
                class="text-sm text-muted"
              >{{ $t('status.na') }}</span>
            </td>
          </tr>
          <template #footer>
            <div class="flex justify-end border-t border-default px-4 py-3">
              <UPagination
                :page="page"
                :items-per-page="PAGE_SIZE"
                :total="paginationTotal"
                :disabled="pending"
                @update:page="goToPage"
              />
            </div>
          </template>
        </AdminTable>
      </template>
    </div>
  </PageHeader>
</template>
