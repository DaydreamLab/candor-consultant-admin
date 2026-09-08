<script setup lang="ts">
import { INVOICE_STATUS_COLOR } from '~/utils/labels'
import { invoiceSchema } from '~/utils/schemas'
import type { InvoiceForm } from '~/utils/schemas'
import type { InvoiceRow } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'
import { serviceFeeForPlan } from '~/utils/demo'

const { locale } = useI18n()
const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { invoiceStatusOptions } = useSelectOptions()

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<InvoiceForm>>({
  caseIds: []
})

const rows = computed(() => scoped(ops.invoices))

function goodsForCases(caseIds: string[]) {
  return caseIds.reduce((sum, caseId) => {
    const shipped = ops.shipments
      .filter(row => row.caseId === caseId)
      .flatMap(row => row.items)
    const fromShip = shipped.reduce((total, item) => {
      return total + (ops.productOf(item.sku)?.cost ?? 0) * item.qty
    }, 0)
    if (fromShip) {
      return sum + fromShip
    }
    return sum + ops.keyIn
      .filter(row => row.caseId === caseId)
      .reduce((total, line) => total + (ops.productOf(line.sku)?.cost ?? 0) * line.qty, 0)
  }, 0)
}

function recalc() {
  const ids = state.caseIds ?? []
  const cases = ids
    .map(id => ops.cases.find(row => row.id === id))
    .filter(Boolean)
  state.serviceFee = cases.reduce((sum, row) => sum + serviceFeeForPlan(row!.planId), 0)
  state.goodsAmount = goodsForCases(ids)
}

const eligibleCases = computed(() => {
  const orgId = state.orgId ?? ops.defaultOrgId()
  const locked = new Set(editingId.value
    ? (ops.invoices.find(row => row.id === editingId.value)?.caseIds ?? [])
    : [])
  return scoped(ops.cases).filter(row =>
    row.orgId === orgId && (row.status === 'invoice_due' || locked.has(row.id))
  )
})

function isSelected(id: string) {
  return (state.caseIds ?? []).includes(id)
}

function toggleCase(id: string, checked: boolean | 'indeterminate') {
  const selected = new Set(state.caseIds ?? [])
  if (checked) {
    selected.add(id)
  } else {
    selected.delete(id)
  }
  state.caseIds = [...selected]
  recalc()
}

function openCreate() {
  editingId.value = null
  const orgId = ops.defaultOrgId()
  const due = scoped(ops.cases).filter(row => row.status === 'invoice_due' && row.orgId === orgId)
  Object.assign(state, {
    orgId,
    caseIds: due.map(row => row.id),
    status: 'draft'
  })
  recalc()
  drawerOpen.value = true
}

function openEdit(row: InvoiceRow) {
  editingId.value = row.id
  Object.assign(state, {
    orgId: row.orgId,
    caseIds: [...row.caseIds],
    serviceFee: row.serviceFee,
    goodsAmount: row.goodsAmount,
    status: row.status
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<InvoiceForm>) {
  const data = event.data
  ops.saveInvoice({
    id: editingId.value ?? undefined,
    orgId: data.orgId,
    caseIds: data.caseIds,
    serviceFee: data.serviceFee,
    goodsAmount: data.goodsAmount,
    status: data.status
  })
  drawerOpen.value = false
  feedback.saved(editingId.value ?? data.caseIds[0])
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeInvoice(deleteId.value)
  feedback.deleted(deleteId.value)
  deleteId.value = null
}

watch(() => state.orgId, (orgId, previous) => {
  if (!drawerOpen.value || orgId === previous) {
    return
  }
  const allowed = new Set(eligibleCases.value.map(row => row.id))
  state.caseIds = (state.caseIds ?? []).filter(id => allowed.has(id))
  recalc()
})
</script>

<template>
  <PageHeader
    :title="$t('nav.invoices')"
    :description="moduleDesc('invoices')"
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
            {{ $t('col.invoice') }}
          </th>
          <th
            v-if="showOrg"
            class="px-4 py-3 font-medium"
          >
            {{ $t('col.org') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.case') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.service') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.goods') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.total') }}
          </th>
          <th class="px-4 py-3 font-medium">
            {{ $t('col.issued') }}
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
          {{ row.id }}
        </td>
        <td
          v-if="showOrg"
          class="px-4 py-3 text-muted"
        >
          {{ orgLabel(row.orgId) }}
        </td>
        <td class="px-4 py-3">
          {{ row.caseIds.join('、') }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.serviceFee) }}
        </td>
        <td class="px-4 py-3">
          {{ money(row.goodsAmount) }}
        </td>
        <td class="px-4 py-3 font-medium">
          {{ money(row.serviceFee + row.goodsAmount) }}
        </td>
        <td class="px-4 py-3 text-muted">
          {{ row.issuedAt }}
        </td>
        <td class="px-4 py-3">
          <StatusBadge
            :label="$t(`status.${row.status}`)"
            :color="INVOICE_STATUS_COLOR[row.status]"
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

    <UModal
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('actions.add')"
      :description="$t('form.invoiceTitle')"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <UForm
          id="invoice-form"
          :schema="invoiceSchema"
          :state="state"
          class="space-y-4"
          @submit="onSubmit"
        >
          <UFormField
            v-if="showOrg"
            name="orgId"
            :label="$t('form.orgRequired')"
          >
            <USelect
              v-model="state.orgId"
              :items="orgOptions()"
              value-key="value"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="caseIds"
            :label="$t('form.pickCases')"
          >
            <div
              v-if="eligibleCases.length"
              class="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-default p-3"
            >
              <label
                v-for="row in eligibleCases"
                :key="row.id"
                class="flex cursor-pointer items-start gap-2 text-sm"
              >
                <UCheckbox
                  :model-value="isSelected(row.id)"
                  @update:model-value="toggleCase(row.id, $event)"
                />
                <span>
                  <span class="font-medium text-highlighted">{{ row.id }}</span>
                  <span class="text-muted">
                    · {{ locale === 'en' ? row.customerEn : row.customer }} · {{ $t(`plan.${row.planId}`) }}
                  </span>
                </span>
              </label>
            </div>
            <p
              v-else
              class="text-sm text-muted"
            >
              {{ $t('form.noDueCases') }}
            </p>
          </UFormField>
          <UFormField
            name="serviceFee"
            :label="$t('col.service')"
          >
            <UInput
              :model-value="state.serviceFee"
              type="number"
              disabled
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="goodsAmount"
            :label="$t('col.goods')"
          >
            <UInput
              :model-value="state.goodsAmount"
              type="number"
              disabled
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="status"
            :label="$t('col.status')"
          >
            <USelect
              v-model="state.status"
              :items="invoiceStatusOptions"
              value-key="value"
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
          form="invoice-form"
        >
          {{ $t('actions.save') }}
        </UButton>
      </template>
    </UModal>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
