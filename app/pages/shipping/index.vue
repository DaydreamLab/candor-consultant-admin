<script setup lang="ts">
import type { ApiShipStatus, ShipmentRow } from '~/types/admin'
import { AdminApiError } from '~/utils/admin-api'
import { formatLocalDateTime } from '~/utils/format-local-datetime'
import { readOperatorToken } from '~/utils/operator-session'
import { adminListShipments } from '~/utils/shipment-api'
import { displayOrderNo } from '~/utils/shipment-map'
import { shipmentUpdatedAt } from '~/utils/shipping-display'

type ShipColumn = 'number' | 'recipient' | 'status' | 'tracking' | 'updatedAt' | 'item'
type BadgeColor = 'error' | 'primary' | 'success' | 'info' | 'warning' | 'neutral'
type BadgeVariant = 'outline' | 'soft'
type ColumnAlign = 'left' | 'center' | 'right'

const PAGE_SIZE = 10
const FETCH_SIZE = 50
const FILTER_ANY = 'all'
const API_SHIP_STATUSES = ['picking', 'in_transit', 'arrived'] as const
const API_STATUS_SET = new Set<string>(API_SHIP_STATUSES)

const STATUS_BADGE: Record<ApiShipStatus, { color: BadgeColor, variant: BadgeVariant }> = {
  picking: { color: 'info', variant: 'soft' },
  in_transit: { color: 'primary', variant: 'soft' },
  arrived: { color: 'success', variant: 'soft' }
}

const config = useRuntimeConfig()
const localePath = useLocalePath()
const route = useRoute()
const { t } = useI18n()

const shipments = ref<ShipmentRow[]>([])
const pending = ref(true)
const errorMessage = ref('')
const page = ref(1)
const hasMore = ref(false)
let loadSeq = 0
let nextOffset = 0

function queryString(name: string) {
  const raw = route.query[name]
  const value = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : ''
  return typeof value === 'string' ? value : ''
}

const filterStatus = ref(
  API_STATUS_SET.has(queryString('status')) ? queryString('status') : FILTER_ANY
)
const filterQ = ref(initialSearchQ())
const filterFrom = ref('')
const filterTo = ref('')
const debouncedQ = ref(filterQ.value.trim())

let qTimer: ReturnType<typeof setTimeout> | null = null

function initialSearchQ() {
  return queryString('q').trim()
}

const deepLinkShipmentId = computed(() => {
  const shipment = queryString('shipment').trim() || queryString('id').trim()
  return shipment
})

const columns: { key: ShipColumn, align: ColumnAlign, width?: string, truncate?: boolean }[] = [
  { key: 'number', align: 'left', width: 'w-[13.5rem]' },
  { key: 'recipient', align: 'left', width: 'w-[8rem]', truncate: true },
  { key: 'status', align: 'center', width: 'w-[7rem]' },
  { key: 'tracking', align: 'left', width: 'w-[10rem]', truncate: true },
  { key: 'updatedAt', align: 'left', width: 'w-[9.5rem]' },
  { key: 'item', align: 'left', truncate: true }
]

const statusOptions = computed(() => [
  { label: t('shipping.filters.any'), value: FILTER_ANY },
  ...API_SHIP_STATUSES.map(value => ({
    label: t(`orders.shipmentStatus.${value}`),
    value
  }))
])

const rows = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return shipments.value.slice(start, start + PAGE_SIZE)
})
const paginationTotal = computed(() => shipments.value.length + (hasMore.value ? 1 : 0))

if (import.meta.client) {
  watch(deepLinkShipmentId, (id) => {
    if (!id) {
      return
    }
    void navigateTo(localePath(`/shipping/${encodeURIComponent(id)}`), { replace: true })
  }, { immediate: true })

  watch(filterQ, (value) => {
    if (qTimer) {
      clearTimeout(qTimer)
    }
    qTimer = setTimeout(() => {
      debouncedQ.value = value.trim()
    }, 300)
  })

  watch(
    [filterStatus, debouncedQ, filterFrom, filterTo],
    () => {
      if (deepLinkShipmentId.value) {
        return
      }
      void load(true)
    },
    { immediate: true }
  )
}

onUnmounted(() => {
  if (qTimer) {
    clearTimeout(qTimer)
  }
})

