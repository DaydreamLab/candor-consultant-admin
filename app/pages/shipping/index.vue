<script setup lang="ts">
import { SHIP_STATUS_COLOR } from '~/utils/labels'
import { shipmentSchema } from '~/utils/schemas'
import type { ShipmentForm } from '~/utils/schemas'
import type { ShipmentRow } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { shipStatusOptions } = useSelectOptions()

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<ShipmentForm>>({})

const rows = computed(() => scoped(ops.shipments))

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

function itemsText(row: ShipmentRow) {
  return row.items.map(item => `${itemLabel(item.sku)} ×${item.qty}`).join('、')
}

function openCreate() {
  editingId.value = null
  Object.assign(state, {
    caseId: caseOptions.value[0]?.value ?? '',
    status: 'picking',
    tracking: ''
  })
  drawerOpen.value = true
}

function openEdit(row: ShipmentRow) {
  editingId.value = row.id
  Object.assign(state, {
    caseId: row.caseId,
    status: row.status,
    tracking: row.tracking ?? ''
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<ShipmentForm>) {
  const data = event.data
  ops.saveShipment({
    id: editingId.value ?? undefined,
    caseId: data.caseId,
    status: data.status,
    tracking: data.tracking || null,
    shippedAt: null
  })
  drawerOpen.value = false
  feedback.saved(data.caseId)
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeShipment(deleteId.value)
  feedback.deleted(deleteId.value)
  deleteId.value = null
}
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

    <AdminTable :empty="!rows.length">
      <template #head>
        <tr>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.case') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.customer') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.items') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.tracking') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.shippedAt') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.status') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.actions') }}
          </th>
        </tr>
      </template>
      <tr
        v-for="row in rows"
        :key="row.id"
        class="border-b border-default last:border-0"
      >
        <td class="px-4 py-3 font-medium text-highlighted">
          <div>{{ row.caseId }}</div>
          <div class="text-xs text-dimmed">
            {{ row.id }}
          </div>
        </td>
        <td class="px-4 py-3">
          {{ row.customer }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ itemsText(row) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.tracking ?? $t('status.na') }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.shippedAt ?? $t('status.na') }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="SHIP_STATUS_COLOR[row.status]"
          />
        </td>
        <td class="px-4 py-3">
          <RowActions
            :disabled="!writable"
            @edit="openEdit(row)"
            @remove="deleteId = row.id"
          />
        </td>
      </tr>
    </AdminTable>

    <USlideover
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('actions.add')"
      :description="$t('form.shipTitle')"
    >
      <template #body>
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
              :disabled="Boolean(editingId)"
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
      </template>
      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="outline"
          @click="close"
        >
          {{ $t('actions.cancel') }}
        </UButton>
        <UButton
          type="submit"
          form="ship-form"
        >
          {{ $t('actions.save') }}
        </UButton>
      </template>
    </USlideover>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
