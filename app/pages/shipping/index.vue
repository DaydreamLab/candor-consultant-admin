<script setup lang="ts">
import type { TimelineItem } from '@nuxt/ui'
import { SHIP_STATUS_COLOR } from '~/utils/labels'
import { shipmentSchema } from '~/utils/schemas'
import type { ShipmentForm } from '~/utils/schemas'
import type { ShipmentRow, ShipStatus } from '~/types/admin'
import { SHIP_FLOW } from '~/utils/demo'
import type { FormSubmitEvent } from '@nuxt/ui'

const { locale, t } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { shipStatusOptions } = useSelectOptions()

const selectedId = ref<string | null>(null)
const creating = ref(false)
const openIds = ref<string[]>([])
const deleteId = ref<string | null>(null)
const state = reactive<Partial<ShipmentForm>>({})

const rows = computed(() => scoped(ops.shipments))
const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)
const detailOpen = computed(() => creating.value || Boolean(selected.value))

const caseOptions = computed(() => {
  const shipped = new Set(ops.shipments.map(row => row.caseId))
  return scoped(ops.cases)
    .filter(row => row.planId === 'premium' && (row.status === 'ship_due' || row.status === 'keyin_due' || shipped.has(row.id)))
    .map(row => ({
      label: `${row.id} · ${locale.value === 'en' ? row.customerEn : row.customer}`,
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

function timelineValue(row: ShipmentRow) {
  return row.status
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
  if (!writable.value) {
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

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<ShipmentForm>) {
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
  if (!deleteId.value) {
    return
  }
  ops.removeShipment(deleteId.value)
  feedback.deleted(deleteId.value)
  if (selectedId.value === deleteId.value) {
    closeDetail()
  }
  deleteId.value = null
}

function advance(row: ShipmentRow) {
  const index = SHIP_FLOW.indexOf(row.status)
  const next = SHIP_FLOW[index + 1] as ShipStatus | undefined
  if (!next) {
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

watch(rows, (list) => {
  if (selectedId.value && !list.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
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
        :disabled="!writable"
        @click="openCreate"
      >
        {{ $t('actions.add') }}
      </UButton>
    </template>

    <p class="mb-4 rounded-lg bg-muted px-4 py-3 text-base text-muted">
      {{ $t('shipping.expandHint') }}
    </p>

    <SplitDetail>
      <div class="space-y-3">
        <div
          v-if="!rows.length"
          class="rounded-xl border border-default bg-elevated p-8 text-center text-base text-muted"
        >
          {{ $t('table.empty') }}
        </div>

        <section
          v-for="row in rows"
          :key="row.id"
          class="overflow-hidden rounded-xl border border-default bg-elevated"
          :class="row.id === selectedId ? 'ring-1 ring-primary/40' : ''"
        >
          <button
            type="button"
            class="flex w-full flex-wrap items-center gap-4 px-4 py-4 text-left hover:bg-muted/30"
            @click="toggle(row.id); selectRow(row)"
          >
            <UIcon
              :name="isOpen(row.id) ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-5 text-muted"
            />
            <div class="min-w-40 flex-1">
              <p class="text-base font-semibold text-highlighted">
                {{ row.caseId }} · {{ row.customer }}
              </p>
              <p class="mt-1 text-sm text-muted">
                <span v-if="showOrg">{{ orgLabel(row.orgId) }} · </span>{{ row.id }}
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <ProductThumb
                v-for="item in row.items"
                :key="`${row.id}-${item.sku}`"
                :seed="item.sku"
                :label="itemLabel(item.sku)"
                size="sm"
              />
            </div>
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="SHIP_STATUS_COLOR[row.status]"
            />
          </button>

          <div
            v-if="isOpen(row.id)"
            class="border-t border-default px-4 py-5"
          >
            <div class="mb-4 flex flex-wrap gap-2">
              <span
                v-for="item in row.items"
                :key="`${row.id}-chip-${item.sku}`"
                class="inline-flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm"
              >
                <ProductThumb
                  :seed="item.sku"
                  :label="itemLabel(item.sku)"
                  size="sm"
                />
                {{ itemLabel(item.sku) }} ×{{ item.qty }}
              </span>
            </div>
            <div class="overflow-x-auto pb-2">
              <UTimeline
                :model-value="timelineValue(row)"
                orientation="horizontal"
                size="md"
                :items="timelineItems(row)"
                class="min-w-[40rem]"
              />
            </div>
            <div class="mt-5 flex flex-wrap items-center gap-2">
              <p class="mr-auto text-sm text-muted">
                {{ row.tracking ?? $t('status.na') }}
              </p>
              <UButton
                color="neutral"
                variant="outline"
                :disabled="!writable || row.status === 'delivered'"
                @click="advance(row)"
              >
                {{ $t('col.next') }}
              </UButton>
              <UButton
                color="error"
                variant="ghost"
                :disabled="!writable"
                @click="deleteId = row.id"
              >
                {{ $t('actions.delete') }}
              </UButton>
            </div>
          </div>
        </section>
      </div>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('actions.add') : selected?.caseId"
          :subtitle="selected?.customer ?? $t('form.shipTitle')"
          :empty="$t('form.emptyDetail')"
          icon="i-lucide-truck"
          @close="closeDetail"
        >
          <UForm
            id="ship-form"
            :schema="shipmentSchema"
            :state="state"
            class="space-y-4"
            @submit="onSubmit"
          >
            <UFormField
              name="caseId"
              :label="$t('col.case')"
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
                class="w-full"
              />
            </UFormField>
          </UForm>
          <template #footer>
            <UButton
              v-if="selected"
              color="error"
              variant="ghost"
              :disabled="!writable"
              @click="deleteId = selected.id"
            >
              {{ $t('actions.delete') }}
            </UButton>
            <UButton
              type="submit"
              form="ship-form"
              :disabled="!writable"
            >
              {{ $t('actions.save') }}
            </UButton>
          </template>
        </DetailPanel>
      </template>
    </SplitDetail>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
