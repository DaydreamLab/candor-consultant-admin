<script setup lang="ts">
import { INVOICE_STATUS_COLOR } from '~/utils/labels'
import { invoiceSchema } from '~/utils/schemas'
import type { InvoiceForm } from '~/utils/schemas'
import type { InvoiceRow } from '~/types/admin'
import type { FormSubmitEvent } from '@nuxt/ui'
import { serviceFeeForPlan } from '~/utils/demo'

const { moduleDesc } = usePageCopy()
const { scoped, orgLabel, showOrg, writable, orgOptions } = useOrgScope()
const ops = useOpsStore()
const feedback = useOpsFeedback()
const { invoiceStatusOptions } = useSelectOptions()

const drawerOpen = ref(false)
const editingId = ref<string | null>(null)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<InvoiceForm>>({})

const rows = computed(() => scoped(ops.invoices))

function openCreate() {
  editingId.value = null
  const due = scoped(ops.cases).filter(row => row.status === 'invoice_due')
  const orgId = due[0]?.orgId ?? ops.defaultOrgId()
  const serviceFee = due.reduce((sum, row) => sum + serviceFeeForPlan(row.planId), 0)
  Object.assign(state, {
    orgId,
    caseIdsText: due.filter(row => row.orgId === orgId).map(row => row.id).join(', '),
    serviceFee,
    goodsAmount: 0,
    status: 'draft'
  })
  drawerOpen.value = true
}

function openEdit(row: InvoiceRow) {
  editingId.value = row.id
  Object.assign(state, {
    orgId: row.orgId,
    caseIdsText: row.caseIds.join(', '),
    serviceFee: row.serviceFee,
    goodsAmount: row.goodsAmount,
    status: row.status
  })
  drawerOpen.value = true
}

function onSubmit(event: FormSubmitEvent<InvoiceForm>) {
  const data = event.data
  const caseIds = data.caseIdsText.split(/[,\s]+/).filter(Boolean)
  ops.saveInvoice({
    id: editingId.value ?? undefined,
    orgId: data.orgId,
    caseIds,
    serviceFee: data.serviceFee,
    goodsAmount: data.goodsAmount,
    status: data.status
  })
  drawerOpen.value = false
  feedback.saved(editingId.value ?? caseIds[0])
}

function confirmDelete() {
  if (!deleteId.value) {
    return
  }
  ops.removeInvoice(deleteId.value)
  feedback.deleted(deleteId.value)
  deleteId.value = null
}
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

    <USlideover
      v-model:open="drawerOpen"
      :title="editingId ? $t('actions.edit') : $t('actions.add')"
      :description="$t('form.invoiceTitle')"
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
            name="caseIdsText"
            :label="$t('form.caseIds')"
          >
            <UInput
              v-model="state.caseIdsText"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="serviceFee"
            :label="$t('col.service')"
          >
            <UInput
              v-model="state.serviceFee"
              type="number"
              class="w-full"
            />
          </UFormField>
          <UFormField
            name="goodsAmount"
            :label="$t('col.goods')"
          >
            <UInput
              v-model="state.goodsAmount"
              type="number"
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
    </USlideover>

    <ConfirmDelete
      :open="Boolean(deleteId)"
      @update:open="(open) => { if (!open) deleteId = null }"
      @confirm="confirmDelete"
    />
  </PageHeader>
</template>