async function load(reset: boolean) {
  const seq = ++loadSeq
  const token = readOperatorToken()
  if (!token) {
    shipments.value = []
    hasMore.value = false
    errorMessage.value = t('shipping.failed')
    pending.value = false
    return
  }

  if (reset) {
    shipments.value = []
    page.value = 1
    nextOffset = 0
    hasMore.value = false
  }

  pending.value = true
  errorMessage.value = ''
  try {
    const fetched = await adminListShipments(config.public.apiBase, token, {
      status: filterStatus.value === FILTER_ANY ? undefined : filterStatus.value,
      q: debouncedQ.value || undefined,
      from: dateBound(filterFrom.value, 'start'),
      to: dateBound(filterTo.value, 'end'),
      limit: FETCH_SIZE,
      offset: nextOffset
    })
    if (seq !== loadSeq) {
      return
    }
    if (!reset && fetched.length === 0) {
      hasMore.value = false
      page.value = Math.max(1, Math.ceil(shipments.value.length / PAGE_SIZE))
      return
    }
    shipments.value = reset ? fetched : [...shipments.value, ...fetched]
    nextOffset += fetched.length
    hasMore.value = fetched.length >= FETCH_SIZE
  } catch (error) {
    if (seq !== loadSeq) {
      return
    }
    shipments.value = []
    hasMore.value = false
    const message = error instanceof AdminApiError ? error.message.trim() : ''
    errorMessage.value = message || t('shipping.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function dateBound(value: string, edge: 'start' | 'end') {
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }
  return edge === 'start' ? `${trimmed}T00:00:00` : `${trimmed}T23:59:59`
}

function goToPage(next: number) {
  if (pending.value || next < 1 || next === page.value) {
    return
  }
  page.value = next
  const start = (next - 1) * PAGE_SIZE
  if (start >= shipments.value.length && hasMore.value) {
    void load(false)
  }
}

function rowKey(row: ShipmentRow, index: number) {
  return row.id || `ship-${index}`
}

function openRow(row: ShipmentRow) {
  const id = typeof row.id === 'string' ? row.id.trim() : ''
  if (!id) {
    return
  }
  void navigateTo(localePath(`/shipping/${encodeURIComponent(id)}`))
}

function columnLabel(key: ShipColumn) {
  return t(`shipping.columns.${key}`)
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

function cellClass(column: { key: ShipColumn, align: ColumnAlign, truncate?: boolean }) {
  const classes = [alignClass(column.align)]
  if (column.truncate) {
    classes.push('truncate')
  }
  if (column.key === 'number') {
    classes.push('font-medium text-highlighted')
  } else if (column.key === 'updatedAt') {
    classes.push('text-muted')
  }
  return classes.filter(Boolean).join(' ')
}

function isBadgeColumn(key: ShipColumn) {
  return key === 'status'
}

function apiStatusOf(row: ShipmentRow): ApiShipStatus | null {
  if (row.apiStatus) {
    return row.apiStatus
  }
  if (row.status === 'picking' || row.status === 'in_transit') {
    return row.status
  }
  if (row.status === 'delivered') {
    return 'arrived'
  }
  return null
}

function badgeOf(row: ShipmentRow) {
  const value = apiStatusOf(row)
  const style = value
    ? STATUS_BADGE[value]
    : { color: 'neutral' as const, variant: 'outline' as const }
  return {
    label: statusLabel(value),
    color: style.color,
    variant: style.variant
  }
}

function statusLabel(value: ApiShipStatus | null) {
  if (!value) {
    return t('status.na')
  }
  const key = `orders.shipmentStatus.${value}`
  const translated = t(key)
  return translated === key ? value : translated
}

function cellText(row: ShipmentRow, key: ShipColumn) {
  switch (key) {
    case 'number':
      return displayOrderNo(row)
    case 'recipient':
      return row.customer.trim() || t('status.na')
    case 'tracking':
      return row.tracking?.trim() || t('status.na')
    case 'updatedAt':
      return updatedOf(row)
    case 'item':
      return row.packagePlanName?.trim() || t('status.na')
    case 'status':
      return ''
  }
}

function updatedOf(row: ShipmentRow) {
  if (row.updatedAt?.trim()) {
    return formatLocalDateTime(row.updatedAt, { style: 'list', empty: t('status.na') })
  }
  const fromEvents = shipmentUpdatedAt(row.events, row.shippedAt)
  if (fromEvents) {
    return formatLocalDateTime(fromEvents, { style: 'list', empty: t('status.na') })
  }
  return t('status.na')
}
</script>

<template>
  <PageHeader
    :title="$t('nav.shipping')"
    plain
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-end gap-3 rounded-xl border border-default bg-elevated p-4">
        <div class="min-w-40 grow basis-40">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('shipping.filters.q') }}
          </label>
          <UInput
            v-model="filterQ"
            icon="i-lucide-search"
            :placeholder="$t('shipping.filters.qPlaceholder')"
            class="w-full"
            data-testid="shipping-search"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('shipping.filters.status') }}
          </label>
          <USelect
            v-model="filterStatus"
            :items="statusOptions"
            value-key="value"
            class="w-full"
            data-testid="shipping-status-filter"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('shipping.filters.from') }}
          </label>
          <UInput
            v-model="filterFrom"
            type="date"
            class="w-full"
          />
        </div>
        <div class="min-w-36">
          <label class="mb-1 block text-xs text-muted">
            {{ $t('shipping.filters.to') }}
          </label>
          <UInput
            v-model="filterTo"
            type="date"
            class="w-full"
          />
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="text-sm text-error"
        data-testid="shipping-error"
      >
        {{ errorMessage }}
      </p>
      <p
        v-else-if="pending && !shipments.length"
        class="text-sm text-muted"
        data-testid="shipping-loading"
      >
        {{ $t('shipping.loading') }}
      </p>
      <template v-else>
        <p
          v-if="!shipments.length"
          class="rounded-xl border border-default bg-elevated p-10 text-center text-base text-muted"
          data-testid="shipping-empty"
        >
          {{ $t('shipping.empty') }}
        </p>
        <AdminTable
          v-else
          compact
          fixed
          data-testid="shipping-table"
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
            :class="row.id ? 'cursor-pointer hover:bg-muted/40' : ''"
            :data-testid="`shipping-row-${row.id}`"
            @click="openRow(row)"
          >
            <td
              v-for="column in columns"
              :key="column.key"
              :class="cellClass(column)"
              :title="column.truncate ? cellText(row, column.key) : undefined"
            >
              <UBadge
                v-if="isBadgeColumn(column.key)"
                size="sm"
                v-bind="badgeOf(row)"
              />
              <template v-else>
                {{ cellText(row, column.key) }}
              </template>
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
