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

const selectedId = ref<string | null>(null)
const creating = ref(false)
const deleteId = ref<string | null>(null)
const state = reactive<Partial<InvoiceForm>>({
  caseIds: []
})

const rows = computed(() => scoped(ops.invoices))
const selected = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)
const detailOpen = computed(() => creating.value || Boolean(selected.value))

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
  const locked = new Set(selectedId.value
    ? (ops.invoices.find(row => row.id === selectedId.value)?.caseIds ?? [])
    : [])
  return scoped(ops.cases).filter(row =>
    row.orgId === orgId && (row.status === 'invoice_due' || locked.has(row.id))
  )
})

function isSelected(id: string) {
  return (state.caseIds ?? []).includes(id)
}

function toggleCase(id: string, checked: boolean | 'indeterminate') {
  const selectedCases = new Set(state.caseIds ?? [])
  if (checked) {
    selectedCases.add(id)
  } else {
    selectedCases.delete(id)
  }
  state.caseIds = [...selectedCases]
  recalc()
}

function fillCreate() {
  const orgId = ops.defaultOrgId()
  const due = scoped(ops.cases).filter(row => row.status === 'invoice_due' && row.orgId === orgId)
  Object.assign(state, {
    orgId,
    caseIds: due.map(row => row.id),
    status: 'draft'
  })
  recalc()
}

function fillEdit(row: InvoiceRow) {
  Object.assign(state, {
    orgId: row.orgId,
    caseIds: [...row.caseIds],
    serviceFee: row.serviceFee,
    goodsAmount: row.goodsAmount,
    status: row.status
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

function selectRow(row: InvoiceRow) {
  creating.value = false
  selectedId.value = row.id
  fillEdit(row)
}

function closeDetail() {
  creating.value = false
  selectedId.value = null
}

function onSubmit(event: FormSubmitEvent<InvoiceForm>) {
  const data = event.data
  const saved = ops.saveInvoice({
    id: selectedId.value ?? undefined,
    orgId: data.orgId,
    caseIds: data.caseIds,
    serviceFee: data.serviceFee,
    goodsAmount: data.goodsAmount,
    status: data.status
  })
  feedback.saved(selectedId.value ?? data.caseIds[0])
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
  ops.removeInvoice(deleteId.value)
  feedback.deleted(deleteId.value)
  if (selectedId.value === deleteId.value) {
    closeDetail()
  }
  deleteId.value = null
}

watch(() => state.orgId, (orgId, previous) => {
  if (!detailOpen.value || orgId === previous) {
    return
  }
  const allowed = new Set(eligibleCases.value.map(row => row.id))
  state.caseIds = (state.caseIds ?? []).filter(id => allowed.has(id))
  recalc()
})

watch(rows, (list) => {
  if (selectedId.value && !list.some(row => row.id === selectedId.value)) {
    selectedId.value = null
  }
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

    <SplitDetail>
      <AdminTable
        compact
        :empty="!rows.length"
      >
        <template #head>
          <tr>
            <th>{{ $t('col.invoice') }}</th>
            <th
              v-if="showOrg"
            >
              {{ $t('col.org') }}
            </th>
            <th>{{ $t('col.case') }}</th>
            <th>{{ $t('col.service') }}</th>
            <th>{{ $t('col.goods') }}</th>
            <th>{{ $t('col.total') }}</th>
            <th>{{ $t('col.issued') }}</th>
            <th>{{ $t('col.status') }}</th>
          </tr>
        </template>
        <tr
          v-for="row in rows"
          :key="row.id"
          class="cursor-pointer border-b border-default last:border-0 hover:bg-muted/40"
          :class="row.id === selectedId ? 'bg-primary/5' : ''"
          @click="selectRow(row)"
        >
          <td class="font-medium text-highlighted">
            {{ row.id }}
          </td>
          <td
            v-if="showOrg"
            class="text-muted"
          >
            {{ orgLabel(row.orgId) }}
          </td>
          <td>
            {{ row.caseIds.join('、') }}
          </td>
          <td class="tabular-money">
            {{ money(row.serviceFee) }}
          </td>
          <td class="tabular-money">
            {{ money(row.goodsAmount) }}
          </td>
          <td class="tabular-money font-semibold">
            {{ money(row.serviceFee + row.goodsAmount) }}
          </td>
          <td class="text-muted">
            {{ row.issuedAt }}
          </td>
          <td>
            <StatusBadge
              :label="$t(`status.${row.status}`)"
              :color="INVOICE_STATUS_COLOR[row.status]"
            />
          </td>
        </tr>
      </AdminTable>

      <template #detail>
        <DetailPanel
          :open="detailOpen"
          :title="creating ? $t('actions.add') : selected?.id"
          :subtitle="$t('form.invoiceTitle')"
          :empty="$t('form.emptyDetail')"
          icon="i-lucide-receipt"
          @close="closeDetail"
        >
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
                  class="flex cursor-pointer items-start gap-2 text-base"
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
                class="text-base text-muted"
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
              form="invoice-form"
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
