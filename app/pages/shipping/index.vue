<script setup lang="ts">
import type { TimelineItem, FormSubmitEvent } from '@nuxt/ui'
import { SHIP_STATUS_COLOR } from '~/utils/labels'
import { shipmentSchema } from '~/utils/schemas'
import type { ShipmentForm } from '~/utils/schemas'
import type { ShipmentRow, ShipStatus } from '~/types/admin'
import { SHIP_FLOW } from '~/utils/demo'
import { readOperatorToken } from '~/utils/operator-session'
import { loadAdminShippingRows } from '~/utils/shipment-api'
import {
  displayOrderNo,
  shipmentSearchHaystack
} from '~/utils/shipment-map'
import {
  itemsSummary,
  orderNoFromCaseId,
  shipmentUpdatedAt
} from '~/utils/shipping-display'

const FILTER_ANY = 'all'

const config = useRuntimeConfig()
const { locale, t } = useI18n()
const route = useRoute()
const { moduleDesc } = usePageCopy()
const { scoped, showOrg, orgLabel, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { shipStatusOptions } = useSelectOptions()

const selectedId = ref<string | null>(null)
const creating = ref(false)
const openIds = ref<string[]>([])
const deleteId = ref<string | null>(null)
const state = reactive<Partial<ShipmentForm>>({})
const filterStatus = ref<string>(FILTER_ANY)
const searchQ = ref('')
const pending = ref(true)
const errorMessage = ref('')
const highlightId = ref<string | null>(null)
const apiRows = ref<ShipmentRow[]>([])
const usingApi = ref(false)
let loadSeq = 0

const mockWritable = computed(() => writable.value && !usingApi.value)

const allRows = computed(() => {
  if (usingApi.value) {
    return apiRows.value
  }
  return scoped(ops.shipments).map(row => ({ ...row, source: 'mock' as const }))
})

const statusFilterOptions = computed(() => [
  { label: t('shipping.filterAny'), value: FILTER_ANY },
  ...shipStatusOptions.value
])

const rows = computed(() => {
  const q = searchQ.value.trim().toLowerCase()
  return allRows.value.filter((row) => {
    if (filterStatus.value !== FILTER_ANY && row.status !== filterStatus.value) {
      return false
    }
    if (!q) {
      return true
    }
    return shipmentSearchHaystack(row).includes(q)
  })
})

const selected = computed(() => allRows.value.find(row => row.id === selectedId.value) ?? null)
const detailOpen = computed(() => creating.value || Boolean(selected.value))

const caseOptions = computed(() => {
  const shipped = new Set(ops.shipments.map(row => row.caseId))
  return scoped(ops.cases)
    .filter(row => row.planId === 'premium' && (row.status === 'ship_due' || row.status === 'keyin_due' || shipped.has(row.id)))
    .map(row => ({
      label: `${orderNoFromCaseId(row.id)} · ${locale.value === 'en' ? row.customerEn : row.customer}`,
      value: row.id
    }))
})

function itemLabel(sku: string) {
  const item = ops.productOf(sku)
  if (!item) {
    return sku
  }
  return locale.value === 'en' ? item.aLabelEn : item.aLabel
}

function summaryOf(row: ShipmentRow) {
  return itemsSummary(
    row.items,
    itemLabel,
    n => t('shipping.itemsMore', { n })
  )
}

function updatedOf(row: ShipmentRow) {
  return shipmentUpdatedAt(row.events, row.shippedAt) || t('status.na')
}

function itemsLine(row: ShipmentRow) {
  return row.items
    .map(item => `${itemLabel(item.sku)} ×${item.qty}`)
    .join(', ')
}

function timelineItems(row: ShipmentRow): TimelineItem[] {
  const byStatus = new Map(row.events.map(event => [event.status, event.at]))
  const currentIndex = SHIP_FLOW.indexOf(row.status)
  return SHIP_FLOW.map((status, index) => ({
    value: status,
    date: String(index + 1),
    title: t(`status.${status}`),
    description: byStatus.get(status) ?? (index <= currentIndex ? t('status.na') : ''),
    icon: status === 'delivered' ? 'i-lucide-circle-check' : 'i-lucide-circle-dot'
  }))
}

function nextStatus(row: ShipmentRow): ShipStatus | null {
  const index = SHIP_FLOW.indexOf(row.status)
  return SHIP_FLOW[index + 1] ?? null
}

function fillCreate() {
  Object.assign(state, {
    caseId: caseOptions.value[0]?.value ?? '',
    status: 'picking',
    tracking: ''
  })
}

function fillEdit(row: ShipmentRow) {
  Object.assign(state, {
    caseId: row.caseId,
    status: row.status,
    tracking: row.tracking ?? ''
  })
}

function openCreate() {
  if (!mockWritable.value) {
    return
  }
  selectedId.value = null
  creating.value = true
  fillCreate()
}

function selectRow(row: ShipmentRow) {
  creating.value = false
  selectedId.value = row.id
  fillEdit(row)
}

function toggle(id: string) {
  if (openIds.value.includes(id)) {
    openIds.value = openIds.value.filter(item => item !== id)
    return
  }
  openIds.value = [...openIds.value, id]
}

function isOpen(id: string) {
  return openIds.value.includes(id)
}

function openRow(row: ShipmentRow) {
  if (!isOpen(row.id)) {
    toggle(row.id)
  }
  selectRow(row)
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<ShipmentForm>) {
  if (!mockWritable.value) {
    return
  }
  const data = event.data
  const saved = ops.saveShipment({
    id: selectedId.value ?? undefined,
    caseId: data.caseId,
    status: data.status,
    tracking: data.tracking || null,
    shippedAt: null
  })
  feedback.saved(data.caseId)
  creating.value = false
  if (saved) {
    selectedId.value = saved.id
    fillEdit(saved)
  }
}

function confirmDelete() {
  if (!deleteId.value || !mockWritable.value) {
    return
  }
  ops.removeShipment(deleteId.value)
  feedback.deleted(deleteId.value)
  if (selectedId.value === deleteId.value) {
    closeDetail()
  }
  openIds.value = openIds.value.filter(id => id !== deleteId.value)
  deleteId.value = null
}

function advance(row: ShipmentRow) {
  const next = nextStatus(row)
  if (!next || !mockWritable.value) {
    return
  }
  ops.saveShipment({
    id: row.id,
    caseId: row.caseId,
    status: next,
    tracking: row.tracking,
    shippedAt: row.shippedAt
  })
  feedback.saved(row.caseId)
}

async function load() {
  const seq = ++loadSeq
  pending.value = true
  errorMessage.value = ''
  try {
    const token = readOperatorToken()
    if (token) {
      try {
        const loaded = await loadAdminShippingRows(config.public.apiBase, token)
        if (seq !== loadSeq) {
          return
        }
        if (loaded.rows.length) {
          apiRows.value = loaded.rows
          usingApi.value = true
          return
        }
      } catch {
        // API unavailable / empty → mock fallback below so Pages demo still works.
      }
    }
    if (seq !== loadSeq) {
      return
    }
    apiRows.value = []
    usingApi.value = false
  } catch {
    if (seq !== loadSeq) {
      return
    }
    apiRows.value = []
    usingApi.value = false
    errorMessage.value = t('shipping.failed')
  } finally {
    if (seq === loadSeq) {
      pending.value = false
    }
  }
}

function findRowByQuery(id: string) {
  const needle = id.trim()
  return allRows.value.find(item => item.id === needle)
    ?? allRows.value.find(item => displayOrderNo(item) === needle)
    ?? allRows.value.find(item => item.orderNo === needle)
    ?? allRows.value.find(item => item.orderId === needle)
    ?? allRows.value.find(item => orderNoFromCaseId(item.caseId) === needle)
    ?? allRows.value.find(item => item.caseId === needle)
    ?? allRows.value.find(item => item.tracking === needle)
}

function applyRouteQuery() {
  const q = route.query.q
  if (typeof q === 'string' && q.trim()) {
    searchQ.value = q.trim()
  }
  const shipment = route.query.shipment ?? route.query.id
  if (typeof shipment === 'string' && shipment.trim()) {
    const id = shipment.trim()
    highlightId.value = id
    const row = findRowByQuery(id)
      ?? (typeof q === 'string' && q.trim() ? findRowByQuery(q.trim()) : undefined)
    if (row) {
      openIds.value = [row.id]
      selectRow(row)
      if (import.meta.client) {
        nextTick(() => {
          document.getElementById(`ship-row-${row.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
    }
  } else if (typeof q === 'string' && q.trim()) {
    const row = findRowByQuery(q.trim())
    if (row) {
      highlightId.value = row.id
      openIds.value = [row.id]
      selectRow(row)
      if (import.meta.client) {
        nextTick(() => {
          document.getElementById(`ship-row-${row.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        })
      }
    }
  }
}

function clearHighlightSoon() {
  if (!highlightId.value || !import.meta.client) {
    return
  }
  window.setTimeout(() => {
    highlightId.value = null
  }, 2400)
}

watch(allRows, (list) => {
  if (selectedId.value && !list.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
})

watch(() => route.fullPath, () => {
  if (import.meta.client && !pending.value) {
    applyRouteQuery()
  }
})

onMounted(async () => {
  await load()
  applyRouteQuery()
  clearHighlightSoon()
})
</script>

<template>
  <PageHeader
    :title="$t('nav.shipping')"
    :description="moduleDesc('shipping')"
  >
    <template #actions>
      <UButton
        icon="i-lucide-plus"
        :disabled="!mockWritable"
        data-testid="shipping-add"
        @click="openCreate"
      >
        {{ $t('shipping.add') }}
      </UButton>
    </template>

    <div
      v-if="errorMessage"
      class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error"
      data-testid="shipping-error"
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
        data-testid="shipping-retry"
        @click="load"
      >
        {{ $t('shipping.retry') }}
      </UButton>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <USelect
        v-model="filterStatus"
        :items="statusFilterOptions"
        value-key="value"
        label-key="label"
        class="w-44"
        data-testid="shipping-status-filter"
      />
      <UInput
        v-model="searchQ"
        icon="i-lucide-search"
        :placeholder="$t('shipping.searchPlaceholder')"
        class="min-w-64 flex-1"
        data-testid="shipping-search"
      />
    </div>

    <div
      class="grid items-start gap-5"
      :class="detailOpen ? 'lg:grid-cols-[minmax(28rem,1fr)_minmax(22rem,26rem)]' : ''"
    >
      <div class="min-w-0">
        <div
          v-if="pending"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
          data-testid="shipping-loading"
        >
          <table class="app-table w-full min-w-[52rem] text-left text-base">
            <thead class="border-b border-default bg-muted/40 text-sm text-muted">
              <tr>
                <th>{{ $t('shipping.colOrderMember') }}</th>
                <th>{{ $t('col.status') }}</th>
                <th>{{ $t('col.tracking') }}</th>
                <th>{{ $t('shipping.colUpdated') }}</th>
                <th>{{ $t('shipping.colItemsSummary') }}</th>
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
                <td><USkeleton class="h-6 w-16 rounded-full" /></td>
                <td><USkeleton class="h-4 w-28" /></td>
                <td><USkeleton class="h-4 w-32" /></td>
                <td><USkeleton class="h-4 w-36" /></td>
                <td><USkeleton class="ml-auto h-8 w-24" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <EmptyPanel
          v-else-if="errorMessage"
          dashed
          :title="$t('shipping.errorTitle')"
          :description="$t('shipping.errorBody')"
          data-testid="shipping-error-empty"
        >
          <UButton
            icon="i-lucide-refresh-cw"
            @click="load"
          >
            {{ $t('shipping.refresh') }}
          </UButton>
        </EmptyPanel>

        <EmptyPanel
          v-else-if="!rows.length"
          dashed
          :title="$t('shipping.emptyTitle')"
          :description="$t('shipping.emptyBody')"
          data-testid="shipping-empty"
        >
          <UButton
            v-if="mockWritable"
            icon="i-lucide-plus"
            @click="openCreate"
          >
            {{ $t('shipping.add') }}
          </UButton>
        </EmptyPanel>

        <div
          v-else
          class="overflow-hidden rounded-xl border border-default bg-elevated"
          data-testid="shipping-table"
        >
          <div class="overflow-x-auto">
            <table class="app-table w-full min-w-[52rem] text-left text-base">
              <thead class="border-b border-default bg-muted/40 text-sm text-muted">
                <tr>
                  <th class="w-[22%]">
                    {{ $t('shipping.colOrderMember') }}
                  </th>
                  <th>{{ $t('col.status') }}</th>
                  <th>{{ $t('col.tracking') }}</th>
                  <th>{{ $t('shipping.colUpdated') }}</th>
                  <th>{{ $t('shipping.colItemsSummary') }}</th>
                  <th class="text-end">
                    {{ $t('col.actions') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <template
                  v-for="row in rows"
                  :key="row.id"
                >
                  <tr
                    :id="`ship-row-${row.id}`"
                    class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
                    :class="[
                      row.id === selectedId ? 'bg-primary/5' : '',
                      highlightId === row.id ? 'ring-2 ring-inset ring-primary/50' : ''
                    ]"
                    :data-testid="`shipping-row-${row.id}`"
                    @click="openRow(row)"
                  >
                    <td class="py-3">
                      <div class="flex items-start gap-2">
                        <UIcon
                          :name="isOpen(row.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                          class="mt-1 size-4 shrink-0 text-muted"
                        />
                        <div class="min-w-0">
                          <p class="font-semibold text-highlighted">
                            {{ row.customer }}
                          </p>
                          <p class="mt-0.5 font-mono text-xs text-muted">
                            {{ displayOrderNo(row) }}
                            <span class="text-dimmed"> · </span>
                            {{ row.id }}
                            <template v-if="showOrg && row.orgId">
                              <span class="text-dimmed"> · </span>
                              {{ orgLabel(row.orgId) }}
                            </template>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <StatusBadge
                        :label="$t(`status.${row.status}`)"
                        :color="SHIP_STATUS_COLOR[row.status]"
                      />
                    </td>
                    <td class="font-mono text-sm">
                      {{ row.tracking ?? $t('status.na') }}
                    </td>
                    <td class="whitespace-nowrap text-sm text-muted">
                      {{ updatedOf(row) }}
                    </td>
                    <td class="max-w-52 truncate text-sm text-muted">
                      {{ summaryOf(row) }}
                    </td>
                    <td
                      class="text-end"
                      @click.stop
                    >
                      <div class="flex flex-wrap items-center justify-end gap-2">
                        <UButton
                          size="sm"
                          variant="soft"
                          @click="openRow(row)"
                        >
                          {{ $t('shipping.open') }}
                        </UButton>
                        <UButton
                          size="sm"
                          color="neutral"
                          variant="soft"
                          :disabled="!mockWritable || !nextStatus(row)"
                          @click="advance(row)"
                        >
                          {{ $t('shipping.advance') }}
                        </UButton>
                      </div>
                    </td>
                  </tr>
                  <tr
                    v-if="isOpen(row.id)"
                    class="border-b border-default bg-muted/20"
                  >
                    <td
                      colspan="6"
                      class="px-4 py-5"
                    >
                      <div class="overflow-x-auto pb-2">
                        <UTimeline
                          :model-value="row.status"
                          orientation="horizontal"
                          size="md"
                          :items="timelineItems(row)"
                          class="min-w-[40rem]"
                        />
                      </div>
                      <p class="mt-4 text-sm text-muted">
                        <span class="font-medium text-default">{{ $t('col.items') }}：</span>
                        {{ itemsLine(row) || $t('status.na') }}
                      </p>
                      <div class="mt-4 flex flex-wrap items-center gap-2">
                        <UButton
                          v-if="nextStatus(row) && mockWritable"
                          :disabled="!mockWritable"
                          @click="advance(row)"
                        >
                          {{ $t('shipping.advanceTo', { status: $t(`status.${nextStatus(row)}`) }) }}
                        </UButton>
                        <UButton
                          v-if="mockWritable"
                          color="neutral"
                          variant="soft"
                          @click="selectRow(row)"
                        >
                          {{ $t('actions.edit') }}
                        </UButton>
                        <UButton
                          v-if="mockWritable"
                          color="error"
                          variant="outline"
                          :disabled="!mockWritable"
                          @click="deleteId = row.id"
                        >
                          {{ $t('actions.delete') }}
                        </UButton>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside
        v-if="detailOpen"
        class="min-w-0 overflow-hidden rounded-xl border border-default bg-elevated lg:sticky lg:top-4"
      >
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('shipping.add') : (usingApi ? $t('shipping.open') : $t('shipping.edit'))"
          :subtitle="selected ? `${displayOrderNo(selected)} · ${selected.customer}` : $t('form.shipTitle')"
          :empty="$t('form.emptyDetail')"
          icon="i-lucide-truck"
          @close="closeDetail"
        >
          <UForm
            v-if="mockWritable"
            id="ship-form"
            :schema="shipmentSchema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              name="caseId"
              :label="$t('shipping.fieldOrder')"
            >
              <USelect
                v-model="state.caseId"
                :items="caseOptions"
                value-key="value"
                :disabled="Boolean(selectedId)"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="status"
              :label="$t('col.status')"
            >
              <USelect
                v-model="state.status"
                :items="shipStatusOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              name="tracking"
              :label="$t('col.tracking')"
            >
              <UInput
                v-model="state.tracking"
                :placeholder="$t('shipping.trackingPlaceholder')"
                class="w-full"
              />
            </UFormField>
            <p class="text-xs text-muted">
              {{ $t('shipping.mockNote') }}
            </p>
          </UForm>
          <div
            v-else-if="selected"
            class="space-y-3 text-sm"
          >
            <p>
              <span class="text-muted">{{ $t('shipping.fieldOrder') }}：</span>
              <span class="font-mono">{{ displayOrderNo(selected) }}</span>
            </p>
            <p>
              <span class="text-muted">{{ $t('col.status') }}：</span>
              {{ $t(`status.${selected.status}`) }}
            </p>
            <p>
              <span class="text-muted">{{ $t('col.tracking') }}：</span>
              <span class="font-mono">{{ selected.tracking ?? $t('status.na') }}</span>
            </p>
            <p class="text-xs text-muted">
              {{ $t('shipping.apiReadOnlyNote') }}
            </p>
          </div>
          <template #footer>
            <UButton
              color="neutral"
              variant="ghost"
              @click="closeDetail"
            >
              {{ $t('actions.cancel') }}
            </UButton>
            <UButton
              v-if="mockWritable"
              type="submit"
              form="ship-form"
              :disabled="!mockWritable"
            >
              {{ $t('actions.save') }}
            </UButton>
          </template>
        </DetailPanel>
      </aside>
    </div>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
